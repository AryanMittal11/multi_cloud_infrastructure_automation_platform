import { Router } from 'express';
import { visualizationController } from '../controllers/visualization.controller';
import { authenticateToken, requireDeveloper } from '../middleware';

export const visualizationRouter = Router();

visualizationRouter.use(authenticateToken);

visualizationRouter.get('/', requireDeveloper, visualizationController.topology);
