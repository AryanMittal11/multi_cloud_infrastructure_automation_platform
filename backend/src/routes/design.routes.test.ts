import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app';
import { designService } from '../services/designs';
import { env } from '../config/env';
import { Role } from '@prisma/client';

jest.mock('../services/designs', () => {
  const actual = jest.requireActual('../services/designs');
  return {
    ...actual,
    designService: {
      listDesigns: jest.fn(),
      getDesignById: jest.fn(),
      createDesign: jest.fn(),
      updateDesign: jest.fn(),
      deleteDesign: jest.fn(),
      deployDesign: jest.fn(),
    },
  };
});

describe('Design HTTP Routes', () => {
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

  describe('GET /api/designs', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/designs');
      expect(res.status).toBe(401);
    });

    it('should list designs for authenticated developer', async () => {
      (designService.listDesigns as jest.Mock).mockResolvedValue([
        { id: 'des-1', name: 'My Stack', cloudProvider: 'AWS', nodeCount: 2, edgeCount: 1 },
      ]);

      const res = await request(app)
        .get('/api/designs')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.designs).toHaveLength(1);
      expect(res.body.designs[0].name).toBe('My Stack');
    });
  });

  describe('POST /api/designs/:id/deploy', () => {
    const validDeployPayload = {
      projectId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      environmentId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      configuration: {},
    };

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app)
        .post('/api/designs/des-123/deploy')
        .send(validDeployPayload);

      expect(res.status).toBe(401);
    });

    it('should reject VIEWER from deploying with 403', async () => {
      const res = await request(app)
        .post('/api/designs/des-123/deploy')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(validDeployPayload);

      expect(res.status).toBe(403);
    });

    it('should validate UUIDs for projectId and environmentId', async () => {
      const res = await request(app)
        .post('/api/designs/des-123/deploy')
        .set('Authorization', `Bearer ${devToken}`)
        .send({ projectId: 'invalid', environmentId: 'invalid' });

      expect(res.status).toBe(400);
    });

    it('should successfully dispatch plan for visual design', async () => {
      (designService.deployDesign as jest.Mock).mockResolvedValue({
        deployment: {
          id: 'dep-new-design-1',
          status: 'PLANNING',
          templateId: 'tmpl-design-1',
        },
        template: {
          id: 'tmpl-design-1',
          name: 'Design: My Stack',
        },
        message: 'Plan generation initiated successfully for design "My Stack"',
      });

      const res = await request(app)
        .post('/api/designs/des-123/deploy')
        .set('Authorization', `Bearer ${devToken}`)
        .send(validDeployPayload);

      expect(res.status).toBe(202);
      expect(res.body.deployment.id).toBe('dep-new-design-1');
      expect(designService.deployDesign).toHaveBeenCalledWith(
        'usr-dev',
        Role.DEVELOPER,
        'des-123',
        expect.objectContaining({
          projectId: validDeployPayload.projectId,
          environmentId: validDeployPayload.environmentId,
        }),
      );
    });
  });
});
