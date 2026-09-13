import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { Role, Provider } from '@prisma/client';

// Mock Prisma
jest.mock('../config/prisma', () => ({
  prisma: {
    cloudAccount: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

describe('Cloud Account HTTP Routes', () => {
  const adminToken = jwt.sign(
    { userId: 'usr-admin', email: 'admin@example.com', role: Role.ADMIN },
    env.JWT_SECRET,
  );

  const devToken = jwt.sign(
    { userId: 'usr-dev', email: 'dev@example.com', role: Role.DEVELOPER },
    env.JWT_SECRET,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/cloud-accounts', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).post('/api/cloud-accounts').send({});
      expect(res.status).toBe(401);
    });

    it('should reject DEVELOPER role with 403 (Only ADMIN can onboard accounts)', async () => {
      const res = await request(app)
        .post('/api/cloud-accounts')
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          name: 'AWS Account',
          provider: Provider.AWS,
          credentials: { accessKeyId: 'AKIA_MOCK_1234567890', secretAccessKey: 'mockSecretAccessKey!' },
        });

      expect(res.status).toBe(403);
    });

    it('should allow ADMIN to onboard cloud account', async () => {
      (prisma.cloudAccount.create as jest.Mock).mockResolvedValue({
        id: 'acc-aws-1',
        name: 'AWS Prod',
        provider: Provider.AWS,
        accountReference: '123456789012',
        encryptedCredentialReference: 'iv:tag:cipher',
        ownerId: 'usr-admin',
        projectId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/cloud-accounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'AWS Prod',
          provider: Provider.AWS,
          credentials: { accessKeyId: 'AKIA_MOCK_1234567890', secretAccessKey: 'mockSecretAccessKeyOver16Chars!' },
          skipValidation: true,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('cloudAccount');
      expect(res.body.cloudAccount.name).toBe('AWS Prod');
      expect(res.body.cloudAccount.encryptedCredentialReference).toBeUndefined();
    });
  });

  describe('GET /api/cloud-accounts', () => {
    it('should allow authenticated users to list accounts', async () => {
      (prisma.cloudAccount.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'acc-1',
          name: 'AWS Dev',
          provider: Provider.AWS,
          accountReference: '123456789012',
          ownerId: 'usr-admin',
          projectId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await request(app)
        .get('/api/cloud-accounts')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.cloudAccounts).toHaveLength(1);
      expect(res.body.cloudAccounts[0].maskedAccountReference).toBeDefined();
    });
  });

  describe('DELETE /api/cloud-accounts/:id', () => {
    it('should require ADMIN role and explicit confirmation header/body', async () => {
      const res = await request(app)
        .delete('/api/cloud-accounts/acc-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({}); // Missing confirmation

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Confirmation Required');
    });
  });
});
