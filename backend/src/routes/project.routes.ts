import { Router } from 'express';
import { z } from 'zod';
import { projectController } from '../controllers/project.controller';
import {
  authenticateToken,
  requireDeveloper,
  requireViewer,
  requireAdmin,
  requireDestructivePermission,
  validateBody,
} from '../middleware';

export const projectRouter = Router();

const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().optional(),
  createDefaultEnvironments: z.boolean().optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
});

const createEnvironmentSchema = z.object({
  name: z.string().min(2, 'Environment name must be at least 2 characters'),
  cloudAccountId: z.string().uuid().optional(),
});

// Protect all project routes with JWT authentication
projectRouter.use(authenticateToken);

projectRouter.post('/', requireDeveloper, validateBody(createProjectSchema), projectController.create);
projectRouter.get('/', requireViewer, projectController.list);
projectRouter.get('/:id', requireViewer, projectController.getById);
projectRouter.put('/:id', requireDeveloper, validateBody(updateProjectSchema), projectController.update);

projectRouter.delete(
  '/:id',
  requireAdmin,
  requireDestructivePermission({ expectedKeyword: 'CONFIRM_DELETE_PROJECT' }),
  projectController.delete,
);

// Environment routes scoped to project
projectRouter.post(
  '/:id/environments',
  requireDeveloper,
  validateBody(createEnvironmentSchema),
  projectController.createEnvironment,
);

projectRouter.patch(
  '/:id/environments/:envId/account',
  requireDeveloper,
  projectController.bindCloudAccount,
);
