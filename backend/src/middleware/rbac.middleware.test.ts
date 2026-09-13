import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { requireRole, requireAdmin, requireDeveloper } from './rbac.middleware';
import './auth.middleware';

describe('RBAC Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  it('should return 401 if user is not attached to request', () => {
    const middleware = requireRole([Role.ADMIN]);
    middleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'Authentication is required to access this resource',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 403 if user role is not in allowed roles list', () => {
    mockReq.user = {
      userId: 'usr-1',
      email: 'dev@example.com',
      role: Role.DEVELOPER,
    };

    const middleware = requireAdmin; // requires Role.ADMIN
    middleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Forbidden',
      }),
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should call next() if user role is in allowed roles list', () => {
    mockReq.user = {
      userId: 'usr-admin',
      email: 'admin@example.com',
      role: Role.ADMIN,
    };

    const middleware = requireAdmin;
    middleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should allow both ADMIN and DEVELOPER for requireDeveloper', () => {
    mockReq.user = {
      userId: 'usr-dev',
      email: 'dev@example.com',
      role: Role.DEVELOPER,
    };

    requireDeveloper(mockReq as Request, mockRes as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should reject VIEWER from accessing developer routes', () => {
    mockReq.user = {
      userId: 'usr-viewer',
      email: 'viewer@example.com',
      role: Role.VIEWER,
    };

    requireDeveloper(mockReq as Request, mockRes as Response, nextFunction);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
