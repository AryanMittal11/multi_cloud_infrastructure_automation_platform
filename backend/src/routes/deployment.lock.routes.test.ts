import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { Role, DeploymentStatus } from '@prisma/client';

// Mock Prisma
jest.mock('../config/prisma', () => ({
  prisma: {
    deployment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

describe('Deployment Lock HTTP Routes', () => {
  const viewerToken = jwt.sign(
    { userId: 'usr-viewer', email: 'viewer@example.com', role: Role.VIEWER },
    env.JWT_SECRET,
  );

  const devToken = jwt.sign(
    { userId: 'usr-dev', email: 'dev@example.com', role: Role.DEVELOPER },
    env.JWT_SECRET,
  );

  const adminToken = jwt.sign(
    { userId: 'usr-admin', email: 'admin@example.com', role: Role.ADMIN },
    env.JWT_SECRET,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/deployments/locks/:environmentId', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/deployments/locks/env-1');
      expect(res.status).toBe(401);
    });

    it('should return lock status for DEVELOPER', async () => {
      (prisma.deployment.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/deployments/locks/env-1')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.lockStatus.isLocked).toBe(false);
    });
  });

  describe('POST /api/deployments/locks/:environmentId/force-release', () => {
    it('should reject non-admin with 403', async () => {
      const res = await request(app)
        .post('/api/deployments/locks/env-1/force-release')
        .set('Authorization', `Bearer ${devToken}`)
        .send({ confirmation: 'FORCE_UNLOCK' });

      expect(res.status).toBe(403);
    });

    it('should reject admin without explicit FORCE_UNLOCK confirmation', async () => {
      const res = await request(app)
        .post('/api/deployments/locks/env-1/force-release')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({}); // Missing confirmation

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Confirmation Required');
    });

    it('should force release lock when requested by admin with valid confirmation', async () => {
      (prisma.deployment.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'dep-hung-1',
          projectId: 'proj-1',
          environmentId: 'env-1',
          status: DeploymentStatus.RUNNING,
        },
      ]);
      (prisma.deployment.update as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post('/api/deployments/locks/env-1/force-release')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          confirmation: 'FORCE_UNLOCK',
          reason: 'Worker died unexpectedly',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.unlockedDeploymentsCount).toBe(1);
    });
  });
});
