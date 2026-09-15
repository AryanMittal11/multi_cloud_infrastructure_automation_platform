import { Router } from 'express';
import { deploymentLockController } from '../controllers/deployment.lock.controller';
import {
  authenticateToken,
  requireDeveloper,
  requireAdmin,
  requireDestructivePermission,
} from '../middleware';

export const deploymentLockRouter = Router();

deploymentLockRouter.use(authenticateToken);

// Inspect lock status on environment
deploymentLockRouter.get('/:environmentId', requireDeveloper, deploymentLockController.getStatus);

// Emergency admin override to break hanging lock
deploymentLockRouter.post(
  '/:environmentId/force-release',
  requireAdmin,
  requireDestructivePermission({ expectedKeyword: 'FORCE_UNLOCK' }),
  deploymentLockController.forceRelease,
);
