import { Request, Response, NextFunction } from 'express';
import { authService, TokenPayload } from '../services/auth';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware ensuring incoming HTTP requests supply a valid JWT access token.
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Access token required in Authorization header as Bearer <token>',
    });
  }

  try {
    const payload = authService.verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err: any) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: err.message || 'Invalid or expired access token',
    });
  }
}
