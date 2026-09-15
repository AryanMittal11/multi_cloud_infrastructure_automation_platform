import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app';
import { deploymentService } from '../services/deployments';
import { env } from '../config/env';
import { Role, DeploymentStatus, OperationType } from '@prisma/client';

// Mock deploymentService
jest.mock('../services/deployments', () => {
  const actual = jest.requireActual('../services/deployments');
  return {
    ...actual,
    deploymentService: {
      createPlan: jest.fn(),
      getDeploymentById: jest.fn(),
      listDeployments: jest.fn(),
      approveDeployment: jest.fn(),
      cancelDeployment: jest.fn(),
      getDeploymentResources: jest.fn(),
      getDeploymentLogs: jest.fn(),
      createDestroyPlan: jest.fn(),
      confirmDestroy: jest.fn(),
    },
  };
});

describe('Deployment HTTP Routes', () => {
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

  describe('POST /api/deployments/plan', () => {
    const validPayload = {
      projectId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      environmentId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      templateId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
      configuration: { vpc_cidr: '10.0.0.0/16' },
    };

    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app).post('/api/deployments/plan').send(validPayload);
      expect(res.status).toBe(401);
    });

    it('should reject VIEWER from initiating a plan with 403', async () => {
      const res = await request(app)
        .post('/api/deployments/plan')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(validPayload);

      expect(res.status).toBe(403);
    });

    it('should reject invalid UUIDs with 400 validation error', async () => {
      const res = await request(app)
        .post('/api/deployments/plan')
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          projectId: 'not-a-uuid',
          environmentId: 'invalid-uuid',
          templateId: 'also-invalid',
          configuration: {},
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
    });

    it('should accept valid plan request with 202 Accepted', async () => {
      const mockResponse = {
        id: 'dep-100',
        projectId: validPayload.projectId,
        environmentId: validPayload.environmentId,
        templateId: validPayload.templateId,
        status: DeploymentStatus.PLANNING,
        operationType: OperationType.CREATE,
      };

      (deploymentService.createPlan as jest.Mock).mockResolvedValue(mockResponse);

      const res = await request(app)
        .post('/api/deployments/plan')
        .set('Authorization', `Bearer ${devToken}`)
        .send(validPayload);

      expect(res.status).toBe(202);
      expect(res.body.message).toBe('Plan generation initiated successfully');
      expect(res.body.deployment.id).toBe('dep-100');
      expect(res.body.deployment.status).toBe(DeploymentStatus.PLANNING);
    });
  });

  describe('GET /api/deployments/:id', () => {
    it('should reject VIEWER from fetching deployment details with 403', async () => {
      const res = await request(app)
        .get('/api/deployments/dep-100')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow DEVELOPER to fetch deployment details with 200', async () => {
      const mockDeployment = {
        id: 'dep-100',
        status: DeploymentStatus.PLANNED,
        parsedPlanSummary: { toAdd: 2, toChange: 0, toDestroy: 0, isDestructive: false },
      };

      (deploymentService.getDeploymentById as jest.Mock).mockResolvedValue(mockDeployment);

      const res = await request(app)
        .get('/api/deployments/dep-100')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.deployment.id).toBe('dep-100');
      expect(res.body.deployment.parsedPlanSummary.toAdd).toBe(2);
    });

    it('should return 404 when deployment is not found', async () => {
      const error: any = new Error('Deployment not found');
      error.statusCode = 404;
      (deploymentService.getDeploymentById as jest.Mock).mockRejectedValue(error);

      const res = await request(app)
        .get('/api/deployments/non-existent')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/deployments', () => {
    it('should list deployments with 200 OK', async () => {
      (deploymentService.listDeployments as jest.Mock).mockResolvedValue([
        { id: 'dep-1' },
        { id: 'dep-2' },
      ]);

      const res = await request(app)
        .get('/api/deployments')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.deployments).toHaveLength(2);
    });
  });

  describe('POST /api/deployments/:id/approve', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).post('/api/deployments/dep-1/approve').send({});
      expect(res.status).toBe(401);
    });

    it('should reject VIEWER from approving deployment with 403', async () => {
      const res = await request(app)
        .post('/api/deployments/dep-1/approve')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({});

      expect(res.status).toBe(403);
    });

    it('should allow DEVELOPER to approve deployment with 200', async () => {
      (deploymentService.approveDeployment as jest.Mock).mockResolvedValue({
        id: 'dep-1',
        status: DeploymentStatus.QUEUED,
      });

      const res = await request(app)
        .post('/api/deployments/dep-1/approve')
        .set('Authorization', `Bearer ${devToken}`)
        .send({ comment: 'Approved for launch' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('approved and queued for apply');
      expect(res.body.deployment.status).toBe(DeploymentStatus.QUEUED);
    });
  });

  describe('POST /api/deployments/:id/cancel', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).post('/api/deployments/dep-1/cancel').send({});
      expect(res.status).toBe(401);
    });

    it('should reject VIEWER from cancelling deployment with 403', async () => {
      const res = await request(app)
        .post('/api/deployments/dep-1/cancel')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({});

      expect(res.status).toBe(403);
    });

    it('should allow DEVELOPER to cancel deployment with 200', async () => {
      (deploymentService.cancelDeployment as jest.Mock).mockResolvedValue({
        id: 'dep-1',
        status: DeploymentStatus.CANCELLED,
      });

      const res = await request(app)
        .post('/api/deployments/dep-1/cancel')
        .set('Authorization', `Bearer ${devToken}`)
        .send({ reason: 'Changed mind' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('cancelled successfully');
      expect(res.body.deployment.status).toBe(DeploymentStatus.CANCELLED);
    });
  });

  describe('GET /api/deployments/:id/resources', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/deployments/dep-1/resources');
      expect(res.status).toBe(401);
    });

    it('should reject VIEWER from fetching deployment resources with 403', async () => {
      const res = await request(app)
        .get('/api/deployments/dep-1/resources')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow DEVELOPER to fetch deployment resources with 200', async () => {
      (deploymentService.getDeploymentResources as jest.Mock).mockResolvedValue([
        { id: 'res-1', resourceType: 'aws_vpc' },
      ]);

      const res = await request(app)
        .get('/api/deployments/dep-1/resources')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.resources).toHaveLength(1);
    });
  });

  describe('GET /api/deployments/:id/logs', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/deployments/dep-1/logs');
      expect(res.status).toBe(401);
    });

    it('should allow DEVELOPER to fetch deployment logs with 200', async () => {
      (deploymentService.getDeploymentLogs as jest.Mock).mockResolvedValue({
        id: 'dep-1',
        status: DeploymentStatus.SUCCEEDED,
        applyOutput: 'Apply succeeded!',
      });

      const res = await request(app)
        .get('/api/deployments/dep-1/logs')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.logs.applyOutput).toBe('Apply succeeded!');
    });
  });

  describe('POST /api/deployments/destroy-plan', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).post('/api/deployments/destroy-plan').send({});
      expect(res.status).toBe(401);
    });

    it('should reject VIEWER with 403', async () => {
      const res = await request(app)
        .post('/api/deployments/destroy-plan')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({});

      expect(res.status).toBe(403);
    });

    it('should allow DEVELOPER to initiate destroy plan with 202', async () => {
      (deploymentService.createDestroyPlan as jest.Mock).mockResolvedValue({
        id: 'dep-destroy-1',
        operationType: OperationType.DESTROY,
        status: DeploymentStatus.PLANNING,
      });

      const res = await request(app)
        .post('/api/deployments/destroy-plan')
        .set('Authorization', `Bearer ${devToken}`)
        .send({});

      expect(res.status).toBe(202);
      expect(res.body.deployment.operationType).toBe(OperationType.DESTROY);
    });
  });

  describe('POST /api/deployments/:id/confirm-destroy', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app)
        .post('/api/deployments/dep-1/confirm-destroy')
        .send({ confirmationKeyword: 'CONFIRM_DESTROY' });
      expect(res.status).toBe(401);
    });

    it('should reject VIEWER with 403', async () => {
      const res = await request(app)
        .post('/api/deployments/dep-1/confirm-destroy')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ confirmationKeyword: 'CONFIRM_DESTROY' });

      expect(res.status).toBe(403);
    });

    it('should reject request missing confirmationKeyword with 400', async () => {
      const res = await request(app)
        .post('/api/deployments/dep-1/confirm-destroy')
        .set('Authorization', `Bearer ${devToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should allow DEVELOPER to confirm destruction with 200', async () => {
      (deploymentService.confirmDestroy as jest.Mock).mockResolvedValue({
        id: 'dep-1',
        operationType: OperationType.DESTROY,
        status: DeploymentStatus.QUEUED,
      });

      const res = await request(app)
        .post('/api/deployments/dep-1/confirm-destroy')
        .set('Authorization', `Bearer ${devToken}`)
        .send({ confirmationKeyword: 'CONFIRM_DESTROY', comment: 'Retiring infra' });

      expect(res.status).toBe(200);
      expect(res.body.deployment.status).toBe(DeploymentStatus.QUEUED);
    });
  });
});
