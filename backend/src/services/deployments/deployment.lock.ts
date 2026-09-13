import { prisma } from '../../config/prisma';
import { logger } from '../../utils/logger';
import { DeploymentStatus } from '@prisma/client';

export interface LockStatusResult {
  isLocked: boolean;
  environmentId: string;
  activeDeployment?: {
    id: string;
    status: DeploymentStatus;
    operationType: string;
    executionReference: string | null;
    updatedAt: Date;
    durationSeconds: number;
  };
  lockReference?: string | null;
}

export class DeploymentLockManager {
  // 30 minutes default threshold before a hanging deployment is considered stale
  private readonly DEFAULT_STALE_TIMEOUT_MS = 30 * 60 * 1000;

  /**
   * Acquires an exclusive deployment lock on a (projectId, environmentId) tuple.
   * Rejects concurrent executions with 409 Conflict.
   * Recovers automatically from stale/abandoned locks exceeding staleTimeoutMs.
   */
  async acquireLock(
    projectId: string,
    environmentId: string,
    deploymentId: string,
    options: { autoRecoverStaleAfterMs?: number } = {},
  ): Promise<string> {
    const staleTimeoutMs = options.autoRecoverStaleAfterMs || this.DEFAULT_STALE_TIMEOUT_MS;

    // 1. Find active deployment on target environment
    const activeDeployment = await prisma.deployment.findFirst({
      where: {
        projectId,
        environmentId,
        id: { not: deploymentId },
        status: { in: [DeploymentStatus.QUEUED, DeploymentStatus.RUNNING] },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (activeDeployment) {
      const lockAgeMs = Date.now() - new Date(activeDeployment.updatedAt).getTime();

      // Check if existing lock is stale (e.g. worker process crashed ungracefully)
      if (lockAgeMs > staleTimeoutMs) {
        logger.warn(
          `Detected abandoned lock on env [${environmentId}] held by deployment [${activeDeployment.id}] (${Math.round(lockAgeMs / 1000)}s old). Recovering lock.`,
        );

        // Mark abandoned deployment as FAILED
        await prisma.deployment.update({
          where: { id: activeDeployment.id },
          data: {
            status: DeploymentStatus.FAILED,
            applyOutput:
              (activeDeployment.applyOutput || '') +
              `\n[SYSTEM RECOVERY]: Operation lock was abandoned and timed out after ${Math.round(lockAgeMs / 1000)}s.`,
            executionReference: null,
          },
        });

        // Audit log the stale recovery
        await prisma.auditLog.create({
          data: {
            deploymentId: activeDeployment.id,
            projectId,
            action: 'STALE_LOCK_AUTO_RECOVERED',
            status: 'SUCCESS',
            message: `Stale deployment lock held by ${activeDeployment.id} was automatically broken and recovered.`,
          },
        });
      } else {
        const error: any = new Error(
          `Environment is currently locked by active deployment "${activeDeployment.id}" (Status: ${activeDeployment.status}, Operation: ${activeDeployment.operationType}). Only one operation may execute at a time.`,
        );
        error.statusCode = 409;
        throw error;
      }
    }

    const lockReference = `lock-${deploymentId}-${Date.now()}`;

    // 2. Set executionReference on the requesting deployment
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { executionReference: lockReference },
    });

    logger.info(`Acquired lock [${lockReference}] for deployment [${deploymentId}] on env [${environmentId}]`);
    return lockReference;
  }

  /**
   * Releases an active deployment lock.
   */
  async releaseLock(deploymentId: string): Promise<void> {
    try {
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { executionReference: null },
      });
      logger.info(`Released lock for deployment [${deploymentId}]`);
    } catch {
      // Ignored if deployment was already deleted
    }
  }

  /**
   * Inspects lock status for an environment.
   */
  async getLockStatus(environmentId: string): Promise<LockStatusResult> {
    const activeDeployment = await prisma.deployment.findFirst({
      where: {
        environmentId,
        status: { in: [DeploymentStatus.QUEUED, DeploymentStatus.RUNNING] },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!activeDeployment) {
      return {
        isLocked: false,
        environmentId,
      };
    }

    const durationSeconds = Math.round(
      (Date.now() - new Date(activeDeployment.updatedAt).getTime()) / 1000,
    );

    return {
      isLocked: true,
      environmentId,
      lockReference: activeDeployment.executionReference,
      activeDeployment: {
        id: activeDeployment.id,
        status: activeDeployment.status,
        operationType: activeDeployment.operationType,
        executionReference: activeDeployment.executionReference,
        updatedAt: activeDeployment.updatedAt,
        durationSeconds,
      },
    };
  }

  /**
   * Admin emergency intervention to force release an environment lock.
   */
  async forceReleaseLock(
    environmentId: string,
    adminUserId: string,
    reason: string,
  ): Promise<{ success: boolean; message: string; unlockedDeploymentsCount: number }> {
    const lockedDeployments = await prisma.deployment.findMany({
      where: {
        environmentId,
        status: { in: [DeploymentStatus.QUEUED, DeploymentStatus.RUNNING] },
      },
    });

    if (lockedDeployments.length === 0) {
      return {
        success: true,
        message: 'Environment is not locked. No active locks found.',
        unlockedDeploymentsCount: 0,
      };
    }

    for (const dep of lockedDeployments) {
      await prisma.deployment.update({
        where: { id: dep.id },
        data: {
          status: DeploymentStatus.FAILED,
          applyOutput:
            (dep.applyOutput || '') +
            `\n[ADMIN INTERVENTION]: Lock was force-released by administrator (${adminUserId}). Reason: ${reason}`,
          executionReference: null,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          projectId: dep.projectId,
          deploymentId: dep.id,
          action: 'DEPLOYMENT_LOCK_FORCE_RELEASED',
          status: 'SUCCESS',
          message: `Administrator force-released lock on environment "${environmentId}". Reason: ${reason}`,
          metadata: { reason, previousStatus: dep.status },
        },
      });
    }

    logger.warn(
      `Administrator [${adminUserId}] force-released locks on env [${environmentId}]. Reason: ${reason}`,
    );

    return {
      success: true,
      message: `Successfully released lock on environment "${environmentId}" and marked ${lockedDeployments.length} hanging deployment(s) as FAILED.`,
      unlockedDeploymentsCount: lockedDeployments.length,
    };
  }
}

export const deploymentLockManager = new DeploymentLockManager();
