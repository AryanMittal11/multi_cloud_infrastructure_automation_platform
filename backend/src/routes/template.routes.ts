import { Router } from 'express';
import { templateController } from '../controllers/template.controller';
import { authenticateToken, requireDeveloper, requireAdmin } from '../middleware';

export const templateRouter = Router();

// Require valid authentication across all catalog routes
templateRouter.use(authenticateToken);

// Catalog listing and inspection
templateRouter.get('/', requireDeveloper, templateController.list);
templateRouter.get('/:id', requireDeveloper, templateController.getById);

// Dynamic parameter validation
templateRouter.post('/:id/validate', requireDeveloper, templateController.validate);

// Administrative catalog sync from disk
templateRouter.post('/sync', requireAdmin, templateController.sync);
