import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

/**
 * Role-Based Access Control (RBAC) Middleware.
 * Enforces that the authenticated user possesses one of the allowed roles.
 *
 * @param allowedRoles Array of Role enum values permitted to access the endpoint
 */
export function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    // 1. Verify user context is present on request
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication is required to access this resource',
      });
    }

    // 2. Check if user's role is in the allowed list
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Insufficient permissions. Required role: [${allowedRoles.join(', ')}], current role: ${user.role}`,
      });
    }

    next();
  };
}

/**
 * Convenience guards for common role checks
 */
export const requireAdmin = requireRole([Role.ADMIN]);
export const requireDeveloper = requireRole([Role.ADMIN, Role.DEVELOPER]);
export const requireViewer = requireRole([Role.ADMIN, Role.DEVELOPER, Role.VIEWER]);
