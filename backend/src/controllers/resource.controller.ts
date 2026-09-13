import { Request, Response, NextFunction } from 'express';
import { resourceService } from '../services/resources';
import { Provider, ResourceStatus } from '@prisma/client';

export const resourceController = {
  /**
   * GET /api/resources
   * Lists infrastructure resources matching query filters.
   */
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId, environmentId, deploymentId, provider, status, resourceType } = req.query;

      const resources = await resourceService.listResources({
        projectId: typeof projectId === 'string' ? projectId : undefined,
        environmentId: typeof environmentId === 'string' ? environmentId : undefined,
        deploymentId: typeof deploymentId === 'string' ? deploymentId : undefined,
        provider: typeof provider === 'string' ? (provider as Provider) : undefined,
        status: typeof status === 'string' ? (status as ResourceStatus) : undefined,
        resourceType: typeof resourceType === 'string' ? resourceType : undefined,
      });

      res.status(200).json({ resources });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/resources/:id
   * Retrieves a single provisioned resource by ID.
   */
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resource = await resourceService.getResourceById(req.params.id);
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      res.status(200).json({ resource });
    } catch (err) {
      next(err);
    }
  },
};
