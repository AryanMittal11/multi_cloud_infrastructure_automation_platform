import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { buildTopologyGraph, TopologyGraph } from '../services/visualization';

export const visualizationController = {
  /**
   * GET /api/topology?projectId=...
   * Infrastructure dependency graph across active deployments
   * (optionally scoped to one project).
   */
  topology: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.query;

      const resources = await prisma.resource.findMany({
        where: {
          status: { not: 'DESTROYED' },
          ...(typeof projectId === 'string' && projectId
            ? { deployment: { projectId } }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
      });

      const graph: TopologyGraph = buildTopologyGraph(resources);

      res.status(200).json({
        graph,
        note: 'Edges marked "inferred" are conservative kind-level relationships; declared edges come from recorded apply-time dependencies.',
      });
    } catch (err) {
      next(err);
    }
  },
};
