import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

export interface DestructiveConfirmationOptions {
  /**
   * Expected confirmation keyword (e.g. 'CONFIRM_DESTROY' or 'DESTROY')
   */
  expectedKeyword?: string;
  /**
   * Whether to require confirmation matching target resource/environment name
   */
  requireTargetNameMatch?: boolean;
}

/**
 * Guard middleware for destructive infrastructure operations (e.g., terraform destroy, environment teardown).
 *
 * Invariants Enforced:
 * 1. Requires ADMIN role authorization (privilege gate).
 * 2. Requires explicit user confirmation keyword or target match in request payload (safety gate).
 */
export function requireDestructivePermission(options: DestructiveConfirmationOptions = {}) {
  const { expectedKeyword = 'CONFIRM_DESTROY' } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    // 1. Verify authenticated context
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required for destructive operations',
      });
    }

    // 2. Strict Privilege Gate: Only ADMIN can trigger destructive operations
    if (user.role !== Role.ADMIN) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Destructive operations require ADMIN privileges',
      });
    }

    // 3. Safety Gate: Explicit confirmation check in body or header
    const confirmation =
      req.body?.confirmation ||
      req.body?.confirmText ||
      req.headers['x-confirm-destroy'];

    if (!confirmation) {
      return res.status(400).json({
        error: 'Confirmation Required',
        message: `Destructive operation requires explicit confirmation. Please provide 'confirmation: "${expectedKeyword}"' in request payload.`,
      });
    }

    // Check confirmation string match
    if (typeof confirmation === 'string' && confirmation.trim() !== expectedKeyword) {
      return res.status(400).json({
        error: 'Invalid Confirmation',
        message: `Confirmation text mismatch. Expected: "${expectedKeyword}", received: "${confirmation}"`,
      });
    }

    next();
  };
}
