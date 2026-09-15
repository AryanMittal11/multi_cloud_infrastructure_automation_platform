import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { Role } from '@prisma/client';

// Mock Prisma
jest.mock('../config/prisma', () => ({
  prisma: {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    environment: {
      createMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    cloudAccount: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

describe('Project HTTP Routes', () => {
  const devToken = jwt.sign(
    { userId: 'usr-dev', email: 'dev@example.com', role: Role.DEVELOPER },
    env.JWT_SECRET,
  );

  const viewerToken = jwt.sign(
    { userId: 'usr-viewer', email: 'viewer@example.com', role: Role.VIEWER },
    env.JWT_SECRET,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/projects', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app).post('/api/projects').send({ name: 'Project X' });
      expect(res.status).toBe(401);
    });

    it('should reject VIEWER from creating projects with 403', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Project X' });

      expect(res.status).toBe(403);
    });

    it('should allow DEVELOPER to create project and return 201', async () => {
      (prisma.project.create as jest.Mock).mockResolvedValue({ id: 'proj-new', name: 'Cloud Native Stack' });
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'proj-new',
        name: 'Cloud Native Stack',
        description: null,
        ownerId: 'usr-dev',
        environments: [
          { id: 'env-1', name: 'development', projectId: 'proj-new', cloudAccountId: null, createdAt: new Date(), updatedAt: new Date() },
        ],
        cloudAccounts: [],
        _count: { deployments: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${devToken}`)
        .send({ name: 'Cloud Native Stack' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('project');
      expect(res.body.project.name).toBe('Cloud Native Stack');
    });
  });

  describe('GET /api/projects', () => {
    it('should allow DEVELOPER to list projects', async () => {
      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('projects');
    });
  });
});
