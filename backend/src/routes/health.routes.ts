import { Router, Request, Response } from 'express';
import { env } from '../config/env';

export const healthRouter = Router();

healthRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'multi-cloud-backend-control-plane',
    environment: env.NODE_ENV,
    version: '0.1.0',
    uptimeSeconds: process.uptime(),
  });
});
