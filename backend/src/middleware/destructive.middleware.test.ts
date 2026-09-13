import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { requireDestructivePermission } from './destructive.middleware';
import './auth.middleware';

describe('Destructive Guard Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  it('should return 401 if user is unauthenticated', () => {
    const middleware = requireDestructivePermission();
    middleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 403 if user is DEVELOPER (only ADMIN can destroy)', () => {
    mockReq.user = {
      userId: 'usr-dev',
      email: 'dev@example.com',
      role: Role.DEVELOPER,
    };
    mockReq.body = { confirmation: 'CONFIRM_DESTROY' };

    const middleware = requireDestructivePermission();
    middleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Forbidden',
        message: 'Destructive operations require ADMIN privileges',
      }),
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 400 if user is ADMIN but confirmation parameter is missing', () => {
    mockReq.user = {
      userId: 'usr-admin',
      email: 'admin@example.com',
      role: Role.ADMIN,
    };
    mockReq.body = {}; // Missing confirmation

    const middleware = requireDestructivePermission();
    middleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Confirmation Required',
      }),
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 400 if confirmation text does not match expected keyword', () => {
    mockReq.user = {
      userId: 'usr-admin',
      email: 'admin@example.com',
      role: Role.ADMIN,
    };
    mockReq.body = { confirmation: 'WRONG_CONFIRMATION' };

    const middleware = requireDestructivePermission();
    middleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Invalid Confirmation',
      }),
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should allow execution when user is ADMIN and confirmation matches', () => {
    mockReq.user = {
      userId: 'usr-admin',
      email: 'admin@example.com',
      role: Role.ADMIN,
    };
    mockReq.body = { confirmation: 'CONFIRM_DESTROY' };

    const middleware = requireDestructivePermission();
    middleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should support custom confirmation keyword', () => {
    mockReq.user = {
      userId: 'usr-admin',
      email: 'admin@example.com',
      role: Role.ADMIN,
    };
    mockReq.body = { confirmation: 'DESTROY_PRODUCTION_ENV' };

    const middleware = requireDestructivePermission({
      expectedKeyword: 'DESTROY_PRODUCTION_ENV',
    });
    middleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
  });
});
