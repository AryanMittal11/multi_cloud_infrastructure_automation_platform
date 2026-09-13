import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app';
import { resourceService } from '../services/resources';
import { env } from '../config/env';
import { Role } from '@prisma/client';

jest.mock('../services/resources', () => ({
  resourceService: {
    listResources: jest.fn(),
    getResourceById: jest.fn(),
  },
}));

describe('Resource HTTP Routes', () => {
  const viewerToken = jwt.sign(
    { userId: 'usr-viewer', email: 'viewer@example.com', role: Role.VIEWER },
    env.JWT_SECRET,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/resources', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/resources');
      expect(res.status).toBe(401);
    });

    it('should allow VIEWER to list resources with 200', async () => {
      (resourceService.listResources as jest.Mock).mockResolvedValue([
        { id: 'res-1', resourceType: 'aws_vpc', name: 'main' },
        { id: 'res-2', resourceType: 'aws_subnet', name: 'public' },
      ]);

      const res = await request(app)
        .get('/api/resources')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.resources).toHaveLength(2);
    });
  });

  describe('GET /api/resources/:id', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/resources/res-1');
      expect(res.status).toBe(401);
    });

    it('should return 200 with resource details', async () => {
      (resourceService.getResourceById as jest.Mock).mockResolvedValue({
        id: 'res-1',
        resourceType: 'aws_vpc',
        providerResourceId: 'vpc-12345',
      });

      const res = await request(app)
        .get('/api/resources/res-1')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.resource.id).toBe('res-1');
    });

    it('should return 404 when resource is not found', async () => {
      (resourceService.getResourceById as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/resources/non-existent')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(404);
    });
  });
});
