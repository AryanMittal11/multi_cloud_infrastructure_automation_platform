import { Router } from 'express';
import { z } from 'zod';
import { deploymentController } from '../controllers/deployment.controller';
import { authenticateToken, requireDeveloper, requireViewer, validateBody } from '../middleware';

export const deploymentRouter = Router();

const createPlanSchema = z.object({
  projectId: z.string().uuid('projectId must be a valid UUID'),
  environmentId: z.string().uuid('environmentId must be a valid UUID'),
  templateId: z.string().uuid('templateId must be a valid UUID'),
  operationType: z.enum(['CREATE', 'MODIFY', 'DESTROY']).optional(),
  configuration: z.record(z.any()),
});

const approveDeploymentSchema = z.object({
  confirmationKeyword: z.string().optional(),
  comment: z.string().optional(),
});

const cancelDeploymentSchema = z.object({
  reason: z.string().optional(),
});

// All deployment routes require authentication
deploymentRouter.use(authenticateToken);

// Initiate infrastructure planning
deploymentRouter.post(
  '/plan',
  requireDeveloper,
  validateBody(createPlanSchema),
  deploymentController.createPlan,
);

// List deployments (supports ?projectId, ?environmentId, ?status)
deploymentRouter.get('/', requireViewer, deploymentController.list);

// Explicit approval gate: Transitions PLANNED -> QUEUED and dispatches APPLY job
deploymentRouter.post(
  '/:id/approve',
  requireDeveloper,
  validateBody(approveDeploymentSchema),
  deploymentController.approve,
);

// Cancel a planned or draft deployment
deploymentRouter.post(
  '/:id/cancel',
  requireDeveloper,
  validateBody(cancelDeploymentSchema),
  deploymentController.cancel,
);

// Get single deployment by ID with plan output summary
deploymentRouter.get('/:id', requireViewer, deploymentController.getById);
