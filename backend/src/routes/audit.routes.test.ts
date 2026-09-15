import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { Role } from '@prisma/client';

jest.mock('../config/prisma', () => ({
  prisma: {
    auditLog: {
      findMany: jest.fn(),
    },
  },
}));

describe('Audit Logs HTTP Routes', () => {
  const viewerToken = jwt.sign(
    { userId: 'usr-viewer', email: 'viewer@example.com', role: Role.VIEWER },
    env.JWT_SECRET,
  );

  const devToken = jwt.sign(
    { userId: 'usr-dev', email: 'dev@example.com', role: Role.DEVELOPER },
    env.JWT_SECRET,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/audit-logs', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/audit-logs');
      expect(res.status).toBe(401);
    });

    it('should return 200 with list of audit logs for DEVELOPER', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          action: 'DEPLOYMENT_PLAN',
          status: 'SUCCESS',
          message: 'Plan generated for AWS VPC',
          timestamp: new Date().toISOString(),
          user: { id: 'usr-1', name: 'Dev User', email: 'dev@test.com', role: 'DEVELOPER' },
          project: { id: 'p-1', name: 'Prod Platform' },
          deployment: { id: 'dep-1', operationType: 'CREATE', status: 'PLANNED' },
        },
      ];

      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs);

      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.auditLogs).toHaveLength(1);
      expect(res.body.auditLogs[0].action).toBe('DEPLOYMENT_PLAN');
    });

    it('should pass query filter parameters to prisma query', async () => {
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/audit-logs?status=SUCCESS&action=DEPLOYMENT_APPLY&limit=10')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'SUCCESS',
            action: 'DEPLOYMENT_APPLY',
          }),
          take: 10,
        }),
      );
    });
  });
});
