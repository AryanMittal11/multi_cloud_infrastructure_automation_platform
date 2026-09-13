import { DeploymentLockManager } from './deployment.lock';
import { prisma } from '../../config/prisma';
import { DeploymentStatus } from '@prisma/client';

// Mock Prisma
jest.mock('../../config/prisma', () => ({
  prisma: {
    deployment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

describe('DeploymentLockManager Subsystem', () => {
  let lockManager: DeploymentLockManager;

  beforeEach(() => {
    lockManager = new DeploymentLockManager();
    jest.clearAllMocks();
  });

  describe('Lock Acquisition & Concurrency Enforcement', () => {
    it('should acquire lock when no conflicting deployment is active', async () => {
      (prisma.deployment.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.deployment.update as jest.Mock).mockResolvedValue({});

      const lock = await lockManager.acquireLock('proj-1', 'env-dev', 'dep-1');

      expect(lock).toContain('lock-dep-1');
      expect(prisma.deployment.update).toHaveBeenCalledWith({
        where: { id: 'dep-1' },
        data: { executionReference: lock },
      });
    });

    it('should throw 409 Conflict when environment has an active non-stale deployment', async () => {
      (prisma.deployment.findFirst as jest.Mock).mockResolvedValue({
        id: 'dep-running',
        status: DeploymentStatus.RUNNING,
        operationType: 'CREATE',
        updatedAt: new Date(), // Just updated (fresh lock)
      });

      await expect(lockManager.acquireLock('proj-1', 'env-dev', 'dep-new')).rejects.toThrow(
        'Environment is currently locked by active deployment "dep-running"',
      );

      expect(prisma.deployment.update).not.toHaveBeenCalled();
    });

    it('should automatically break and recover stale abandoned locks', async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      (prisma.deployment.findFirst as jest.Mock).mockResolvedValue({
        id: 'dep-abandoned',
        status: DeploymentStatus.RUNNING,
        updatedAt: oneHourAgo, // Stale!
        applyOutput: 'Some partial log output',
      });
      (prisma.deployment.update as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const lock = await lockManager.acquireLock('proj-1', 'env-dev', 'dep-new', {
        autoRecoverStaleAfterMs: 30 * 60 * 1000,
      });

      expect(lock).toContain('lock-dep-new');

      // Verify abandoned deployment was transitioned to FAILED
      expect(prisma.deployment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dep-abandoned' },
          data: expect.objectContaining({ status: DeploymentStatus.FAILED }),
        }),
      );

      // Verify audit record created
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'STALE_LOCK_AUTO_RECOVERED' }),
        }),
      );
    });
  });

  describe('Lock Status Inspection', () => {
    it('should report unlocked status when no deployments are active', async () => {
      (prisma.deployment.findFirst as jest.Mock).mockResolvedValue(null);

      const status = await lockManager.getLockStatus('env-clean');

      expect(status.isLocked).toBe(false);
      expect(status.activeDeployment).toBeUndefined();
    });

    it('should report locked status with active deployment details', async () => {
      (prisma.deployment.findFirst as jest.Mock).mockResolvedValue({
        id: 'dep-active-1',
        status: DeploymentStatus.RUNNING,
        operationType: 'CREATE',
        executionReference: 'lock-dep-active-1',
        updatedAt: new Date(Date.now() - 30 * 1000),
      });

      const status = await lockManager.getLockStatus('env-locked');

      expect(status.isLocked).toBe(true);
      expect(status.activeDeployment?.id).toBe('dep-active-1');
      expect(status.activeDeployment?.durationSeconds).toBeGreaterThanOrEqual(29);
    });
  });

  describe('Admin Emergency Force Release', () => {
    it('should force release active lock and mark deployment FAILED', async () => {
      (prisma.deployment.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'dep-hung',
          projectId: 'proj-1',
          environmentId: 'env-stuck',
          status: DeploymentStatus.RUNNING,
          applyOutput: 'Stuck worker process',
        },
      ]);
      (prisma.deployment.update as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const result = await lockManager.forceReleaseLock('env-stuck', 'usr-admin', 'Worker node crashed');

      expect(result.success).toBe(true);
      expect(result.unlockedDeploymentsCount).toBe(1);

      // Verify deployment was marked FAILED with explanation
      expect(prisma.deployment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dep-hung' },
          data: expect.objectContaining({ status: DeploymentStatus.FAILED }),
        }),
      );

      // Verify audit log entry
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'DEPLOYMENT_LOCK_FORCE_RELEASED',
            status: 'SUCCESS',
          }),
        }),
      );
    });
  });
});
