import { Provider, ResourceStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ParsedResourceItem } from '../terraform/terraform.types';
import { logger } from '../../utils/logger';

export class ResourceService {
  /**
   * Synchronizes parsed Terraform state resources with the PostgreSQL Resource inventory.
   */
  async recordProvisionedResources(
    deploymentId: string,
    provider: Provider,
    parsedResources: ParsedResourceItem[],
  ): Promise<void> {
    for (const res of parsedResources) {
      await prisma.resource.create({
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
    }

    logger.info(`Recorded ${parsedResources.length} provisioned resource(s) for deployment [${deploymentId}]`);
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
}

export const resourceService = new ResourceService();
