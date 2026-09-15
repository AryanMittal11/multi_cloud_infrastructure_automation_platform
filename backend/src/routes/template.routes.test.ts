import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { Role, Provider } from '@prisma/client';

// Mock Prisma
jest.mock('../config/prisma', () => ({
  prisma: {
    template: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('Template HTTP Routes', () => {
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

  describe('GET /api/templates', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/templates');
      expect(res.status).toBe(401);
    });

    it('should allow DEVELOPER to list templates', async () => {
      (prisma.template.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'tmpl-1',
          name: 'AWS EC2 Web Server',
          provider: Provider.AWS,
          version: '1.0.0',
          description: 'Web Server',
          templateReference: 'templates/aws/aws_ec2_web',
          inputSchema: { type: 'object', properties: {} },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await request(app)
        .get('/api/templates')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.templates).toHaveLength(1);
    });
  });

  describe('POST /api/templates/:id/validate', () => {
    it('should validate valid configuration and return 200', async () => {
      (prisma.template.findUnique as jest.Mock).mockResolvedValue({
        id: 'tmpl-1',
        name: 'AWS EC2 Web Server',
        inputSchema: {
          type: 'object',
          required: ['server_name'],
          properties: {
            server_name: { type: 'string' },
            instance_type: { type: 'string', default: 't3.micro' },
          },
        },
      });

      const res = await request(app)
        .post('/api/templates/tmpl-1/validate')
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          configuration: {
            server_name: 'frontend-app',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.sanitizedConfiguration.instance_type).toBe('t3.micro');
    });

    it('should return 400 when validation fails', async () => {
      (prisma.template.findUnique as jest.Mock).mockResolvedValue({
        id: 'tmpl-1',
        name: 'AWS EC2 Web Server',
        inputSchema: {
          type: 'object',
          required: ['server_name'],
          properties: {
            server_name: { type: 'string' },
          },
        },
      });

      const res = await request(app)
        .post('/api/templates/tmpl-1/validate')
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          configuration: {}, // Missing required server_name
        });

      expect(res.status).toBe(400);
      expect(res.body.valid).toBe(false);
      expect(res.body.errors).toHaveLength(1);
    });
  });

  describe('POST /api/templates/sync', () => {
    it('should reject non-admin users with 403', async () => {
      const res = await request(app)
        .post('/api/templates/sync')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });
  });
});
