import { Provider, ResourceStatus, Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ParsedResourceItem } from '../terraform/terraform.types';
import { logger } from '../../utils/logger';

export interface ResourceFilter {
  projectId?: string;
  environmentId?: string;
  deploymentId?: string;
  provider?: Provider;
  status?: ResourceStatus;
  resourceType?: string;
}

export class ResourceService {
  /**
   * Synchronizes parsed Terraform state resources with the PostgreSQL Resource inventory.
   * Purges previous stale records for this deployment to mirror exact state after apply.
   */
  async recordProvisionedResources(
    deploymentId: string,
    provider: Provider,
    parsedResources: ParsedResourceItem[],
  ) {
    // 1. Purge previous stale records for this deployment to avoid duplicate or orphaned resources
    await prisma.resource.deleteMany({
      where: { deploymentId },
    });

    // 2. Persist newly provisioned resources
    const createdResources = [];
    for (const res of parsedResources) {
      const created = await prisma.resource.create({
        data: {
          deploymentId,
          provider,
          resourceType: res.type,
          providerResourceId: res.providerResourceId || `${res.type}.${res.name}`,
          name: res.name,
          status: ResourceStatus.ACTIVE,
          outputs: res.outputs,
          dependencies: res.dependencies,
        },
      });
      createdResources.push(created);
    }

    logger.info(`Recorded ${parsedResources.length} provisioned resource(s) for deployment [${deploymentId}]`);
    return createdResources;
  }

  /**
   * Marks resources associated with a deployment as destroyed.
   */
  async markResourcesDestroyed(deploymentId: string): Promise<void> {
    await prisma.resource.updateMany({
      where: { deploymentId },
      data: { status: ResourceStatus.DESTROYED },
    });

    logger.info(`Marked resources as DESTROYED for deployment [${deploymentId}]`);
  }

  /**
   * Retrieves resources for a specific deployment.
   */
  async getResourcesByDeployment(deploymentId: string) {
    return prisma.resource.findMany({
      where: { deploymentId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Retrieves a single resource by its unique identifier.
   */
  async getResourceById(id: string, userId?: string, role?: Role) {
    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        deployment: {
          select: {
            id: true,
            projectId: true,
            environmentId: true,
            templateId: true,
            status: true,
            operationType: true,
            project: {
              select: { ownerId: true },
            },
          },
        },
      },
    });

    if (!resource) return null;
    if (role && role !== Role.ADMIN && resource.deployment.project.ownerId !== userId) {
      return null;
    }
    return resource;
  }

  /**
   * Lists resources matching flexible filtering criteria (project, environment, provider, status).
   * ADMIN sees all; DEVELOPER sees only resources from their own projects.
   */
  async listResources(userId: string, role: Role, filter?: ResourceFilter) {
    const where: any = {};

    if (filter?.status) where.status = filter.status;
    if (filter?.provider) where.provider = filter.provider;
    if (filter?.resourceType) where.resourceType = filter.resourceType;
    if (filter?.deploymentId) where.deploymentId = filter.deploymentId;

    where.deployment = where.deployment || {};
    if (filter?.environmentId) where.deployment.environmentId = filter.environmentId;
    if (filter?.projectId) where.deployment.projectId = filter.projectId;
    if (role !== Role.ADMIN) {
      where.deployment.project = { ownerId: userId };
    }

    return prisma.resource.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        deployment: {
          select: {
            id: true,
            projectId: true,
            environmentId: true,
            templateId: true,
            status: true,
            operationType: true,
          },
        },
      },
    });
  }
}

export const resourceService = new ResourceService();
