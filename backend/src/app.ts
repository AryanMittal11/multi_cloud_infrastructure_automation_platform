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
import { userRouter } from './routes/user.routes';
import { costRouter } from './routes/cost.routes';
import { visualizationRouter } from './routes/visualization.routes';
import { aiRouter } from './routes/ai.routes';
import { terraformWorker } from './workers/terraform.worker';
import { queueService } from './services/queue';

export const app = express();

// CORS: comma-separated whitelist via CORS_ORIGIN; in development, any
// http(s)://localhost[:port] origin is accepted so the frontend can run on
// any dev port without re-configuring the control plane.
// const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
// app.use(
//   cors({
//     origin: (origin, callback) => {
//       if (!origin) return callback(null, true); // non-browser clients (curl, tests)
//       if (allowedOrigins.includes(origin)) return callback(null, true);
//       if (
//         env.NODE_ENV === 'development' &&
//         /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)
//       ) {
//         return callback(null, true);
//       }
//       return callback(null, false); // no CORS headers → browser blocks
//     },
//     credentials: true,
//   }),
// );

// CORS configuration
const allowedOrigins = env.CORS_ORIGIN
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients such as curl and health checks
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/$/, '');

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // Allow localhost origins only in development
      if (
        env.NODE_ENV === 'development' &&
        /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(
          normalizedOrigin,
        )
      ) {
        return callback(null, true);
      }

      console.warn(`CORS rejected origin: ${origin}`);
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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
app.use('/api/users', userRouter);
app.use('/api/costs', costRouter);
app.use('/api/topology', visualizationRouter);
app.use('/api/ai', aiRouter);

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

  // Start the Terraform worker inside the API process so jobs are consumed
  // immediately without requiring a separate worker terminal process.
  if (env.INLINE_WORKER_FALLBACK) {
    const ensureInlineWorker = async () => {
      try {
        await queueService.initialize();
        await terraformWorker.start();
        console.log('🔧 Terraform worker active and listening for deployment jobs.');
      } catch (err) {
        console.error('Terraform worker startup failed:', err);
      }
    };

    ensureInlineWorker().catch((err) =>
      console.error('Inline worker startup failed:', err),
    );
  }
}
