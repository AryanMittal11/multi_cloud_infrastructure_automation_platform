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
});
