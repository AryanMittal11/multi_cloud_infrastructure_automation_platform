import { Router } from 'express';
import { costController } from '../controllers/cost.controller';
import { authenticateToken, requireViewer } from '../middleware';

export const costRouter = Router();

// All cost routes require authentication (VIEWER may read estimates)
costRouter.use(authenticateToken);

// Pre-deployment estimate: template + configuration + provider + region
costRouter.post('/estimate', requireViewer, costController.estimate);

// Monthly rollup across active deployments, optionally per project
costRouter.get('/summary', requireViewer, costController.summary);
