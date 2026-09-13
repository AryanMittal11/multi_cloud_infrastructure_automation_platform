import { Request, Response, NextFunction } from 'express';
import { deploymentLockManager } from '../services/deployments/deployment.lock';

export const deploymentLockController = {
  /**
   * GET /api/deployments/locks/:environmentId
   */
  getStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { environmentId } = req.params;
      const status = await deploymentLockManager.getLockStatus(environmentId);
      res.status(200).json({ lockStatus: status });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/deployments/locks/:environmentId/force-release
   */
  forceRelease: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { environmentId } = req.params;
      const adminUserId = req.user!.userId;
      const reason = req.body.reason || 'Manual administrative override';

      const result = await deploymentLockManager.forceReleaseLock(
        environmentId,
        adminUserId,
        reason,
      );

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
};
