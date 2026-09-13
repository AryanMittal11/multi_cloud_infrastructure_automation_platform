import { ResourceService } from './resource.service';
import { prisma } from '../../config/prisma';
import { Provider, ResourceStatus } from '@prisma/client';

// Mock Prisma
jest.mock('../../config/prisma', () => ({
  prisma: {
    resource: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

describe('ResourceService Subsystem', () => {
  let service: ResourceService;

  beforeEach(() => {
    service = new ResourceService();
    jest.clearAllMocks();
  });

  describe('recordProvisionedResources', () => {
    it('should purge previous resources and record new active resources', async () => {
      (prisma.resource.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.resource.create as jest.Mock).mockImplementation(({ data }) =>
        Promise.resolve({ id: 'res-new', ...data }),
      );

      const parsedResources = [
        {
          type: 'aws_vpc',
          name: 'main',
          provider: 'AWS',
          providerResourceId: 'vpc-0123456789',
          status: 'ACTIVE' as const,
          outputs: { cidr_block: '10.0.0.0/16' },
          dependencies: [],
        },
      ];

      const result = await service.recordProvisionedResources(
        'dep-100',
        Provider.AWS,
        parsedResources,
      );

      expect(prisma.resource.deleteMany).toHaveBeenCalledWith({
        where: { deploymentId: 'dep-100' },
      });

      expect(prisma.resource.create).toHaveBeenCalledWith({
        data: {
          deploymentId: 'dep-100',
          provider: Provider.AWS,
          resourceType: 'aws_vpc',
          providerResourceId: 'vpc-0123456789',
          name: 'main',
          status: ResourceStatus.ACTIVE,
          outputs: { cidr_block: '10.0.0.0/16' },
          dependencies: [],
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(ResourceStatus.ACTIVE);
    });
  });

  describe('markResourcesDestroyed', () => {
    it('should update all resources for deployment to DESTROYED status', async () => {
      (prisma.resource.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      await service.markResourcesDestroyed('dep-100');

      expect(prisma.resource.updateMany).toHaveBeenCalledWith({
        where: { deploymentId: 'dep-100' },
        data: { status: ResourceStatus.DESTROYED },
      });
    });
  });

  describe('getResourcesByDeployment', () => {
    it('should return resources ordered by createdAt asc', async () => {
      (prisma.resource.findMany as jest.Mock).mockResolvedValue([
        { id: 'res-1', name: 'vpc' },
        { id: 'res-2', name: 'subnet' },
      ]);

      const resources = await service.getResourcesByDeployment('dep-100');

      expect(prisma.resource.findMany).toHaveBeenCalledWith({
        where: { deploymentId: 'dep-100' },
        orderBy: { createdAt: 'asc' },
      });
      expect(resources).toHaveLength(2);
    });
  });

  describe('getResourceById', () => {
    it('should find resource by ID with deployment relation', async () => {
      (prisma.resource.findUnique as jest.Mock).mockResolvedValue({
        id: 'res-1',
        resourceType: 'aws_vpc',
        deployment: { id: 'dep-1' },
      });

      const resource = await service.getResourceById('res-1');

      expect(prisma.resource.findUnique).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        include: expect.any(Object),
      });
      expect(resource?.id).toBe('res-1');
    });
  });

  describe('listResources', () => {
    it('should filter resources by status and environmentId', async () => {
      (prisma.resource.findMany as jest.Mock).mockResolvedValue([{ id: 'res-active' }]);

      const resources = await service.listResources({
        environmentId: 'env-prod',
        status: ResourceStatus.ACTIVE,
      });

      expect(prisma.resource.findMany).toHaveBeenCalledWith({
        where: {
          status: ResourceStatus.ACTIVE,
          deployment: { environmentId: 'env-prod' },
        },
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
      expect(resources).toHaveLength(1);
    });
  });
});
