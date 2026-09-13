import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';

import { healthRouter } from './routes/health.routes';
import { authRouter } from './routes/auth.routes';
import { projectRouter } from './routes/project.routes';
import { cloudRouter } from './routes/cloud.routes';
import { templateRouter } from './routes/template.routes';

export const app = express();

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routes
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/projects', projectRouter);
app.use('/api/cloud-accounts', cloudRouter);
app.use('/api/templates', templateRouter);

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
}
