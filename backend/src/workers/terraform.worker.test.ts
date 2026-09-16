import { TerraformWorkerService } from './terraform.worker';
import { prisma } from '../config/prisma';
import { queueService } from '../services/queue';
import { workspaceManager } from '../services/terraform/workspace.manager';
import { terraformRunner } from '../services/terraform/terraform.runner';
import { stateParser } from '../services/terraform/state.parser';
import { resourceService } from '../services/resources/resource.service';
import { deploymentLockManager } from '../services/deployments/deployment.lock';
import { DeploymentJobMessage } from '../services/queue/queue.types';
import { DeploymentStatus, OperationType, Provider } from '@prisma/client';

// Mock dependencies
jest.mock('../config/prisma', () => ({
  prisma: {
    deployment: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../services/queue', () => ({
  queueService: {
    publishEvent: jest.fn(),
    consumeJobs: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../services/cloud', () => ({
  cloudService: {
    getDecryptedCredentials: jest.fn().mockResolvedValue({
      accessKeyId: 'AKIA_MOCK',
      secretAccessKey: 'mockSecretKeyOver16Chars!',
      defaultRegion: 'us-east-1',
    }),
  },
}));

jest.mock('../services/terraform/workspace.manager', () => ({
  workspaceManager: {
    prepareWorkspace: jest.fn().mockResolvedValue('/tmp/workspaces/dep-123'),
  },
}));

jest.mock('../services/terraform/terraform.runner', () => ({
  terraformRunner: {
    init: jest.fn().mockResolvedValue({ success: true, exitCode: 0 }),
    plan: jest.fn().mockResolvedValue({ success: true, exitCode: 0 }),
    apply: jest.fn().mockResolvedValue({ success: true, exitCode: 0 }),
    destroy: jest.fn().mockResolvedValue({ success: true, exitCode: 0 }),
  },
}));

jest.mock('../services/terraform/state.parser', () => ({
  stateParser: {
    parseWorkspaceState: jest.fn().mockReturnValue({
      resources: [
        {
          type: 'aws_vpc',
          name: 'main',
          provider: 'AWS',
          providerResourceId: 'vpc-123',
          status: 'ACTIVE',
          outputs: { id: 'vpc-123' },
          dependencies: [],
        },
      ],
      outputs: { vpc_id: 'vpc-123' },
    }),
  },
}));

jest.mock('../services/resources/resource.service', () => ({
  resourceService: {
    recordProvisionedResources: jest.fn().mockResolvedValue(undefined),
    markResourcesDestroyed: jest.fn().mockResolvedValue(undefined),
    markResourcesDestroyedByTarget: jest.fn().mockResolvedValue(3),
  },
}));

jest.mock('../services/deployments/deployment.lock', () => ({
  deploymentLockManager: {
    acquireLock: jest.fn().mockResolvedValue('lock-123'),
    releaseLock: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('TerraformWorkerService', () => {
  let worker: TerraformWorkerService;

  beforeEach(() => {
    worker = new TerraformWorkerService();
    jest.clearAllMocks();
  });

  it('start() sweeps deployments stranded mid-flight by a crash into FAILED with an explicit reason', async () => {
    (prisma.deployment.findMany as jest.Mock).mockResolvedValue([
      { id: 'dep-stranded-destroy', operationType: 'DESTROY' },
      { id: 'dep-stranded-apply', operationType: 'CREATE' },
    ]);
    (prisma.deployment.update as jest.Mock).mockResolvedValue({});
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    await worker.start();

    expect(prisma.deployment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { in: expect.arrayContaining(['PLANNING', 'QUEUED', 'RUNNING']) } },
      }),
    );
    expect(prisma.deployment.update).toHaveBeenCalledTimes(2);
    const failCall = (prisma.deployment.update as jest.Mock).mock.calls.find(
      (c) => c[0]?.where?.id === 'dep-stranded-destroy',
    );
    expect(failCall[0].data.status).toBe('FAILED');
    expect(failCall[0].data.applyOutput).toContain('[INTERRUPTED]');
    // Audit trail records the interruption
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILURE' }) }),
    );
  });

  it('start() never blocks worker startup when the database is unreachable during recovery', async () => {
    (prisma.deployment.findMany as jest.Mock).mockRejectedValue(new Error('P1001: database unreachable'));

    await expect(worker.start()).resolves.not.toThrow();
  });

  it('should successfully execute a PLAN action', async () => {
    const mockDeployment = {
      id: 'dep-1',
      projectId: 'proj-1',
      environmentId: 'env-1',
      template: { templateReference: 'templates/aws/aws_vpc', provider: Provider.AWS },
      environment: { cloudAccountId: 'acc-1' },
      configuration: { vpc_cidr: '10.0.0.0/16' },
    };

    (prisma.deployment.findUnique as jest.Mock).mockResolvedValue(mockDeployment);

    const job: DeploymentJobMessage = {
      deploymentId: 'dep-1',
      projectId: 'proj-1',
      environmentId: 'env-1',
      templateId: 'tmpl-1',
      userId: 'usr-admin',
      operationType: OperationType.CREATE,
      action: 'PLAN',
      timestamp: new Date().toISOString(),
      attempt: 1,
    };

    await worker.handleJob(job);

    expect(deploymentLockManager.acquireLock).toHaveBeenCalledWith('proj-1', 'env-1', 'dep-1');
    expect(terraformRunner.init).toHaveBeenCalled();
    expect(terraformRunner.plan).toHaveBeenCalled();
    expect(prisma.deployment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'dep-1' },
        data: expect.objectContaining({ status: DeploymentStatus.PLANNED }),
      }),
    );
    expect(deploymentLockManager.releaseLock).toHaveBeenCalledWith('dep-1');
  });

  it('should successfully execute an APPLY action and record resources', async () => {
    const mockDeployment = {
      id: 'dep-2',
      projectId: 'proj-1',
      environmentId: 'env-1',
      template: { templateReference: 'templates/aws/aws_vpc', provider: Provider.AWS },
      environment: { cloudAccountId: 'acc-1' },
      configuration: { vpc_cidr: '10.0.0.0/16' },
    };

    (prisma.deployment.findUnique as jest.Mock).mockResolvedValue(mockDeployment);

    const job: DeploymentJobMessage = {
      deploymentId: 'dep-2',
      projectId: 'proj-1',
      environmentId: 'env-1',
      templateId: 'tmpl-1',
      userId: 'usr-admin',
      operationType: OperationType.CREATE,
      action: 'APPLY',
      timestamp: new Date().toISOString(),
      attempt: 1,
    };

    await worker.handleJob(job);

    expect(terraformRunner.apply).toHaveBeenCalled();
    expect(resourceService.recordProvisionedResources).toHaveBeenCalled();
    expect(prisma.deployment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'dep-2' },
        data: expect.objectContaining({ status: DeploymentStatus.SUCCEEDED }),
      }),
    );
  });

  it('should execute a DESTROY action scoped to the original deployment target, not the destroy record', async () => {
    const mockDeployment = {
      id: 'dep-destroy-1',
      projectId: 'proj-1',
      environmentId: 'env-1',
      template: { templateReference: 'templates/aws/aws_vpc', provider: Provider.AWS },
      environment: { cloudAccountId: 'acc-1' },
      configuration: { vpc_cidr: '10.0.0.0/16' },
    };

    (prisma.deployment.findUnique as jest.Mock).mockResolvedValue(mockDeployment);

    const job: DeploymentJobMessage = {
      deploymentId: 'dep-destroy-1',
      projectId: 'proj-1',
      environmentId: 'env-1',
      templateId: 'tmpl-1',
      userId: 'usr-admin',
      operationType: OperationType.DESTROY,
      action: 'DESTROY',
      timestamp: new Date().toISOString(),
      attempt: 1,
    };

    await worker.handleJob(job);

    expect(terraformRunner.destroy).toHaveBeenCalled();
    // Regression: teardown must mark the ORIGINAL create deployment's rows
    // (same project/env/template) — not the destroy deployment's own id.
    expect(resourceService.markResourcesDestroyedByTarget).toHaveBeenCalledWith({
      projectId: 'proj-1',
      environmentId: 'env-1',
      templateId: 'tmpl-1',
    });
    expect(prisma.deployment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'dep-destroy-1' },
        data: expect.objectContaining({ status: DeploymentStatus.SUCCEEDED }),
      }),
    );
  });
});
