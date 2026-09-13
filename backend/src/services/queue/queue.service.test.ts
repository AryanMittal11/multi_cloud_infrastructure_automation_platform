import { QueueService } from './queue.service';
import { ROUTING_KEYS } from './queue.constants';
import { DeploymentJobMessage, DeploymentEventMessage } from './queue.types';
import { OperationType, DeploymentStatus } from '@prisma/client';

describe('QueueService Architecture & Message Broker', () => {
  let queueService: QueueService;

  beforeEach(() => {
    queueService = new QueueService();
  });

  afterEach(async () => {
    await queueService.closeConnection();
  });

  describe('Fallback In-Memory Job & Event Dispatch', () => {
    it('should initialize and report healthy fallback status when broker is offline', async () => {
      await queueService.initialize();
      const status = await queueService.getStatus();

      expect(status).toBeDefined();
      expect(status.mode).toBe('in-memory-fallback');
      expect(status.jobsQueueCount).toBe(0);
    });

    it('should dispatch and consume a deployment job with explicit ACK', (done) => {
      const mockJob: DeploymentJobMessage = {
        deploymentId: 'dep-test-123',
        projectId: 'proj-1',
        environmentId: 'env-dev',
        templateId: 'tmpl-aws-vpc',
        userId: 'usr-admin',
        operationType: OperationType.CREATE,
        action: 'APPLY',
        timestamp: new Date().toISOString(),
        attempt: 1,
      };

      queueService.consumeJobs(async (job, ack) => {
        try {
          expect(job.deploymentId).toBe('dep-test-123');
          expect(job.action).toBe('APPLY');
          expect(job.operationType).toBe(OperationType.CREATE);
          ack();
          done();
        } catch (err) {
          done(err);
        }
      });

      queueService.publishJob(mockJob, 'APPLY');
    });

    it('should dispatch and consume worker execution events', (done) => {
      const mockEvent: DeploymentEventMessage = {
        deploymentId: 'dep-event-456',
        eventType: 'LOG_CHUNK',
        status: DeploymentStatus.RUNNING,
        timestamp: new Date().toISOString(),
        payload: {
          logChunk: 'aws_vpc.main: Creating...',
        },
      };

      queueService.consumeEvents(async (event, ack) => {
        try {
          expect(event.deploymentId).toBe('dep-event-456');
          expect(event.eventType).toBe('LOG_CHUNK');
          expect(event.payload.logChunk).toContain('aws_vpc.main');
          ack();
          done();
        } catch (err) {
          done(err);
        }
      });

      queueService.publishEvent(mockEvent);
    });
  });

  describe('Routing Key Architecture', () => {
    it('should define correct routing keys for all canonical actions', () => {
      expect(ROUTING_KEYS.JOB_PLAN).toBe('deployment.job.plan');
      expect(ROUTING_KEYS.JOB_APPLY).toBe('deployment.job.apply');
      expect(ROUTING_KEYS.JOB_DESTROY).toBe('deployment.job.destroy');
      expect(ROUTING_KEYS.EVENT_LOG).toBe('deployment.event.log');
      expect(ROUTING_KEYS.EVENT_COMPLETED).toBe('deployment.event.completed');
      expect(ROUTING_KEYS.EVENT_FAILED).toBe('deployment.event.failed');
    });
  });
});
