import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export const auditController = {
  /**
   * GET /api/audit-logs
   * Returns immutable audit trail entries with optional filtering.
   */
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, projectId, deploymentId, action, status, limit } = req.query;

      const take = limit ? Math.min(parseInt(limit as string, 10) || 50, 200) : 50;

      const where: any = {};
      if (typeof userId === 'string') where.userId = userId;
      if (typeof projectId === 'string') where.projectId = projectId;
      if (typeof deploymentId === 'string') where.deploymentId = deploymentId;
      if (typeof action === 'string') where.action = action;
      if (typeof status === 'string') where.status = status;

      const auditLogs = await prisma.auditLog.findMany({
        where,
        take,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
          project: {
            select: { id: true, name: true },
          },
          deployment: {
            select: { id: true, operationType: true, status: true },
          },
        },
      });

      res.status(200).json({ auditLogs });
    } catch (err) {
      next(err);
    }
  },
};
