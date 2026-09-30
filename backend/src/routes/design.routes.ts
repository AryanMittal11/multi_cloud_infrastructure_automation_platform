import { Router } from 'express';
import { z } from 'zod';
import { designController } from '../controllers/design.controller';
import { authenticateToken, requireDeveloper, validateBody } from '../middleware';

export const designRouter = Router();

const designNodeSchema = z.object({
  id: z.string(),
  kind: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.object({
    kind: z.string(),
    label: z.string(),
    provider: z.string(),
    templateRef: z.string(),
    config: z.record(z.any()).default({}),
    monthlyCost: z.number().optional(),
    notes: z.string().optional(),
  }),
});

const designEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
});

const createDesignSchema = z.object({
  name: z.string().min(1, 'Design name is required').max(120),
  description: z.string().max(2000).optional(),
  cloudProvider: z.enum(['AWS', 'AZURE', 'GCP', 'MULTI']).default('AWS'),
  nodes: z.array(designNodeSchema).default([]),
  edges: z.array(designEdgeSchema).default([]),
});

const updateDesignSchema = createDesignSchema.partial();

const deployDesignSchema = z.object({
  projectId: z.string().uuid('projectId must be a valid UUID'),
  environmentId: z.string().uuid('environmentId must be a valid UUID'),
  configuration: z.record(z.any()).optional().default({}),
  name: z.string().optional(),
  description: z.string().optional(),
  cloudProvider: z.enum(['AWS', 'AZURE', 'GCP', 'MULTI']).optional(),
  nodes: z.array(designNodeSchema).optional(),
  edges: z.array(designEdgeSchema).optional(),
});

designRouter.use(authenticateToken);

designRouter.get('/', requireDeveloper, designController.list);
designRouter.get('/:id', requireDeveloper, designController.getById);
designRouter.post('/', requireDeveloper, designController.create);
designRouter.put('/:id', requireDeveloper, designController.update);
// Ownership (owner-only) is enforced in DesignService.deleteDesign; any developer may remove their own design.
designRouter.delete('/:id', requireDeveloper, designController.delete);
// Deploy visual architecture design: generates Terraform template and dispatches plan
designRouter.post('/:id/deploy', requireDeveloper, validateBody(deployDesignSchema), designController.deploy);
