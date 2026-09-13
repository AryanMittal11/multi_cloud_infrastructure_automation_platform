import { DeploymentService } from './deployment.service';
import { prisma } from '../../config/prisma';
import { queueService } from '../queue';
import { templateService } from '../templates';
import { deploymentLockManager } from './deployment.lock';
import { DeploymentStatus, OperationType, Provider, Role } from '@prisma/client';

// Mock dependencies
jest.mock('../../config/prisma', () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
    },
    environment: {
      findUnique: jest.fn(),
    },
    deployment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../queue', () => ({
  queueService: {
    publishJob: jest.fn(),
  },
}));

jest.mock('../templates', () => ({
  templateService: {
    validateConfiguration: jest.fn(),
  },
}));

jest.mock('./deployment.lock', () => ({
  deploymentLockManager: {
    getLockStatus: jest.fn(),
  },
}));

describe('DeploymentService Subsystem', () => {
  let service: DeploymentService;

  beforeEach(() => {
    service = new DeploymentService();
    jest.clearAllMocks();
  });

  describe('createPlan', () => {
    const validPlanInput = {
      projectId: 'proj-123',
      environmentId: 'env-123',
      templateId: 'tmpl-123',
      operationType: OperationType.CREATE,
      configuration: { vpc_cidr: '10.0.0.0/16' },
    };

    it('should successfully create a deployment plan and dispatch job', async () => {
      // 1. Mock Project
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'proj-123',
        name: 'Production Project',
      });

      // 2. Mock Environment
      (prisma.environment.findUnique as jest.Mock).mockResolvedValue({
        id: 'env-123',
        projectId: 'proj-123',
        name: 'development',
        cloudAccountId: 'cloud-acc-1',
      });

      // 3. Mock Template Validation
      (templateService.validateConfiguration as jest.Mock).mockResolvedValue({
        valid: true,
        errors: [],
        sanitizedConfiguration: { vpc_cidr: '10.0.0.0/16', enable_dns: true },
      });

      // 4. Mock Lock Status
      (deploymentLockManager.getLockStatus as jest.Mock).mockResolvedValue({
        isLocked: false,
        environmentId: 'env-123',
      });

      // 5. Mock Deployment Creation
      const mockCreatedDeployment = {
        id: 'dep-456',
        projectId: 'proj-123',
        environmentId: 'env-123',
        templateId: 'tmpl-123',
        userId: 'usr-999',
        operationType: OperationType.CREATE,
        status: DeploymentStatus.PLANNING,
        configuration: { vpc_cidr: '10.0.0.0/16', enable_dns: true },
        planOutput: null,
        applyOutput: null,
        costEstimate: null,
        policyEvaluation: null,
        planTime: null,
        applyTime: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        project: { id: 'proj-123', name: 'Production Project' },
        environment: { id: 'env-123', name: 'development', cloudAccountId: 'cloud-acc-1' },
        template: { id: 'tmpl-123', name: 'AWS VPC', provider: Provider.AWS, version: '1.0.0' },
        user: { id: 'usr-999', name: 'Alice', email: 'alice@example.com', role: Role.DEVELOPER },
      };
      (prisma.deployment.create as jest.Mock).mockResolvedValue(mockCreatedDeployment);
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
      (queueService.publishJob as jest.Mock).mockResolvedValue(true);

      const result = await service.createPlan('usr-999', validPlanInput);

      expect(result.id).toBe('dep-456');
      expect(result.status).toBe(DeploymentStatus.PLANNING);
      expect(prisma.deployment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: DeploymentStatus.PLANNING,
            operationType: OperationType.CREATE,
          }),
        }),
      );
      expect(queueService.publishJob).toHaveBeenCalledWith(
        expect.objectContaining({
          deploymentId: 'dep-456',
          action: 'PLAN',
        }),
        'PLAN',
      );
    });

    it('should throw 404 if project does not exist', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.createPlan('usr-999', validPlanInput)).rejects.toThrow(
        'Project [proj-123] not found',
      );
    });

    it('should throw 404 if environment does not exist', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: 'proj-123' });
      (prisma.environment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.createPlan('usr-999', validPlanInput)).rejects.toThrow(
        'Environment [env-123] not found',
      );
    });

    it('should throw 400 if environment belongs to a different project', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: 'proj-123' });
      (prisma.environment.findUnique as jest.Mock).mockResolvedValue({
        id: 'env-123',
        projectId: 'different-project',
      });

      await expect(service.createPlan('usr-999', validPlanInput)).rejects.toThrow(
        'Environment does not belong to the specified project',
      );
    });

    it('should throw 400 if environment has no bound cloud account', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: 'proj-123' });
      (prisma.environment.findUnique as jest.Mock).mockResolvedValue({
        id: 'env-123',
        projectId: 'proj-123',
        cloudAccountId: null,
      });

      await expect(service.createPlan('usr-999', validPlanInput)).rejects.toThrow(
        'Environment must have an associated cloud account before generating a plan',
      );
    });

    it('should throw 400 if template configuration fails schema validation', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: 'proj-123' });
      (prisma.environment.findUnique as jest.Mock).mockResolvedValue({
        id: 'env-123',
        projectId: 'proj-123',
        cloudAccountId: 'cloud-acc-1',
      });
      (templateService.validateConfiguration as jest.Mock).mockResolvedValue({
        valid: false,
        errors: [{ field: 'vpc_cidr', message: 'is required' }],
      });

      await expect(service.createPlan('usr-999', validPlanInput)).rejects.toThrow(
        'Template configuration validation failed: vpc_cidr: is required',
      );
    });

    it('should throw 409 Conflict if environment is currently locked', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: 'proj-123' });
      (prisma.environment.findUnique as jest.Mock).mockResolvedValue({
        id: 'env-123',
        projectId: 'proj-123',
        cloudAccountId: 'cloud-acc-1',
      });
      (templateService.validateConfiguration as jest.Mock).mockResolvedValue({
        valid: true,
        errors: [],
      });
      (deploymentLockManager.getLockStatus as jest.Mock).mockResolvedValue({
        isLocked: true,
        environmentId: 'env-123',
        activeDeployment: { id: 'dep-active' },
      });

      await expect(service.createPlan('usr-999', validPlanInput)).rejects.toThrow(
        'Environment is currently locked by active deployment [dep-active]',
      );
    });
  });

  describe('getDeploymentById', () => {
    it('should return deployment with parsed plan summary when plan output exists', async () => {
      const mockDeployment = {
        id: 'dep-123',
        projectId: 'proj-123',
        environmentId: 'env-123',
        templateId: 'tmpl-123',
        userId: 'usr-1',
        operationType: OperationType.CREATE,
        status: DeploymentStatus.PLANNED,
        configuration: {},
        planOutput: `
          # aws_vpc.main will be created
          Plan: 1 to add, 0 to change, 0 to destroy.
        `,
        applyOutput: null,
        costEstimate: null,
        policyEvaluation: null,
        planTime: new Date(),
        applyTime: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue(mockDeployment);

      const result = await service.getDeploymentById('dep-123');

      expect(result.id).toBe('dep-123');
      expect(result.parsedPlanSummary).not.toBeNull();
      expect(result.parsedPlanSummary?.toAdd).toBe(1);
      expect(result.parsedPlanSummary?.toChange).toBe(0);
      expect(result.parsedPlanSummary?.toDestroy).toBe(0);
      expect(result.parsedPlanSummary?.isDestructive).toBe(false);
    });

    it('should throw 404 if deployment not found', async () => {
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getDeploymentById('non-existent')).rejects.toThrow(
        'Deployment [non-existent] not found',
      );
    });
  });

  describe('approveDeployment', () => {
    const plannedDeployment = {
      id: 'dep-planned-1',
      projectId: 'proj-123',
      environmentId: 'env-123',
      templateId: 'tmpl-123',
      userId: 'usr-dev',
      operationType: OperationType.CREATE,
      status: DeploymentStatus.PLANNED,
      configuration: {},
      planOutput: `
        # aws_vpc.main will be created
        Plan: 1 to add, 0 to change, 0 to destroy.
      `,
      applyOutput: null,
      costEstimate: null,
      policyEvaluation: null,
      planTime: new Date(),
      applyTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      project: { id: 'proj-123', name: 'Project 1' },
      environment: { id: 'env-123', name: 'development', cloudAccountId: 'acc-1' },
      template: { id: 'tmpl-123', name: 'VPC', provider: Provider.AWS, version: '1.0.0' },
      user: { id: 'usr-dev', name: 'Dev', email: 'dev@test.com', role: Role.DEVELOPER },
    };

    it('should successfully approve a non-destructive planned deployment', async () => {
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue(plannedDeployment);
      (deploymentLockManager.getLockStatus as jest.Mock).mockResolvedValue({
        isLocked: false,
        environmentId: 'env-123',
      });
      (prisma.deployment.update as jest.Mock).mockResolvedValue({
        ...plannedDeployment,
        status: DeploymentStatus.QUEUED,
      });
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
      (queueService.publishJob as jest.Mock).mockResolvedValue(true);

      const result = await service.approveDeployment(
        'dep-planned-1',
        { userId: 'usr-dev', role: Role.DEVELOPER },
        { comment: 'Ready for release' },
      );

      expect(result.status).toBe(DeploymentStatus.QUEUED);
      expect(prisma.deployment.update).toHaveBeenCalledWith({
        where: { id: 'dep-planned-1' },
        data: { status: DeploymentStatus.QUEUED },
        include: expect.any(Object),
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'DEPLOYMENT_APPROVED',
            userId: 'usr-dev',
          }),
        }),
      );
      expect(queueService.publishJob).toHaveBeenCalledWith(
        expect.objectContaining({
          deploymentId: 'dep-planned-1',
          action: 'APPLY',
        }),
        'APPLY',
      );
    });

    it('should reject approval if deployment is not in PLANNED status', async () => {
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue({
        ...plannedDeployment,
        status: DeploymentStatus.PLANNING,
      });

      await expect(
        service.approveDeployment('dep-planned-1', { userId: 'usr-dev', role: Role.DEVELOPER }),
      ).rejects.toThrow('Cannot approve deployment in status "PLANNING". Deployment must be in "PLANNED" status.');
    });

    it('should require confirmationKeyword: CONFIRM_APPLY for destructive plans', async () => {
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue({
        ...plannedDeployment,
        planOutput: `
          # aws_instance.web will be destroyed
          Plan: 0 to add, 0 to change, 1 to destroy.
        `,
      });

      await expect(
        service.approveDeployment('dep-planned-1', { userId: 'usr-dev', role: Role.DEVELOPER }),
      ).rejects.toThrow(
        'This plan contains destructive changes (resources will be destroyed or replaced). You must provide confirmationKeyword: "CONFIRM_APPLY" to proceed.',
      );
    });

    it('should succeed with destructive plan when CONFIRM_APPLY is provided', async () => {
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue({
        ...plannedDeployment,
        planOutput: `
          # aws_instance.web will be destroyed
          Plan: 0 to add, 0 to change, 1 to destroy.
        `,
      });
      (deploymentLockManager.getLockStatus as jest.Mock).mockResolvedValue({
        isLocked: false,
        environmentId: 'env-123',
      });
      (prisma.deployment.update as jest.Mock).mockResolvedValue({
        ...plannedDeployment,
        status: DeploymentStatus.QUEUED,
      });
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
      (queueService.publishJob as jest.Mock).mockResolvedValue(true);

      const result = await service.approveDeployment(
        'dep-planned-1',
        { userId: 'usr-dev', role: Role.DEVELOPER },
        { confirmationKeyword: 'CONFIRM_APPLY' },
      );

      expect(result.status).toBe(DeploymentStatus.QUEUED);
      expect(queueService.publishJob).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'APPLY' }),
        'APPLY',
      );
    });

    it('should reject non-admin from approving production without confirmation keyword', async () => {
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue({
        ...plannedDeployment,
        environment: { id: 'env-123', name: 'production', cloudAccountId: 'acc-1' },
      });

      await expect(
        service.approveDeployment('dep-planned-1', { userId: 'usr-dev', role: Role.DEVELOPER }),
      ).rejects.toThrow(
        'Deploying to production requires administrator privileges or confirmationKeyword: "CONFIRM_APPLY".',
      );
    });

    it('should allow admin to approve production without confirmation keyword', async () => {
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue({
        ...plannedDeployment,
        environment: { id: 'env-123', name: 'production', cloudAccountId: 'acc-1' },
      });
      (deploymentLockManager.getLockStatus as jest.Mock).mockResolvedValue({
        isLocked: false,
        environmentId: 'env-123',
      });
      (prisma.deployment.update as jest.Mock).mockResolvedValue({
        ...plannedDeployment,
        status: DeploymentStatus.QUEUED,
      });
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
      (queueService.publishJob as jest.Mock).mockResolvedValue(true);

      const result = await service.approveDeployment(
        'dep-planned-1',
        { userId: 'usr-admin', role: Role.ADMIN },
      );

      expect(result.status).toBe(DeploymentStatus.QUEUED);
    });

    it('should throw 409 Conflict if environment is locked by another deployment', async () => {
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue(plannedDeployment);
      (deploymentLockManager.getLockStatus as jest.Mock).mockResolvedValue({
        isLocked: true,
        environmentId: 'env-123',
        activeDeployment: { id: 'dep-other-running' },
      });

      await expect(
        service.approveDeployment('dep-planned-1', { userId: 'usr-dev', role: Role.DEVELOPER }),
      ).rejects.toThrow(
        'Environment is currently locked by active deployment [dep-other-running]',
      );
    });
  });

  describe('cancelDeployment', () => {
    const plannedDeployment = {
      id: 'dep-cancel-1',
      projectId: 'proj-123',
      environmentId: 'env-123',
      status: DeploymentStatus.PLANNED,
      environment: { name: 'development' },
    };

    it('should cancel a PLANNED deployment successfully', async () => {
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue(plannedDeployment);
      (prisma.deployment.update as jest.Mock).mockResolvedValue({
        ...plannedDeployment,
        status: DeploymentStatus.CANCELLED,
      });
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const result = await service.cancelDeployment(
        'dep-cancel-1',
        { userId: 'usr-dev', role: Role.DEVELOPER },
        { reason: 'Cost too high' },
      );

      expect(result.status).toBe(DeploymentStatus.CANCELLED);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'DEPLOYMENT_CANCELLED',
          }),
        }),
      );
    });

    it('should throw 400 if trying to cancel an already SUCCEEDED deployment', async () => {
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue({
        ...plannedDeployment,
        status: DeploymentStatus.SUCCEEDED,
      });

      await expect(
        service.cancelDeployment('dep-cancel-1', { userId: 'usr-dev', role: Role.DEVELOPER }),
      ).rejects.toThrow(
        'Cannot cancel deployment in status "SUCCEEDED". Only DRAFT, PLANNING, or PLANNED deployments can be cancelled.',
      );
    });
  });
});
