import { Router } from 'express';
import { visualizationController } from '../controllers/visualization.controller';
import { authenticateToken, requireViewer } from '../middleware';

export const visualizationRouter = Router();

visualizationRouter.use(authenticateToken);

visualizationRouter.get('/', requireViewer, visualizationController.topology);
