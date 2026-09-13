import { Request, Response, NextFunction } from 'express';
import { deploymentService } from '../services/deployments';
import { DeploymentStatus } from '@prisma/client';

export const deploymentController = {
  /**
   * POST /api/deployments/plan
   * Submits infrastructure configuration to generate a plan preview asynchronously.
   */
  createPlan: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const deployment = await deploymentService.createPlan(userId, req.body);
      res.status(202).json({
        message: 'Plan generation initiated successfully',
        deployment,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/deployments/:id
   * Retrieves deployment details including parsed plan summary.
   */
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deployment = await deploymentService.getDeploymentById(req.params.id);
      res.status(200).json({ deployment });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/deployments
   * Lists deployments with optional filters.
   */
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId, environmentId, status } = req.query;
      const deployments = await deploymentService.listDeployments({
        projectId: typeof projectId === 'string' ? projectId : undefined,
        environmentId: typeof environmentId === 'string' ? environmentId : undefined,
        status: typeof status === 'string' ? (status as DeploymentStatus) : undefined,
      });
      res.status(200).json({ deployments });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/deployments/:id/approve
   * Explicit approval gate queueing an APPLY job for a PLANNED deployment.
   */
  approve: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const deployment = await deploymentService.approveDeployment(
        req.params.id,
        { userId: user.userId, role: user.role },
        req.body,
      );
      res.status(200).json({
        message: `Deployment "${deployment.id}" approved and queued for apply`,
        deployment,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/deployments/:id/cancel
   * Cancels a planned or draft deployment.
   */
  cancel: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const deployment = await deploymentService.cancelDeployment(
        req.params.id,
        { userId: user.userId, role: user.role },
        req.body,
      );
      res.status(200).json({
        message: `Deployment "${deployment.id}" cancelled successfully`,
        deployment,
      });
    } catch (err) {
      next(err);
    }
  },
};
