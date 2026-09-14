import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';

import { healthRouter } from './routes/health.routes';
import { authRouter } from './routes/auth.routes';
import { projectRouter } from './routes/project.routes';
import { cloudRouter } from './routes/cloud.routes';
import { templateRouter } from './routes/template.routes';
import { deploymentLockRouter } from './routes/deployment.lock.routes';
import { deploymentRouter } from './routes/deployment.routes';
import { resourceRouter } from './routes/resource.routes';
import { auditRouter } from './routes/audit.routes';
import { designRouter } from './routes/design.routes';
import { costRouter } from './routes/cost.routes';
import { visualizationRouter } from './routes/visualization.routes';
import { terraformWorker } from './workers/terraform.worker';
import { queueService } from './services/queue';

export const app = express();

// CORS: comma-separated whitelist via CORS_ORIGIN; in development, any
// http(s)://localhost[:port] origin is accepted so the frontend can run on
// any dev port without re-configuring the control plane.
const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // non-browser clients (curl, tests)
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (
        env.NODE_ENV === 'development' &&
        /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, false); // no CORS headers → browser blocks
    },
    credentials: true,
  }),
);

// Security and utility middleware
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routes
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/projects', projectRouter);
app.use('/api/cloud-accounts', cloudRouter);
app.use('/api/templates', templateRouter);
app.use('/api/deployments/locks', deploymentLockRouter);
app.use('/api/deployments', deploymentRouter);
app.use('/api/resources', resourceRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/designs', designRouter);
app.use('/api/costs', costRouter);
app.use('/api/topology', visualizationRouter);

// Centralized error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  if (statusCode >= 500) {
    console.error('Unhandled application error:', err);
  }
  res.status(statusCode).json({
    error: err.name || 'Application Error',
    message: err.message || 'An unexpected error occurred',
  });
});

// Start server if run directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(env.PORT, () => {
    console.log(`🚀 Multi-Cloud Platform Control Plane running on http://localhost:${env.PORT}`);
  });

  // Single-node resilience: when no broker is reachable and inline fallback is
  // enabled, run the Terraform worker inside the API process so published jobs
  // (in-memory fallback queue) are actually consumed. With RabbitMQ connected,
  // the dedicated worker process owns execution, so we stay out of the way.
  if (env.INLINE_WORKER_FALLBACK) {
    // Idempotent: terraformWorker.start() is guarded by its own isRunning flag.
    let inlineWorkerAnnounced = false;
    const ensureInlineWorker = async () => {
      await queueService.initialize();
      const status = await queueService.getStatus();
      if (status.mode === 'in-memory-fallback') {
        await terraformWorker.start();
        if (!inlineWorkerAnnounced) {
          inlineWorkerAnnounced = true;
          console.log('🔧 Inline Terraform worker active (no broker detected).');
        }
      }
    };

    ensureInlineWorker().catch((err) =>
      console.error('Inline worker startup failed:', err),
    );
    // Re-check periodically so a broker outage later in life still gets covered.
    const brokerPoll = setInterval(() => {
      ensureInlineWorker().catch(() => {});
    }, 30_000);
    brokerPoll.unref();
  }
}
