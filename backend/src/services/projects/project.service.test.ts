import { ProjectService } from './project.service';
import { prisma } from '../../config/prisma';

// Mock Prisma
jest.mock('../../config/prisma', () => ({
  prisma: {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    environment: {
      createMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    cloudAccount: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

describe('ProjectService', () => {
  let projectService: ProjectService;

  beforeEach(() => {
    projectService = new ProjectService();
    jest.clearAllMocks();
  });

  describe('Project Creation', () => {
    it('should create project and automatically initialize default environments', async () => {
      const mockProject = {
        id: 'proj-123',
        name: 'Enterprise App',
        description: 'Core platform project',
        ownerId: 'usr-dev',
        createdAt: new Date(),
        updatedAt: new Date(),
        environments: [
          { id: 'env-1', name: 'development', projectId: 'proj-123', cloudAccountId: null, createdAt: new Date(), updatedAt: new Date() },
          { id: 'env-2', name: 'staging', projectId: 'proj-123', cloudAccountId: null, createdAt: new Date(), updatedAt: new Date() },
          { id: 'env-3', name: 'production', projectId: 'proj-123', cloudAccountId: null, createdAt: new Date(), updatedAt: new Date() },
        ],
        cloudAccounts: [],
        _count: { deployments: 0 },
      };

      (prisma.project.create as jest.Mock).mockResolvedValue({ id: 'proj-123', name: 'Enterprise App' });
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      const res = await projectService.createProject('usr-dev', {
        name: 'Enterprise App',
        description: 'Core platform project',
      });

      expect(prisma.project.create).toHaveBeenCalled();
      expect(prisma.environment.createMany).toHaveBeenCalledWith({
        data: [
          { name: 'development', projectId: 'proj-123' },
          { name: 'staging', projectId: 'proj-123' },
          { name: 'production', projectId: 'proj-123' },
        ],
      });
      expect(res.name).toBe('Enterprise App');
      expect(res.environments).toHaveLength(3);
    });
  });

  describe('Environment Association', () => {
    it('should bind an approved cloud account to an environment', async () => {
      (prisma.environment.findUnique as jest.Mock).mockResolvedValue({
        id: 'env-dev',
        name: 'development',
      });
      (prisma.cloudAccount.findUnique as jest.Mock).mockResolvedValue({
        id: 'acc-aws',
        name: 'AWS Staging',
        provider: 'AWS',
        accountReference: '123456789012',
      });
      (prisma.environment.update as jest.Mock).mockResolvedValue({
        id: 'env-dev',
        name: 'development',
        projectId: 'proj-1',
        cloudAccountId: 'acc-aws',
        cloudAccount: {
          id: 'acc-aws',
          name: 'AWS Staging',
          provider: 'AWS',
          accountReference: '123456789012',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await projectService.bindCloudAccountToEnvironment('env-dev', 'acc-aws');

      expect(res.cloudAccountId).toBe('acc-aws');
      expect(res.cloudAccount?.name).toBe('AWS Staging');
      expect(prisma.environment.update).toHaveBeenCalledWith({
        where: { id: 'env-dev' },
        data: { cloudAccountId: 'acc-aws' },
        include: { cloudAccount: true },
      });
    });

    it('unbinds the cloud account when cloudAccountId is null', async () => {
      (prisma.environment.findUnique as jest.Mock).mockResolvedValue({
        id: 'env-dev',
        name: 'development',
        cloudAccountId: 'acc-aws',
      });
      (prisma.environment.update as jest.Mock).mockResolvedValue({
        id: 'env-dev',
        name: 'development',
        projectId: 'proj-1',
        cloudAccountId: null,
        cloudAccount: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await projectService.bindCloudAccountToEnvironment('env-dev', null);

      expect(res.cloudAccountId).toBeNull();
      expect(prisma.environment.update).toHaveBeenCalledWith({
        where: { id: 'env-dev' },
        data: { cloudAccountId: null },
        include: { cloudAccount: true },
      });
    });

    it('should reject environment creation if name is duplicated within project', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: 'proj-1' });
      (prisma.environment.findUnique as jest.Mock).mockResolvedValue({
        id: 'env-existing',
        name: 'development',
      });

      await expect(
        projectService.createEnvironment('proj-1', { name: 'development' }),
      ).rejects.toThrow('already exists for this project');
    });
  });

  describe('Safe Project Deletion', () => {
    it('should prevent project deletion if active deployments are running', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'proj-active',
        name: 'Active Project',
        deployments: [{ id: 'dep-1', status: 'RUNNING' }],
      });

      await expect(projectService.deleteProject('proj-active', 'usr-admin', require('@prisma/client').Role.ADMIN)).rejects.toThrow(
        'active running deployment(s)',
      );
      expect(prisma.project.delete).not.toHaveBeenCalled();
    });
  });
});
