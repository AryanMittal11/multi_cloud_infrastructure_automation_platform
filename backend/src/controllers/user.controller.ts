import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { Role } from '@prisma/client';

export const userController = {
  /**
   * GET /api/users
   * Lists all platform users. Admin-only.
   */
  list: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              projects: true,
              deployments: true,
              designs: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      res.status(200).json({ users });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/users/:id
   * Get a single user by ID. Admin-only.
   */
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              projects: true,
              deployments: true,
              designs: true,
              cloudAccounts: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/users/:id/role
   * Update a user's role (DEVELOPER <-> VIEWER). Cannot change admin role.
   */
  updateRole: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role } = req.body;
      const targetId = req.params.id;

      // Cannot change the admin's own role
      if (targetId === req.user!.userId) {
        return res.status(400).json({
          error: 'Cannot modify your own role',
          message: 'The site owner role cannot be changed.',
        });
      }

      const target = await prisma.user.findUnique({ where: { id: targetId } });
      if (!target) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Cannot promote someone to ADMIN
      if (role === Role.ADMIN) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Cannot assign the ADMIN role. There is only one site owner.',
        });
      }

      // Cannot change another admin (should not exist, but guard)
      if (target.role === Role.ADMIN) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Cannot modify an admin account.',
        });
      }

      const updated = await prisma.user.update({
        where: { id: targetId },
        data: { role },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user!.userId,
          action: 'USER_ROLE_UPDATED',
          status: 'SUCCESS',
          message: `User "${updated.name}" role changed from ${target.role} to ${role}`,
          metadata: { targetUserId: targetId, previousRole: target.role, newRole: role },
        },
      });

      res.status(200).json({
        message: `User "${updated.name}" role updated to ${role}`,
        user: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/users/:id
   * Remove a user from the platform. Admin-only. Cannot delete self.
   */
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetId = req.params.id;

      if (targetId === req.user!.userId) {
        return res.status(400).json({
          error: 'Cannot delete yourself',
          message: 'The site owner account cannot be deleted.',
        });
      }

      const target = await prisma.user.findUnique({ where: { id: targetId } });
      if (!target) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (target.role === Role.ADMIN) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Cannot delete an admin account.',
        });
      }

      await prisma.user.delete({ where: { id: targetId } });

      await prisma.auditLog.create({
        data: {
          userId: req.user!.userId,
          action: 'USER_DELETED',
          status: 'SUCCESS',
          message: `User "${target.name}" (${target.email}) was removed from the platform`,
          metadata: { targetUserId: targetId, targetEmail: target.email, targetRole: target.role },
        },
      });

      res.status(200).json({
        message: `User "${target.name}" deleted successfully`,
      });
    } catch (err) {
      next(err);
    }
  },
};
