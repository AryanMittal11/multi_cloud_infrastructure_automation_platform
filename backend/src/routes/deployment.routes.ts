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

const createDestroyPlanSchema = z.object({
  projectId: z.string().uuid().optional(),
  environmentId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  deploymentId: z.string().uuid().optional(),
  configuration: z.record(z.any()).optional(),
});

const confirmDestroySchema = z.object({
  confirmationKeyword: z.string().min(1, 'confirmationKeyword is required'),
  comment: z.string().optional(),
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

// Initiate safe destruction preview
deploymentRouter.post(
  '/destroy-plan',
  requireDeveloper,
  validateBody(createDestroyPlanSchema),
  deploymentController.createDestroyPlan,
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

// Initiate destruction plan for specific deployment
deploymentRouter.post(
  '/:id/destroy-plan',
  requireDeveloper,
  deploymentController.createDeploymentDestroyPlan,
);

// Explicit destruction confirmation gate
deploymentRouter.post(
  '/:id/confirm-destroy',
  requireDeveloper,
  validateBody(confirmDestroySchema),
  deploymentController.confirmDestroy,
);

// Get single deployment by ID with plan output summary
deploymentRouter.get('/:id', requireViewer, deploymentController.getById);

// Get provisioned infrastructure resources for a deployment
deploymentRouter.get('/:id/resources', requireViewer, deploymentController.getResources);

// Get execution logs and phase timings
deploymentRouter.get('/:id/logs', requireViewer, deploymentController.getLogs);
