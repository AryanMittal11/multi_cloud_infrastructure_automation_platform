import { Router } from 'express';
import { templateController } from '../controllers/template.controller';
import { authenticateToken, requireViewer, requireAdmin } from '../middleware';

export const templateRouter = Router();

// Require valid authentication across all catalog routes
templateRouter.use(authenticateToken);

// Catalog listing and inspection
templateRouter.get('/', requireViewer, templateController.list);
templateRouter.get('/:id', requireViewer, templateController.getById);

// Dynamic parameter validation
templateRouter.post('/:id/validate', requireViewer, templateController.validate);

// Administrative catalog sync from disk
templateRouter.post('/sync', requireAdmin, templateController.sync);
