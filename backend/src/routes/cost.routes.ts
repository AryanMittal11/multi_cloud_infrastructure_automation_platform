import { Router } from 'express';
import { costController } from '../controllers/cost.controller';
import { authenticateToken, requireDeveloper } from '../middleware';

export const costRouter = Router();

// All cost routes require authentication
costRouter.use(authenticateToken);

// Pre-deployment estimate: template + configuration + provider + region
costRouter.post('/estimate', requireDeveloper, costController.estimate);

// Monthly rollup across active deployments, optionally per project
costRouter.get('/summary', requireDeveloper, costController.summary);
