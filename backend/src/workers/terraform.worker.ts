import { prisma } from '../config/prisma';
import { queueService } from '../services/queue';
import { cloudService } from '../services/cloud';
import { workspaceManager } from '../services/terraform/workspace.manager';
import { terraformRunner } from '../services/terraform/terraform.runner';
import { stateParser } from '../services/terraform/state.parser';
import { resourceService } from '../services/resources/resource.service';
import { deploymentLockManager } from '../services/deployments/deployment.lock';
import { DeploymentJobMessage } from '../services/queue/queue.types';
import { logger } from '../utils/logger';
import { DeploymentStatus, Provider } from '@prisma/client';

export class TerraformWorkerService {
  private isRunning: boolean = false;

  /**
   * Starts the worker, connecting to RabbitMQ and consuming deployment jobs.
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info('🚀 Initializing Terraform Provisioning Worker Service...');

    await queueService.consumeJobs(async (job, ack, nack) => {
      logger.info(`Processing job for deployment [${job.deploymentId}] (Action: ${job.action})`);
      try {
        await this.handleJob(job);
        ack(); // Explicitly acknowledge successful execution
      } catch (err: any) {
        logger.error(`Fatal error executing deployment job [${job.deploymentId}]: ${err.message}`, err);
        // Do not requeue poisoned job; it is routed to DLQ or recorded as FAILED
        nack(false);
      }
    });

    logger.info('👷 Terraform Worker successfully subscribed and waiting for deployment jobs.');
  }

  /**
   * Authoritative execution pipeline for a single deployment job.
   */
  async handleJob(job: DeploymentJobMessage): Promise<void> {
    const startTime = Date.now();
    let accumulatedLogs = '';

    // 1. Fetch Authoritative Deployment Record
    const deployment = await prisma.deployment.findUnique({
      where: { id: job.deploymentId },
      include: {
        environment: {
          include: { cloudAccount: true },
        },
        template: true,
        project: true,
      },
    });

    if (!deployment) {
      logger.error(`Deployment record [${job.deploymentId}] not found in database. Aborting job.`);
      return;
    }

    // 2. Acquire Concurrency Lock
    try {
      await deploymentLockManager.acquireLock(job.projectId, job.environmentId, job.deploymentId);
    } catch (lockErr: any) {
      logger.error(`Lock acquisition failed for deployment [${job.deploymentId}]: ${lockErr.message}`);
      await this.markDeploymentFailed(job.deploymentId, lockErr.message);
      return;
    }

    // 3. Transition to RUNNING state & emit STARTED event
    await prisma.deployment.update({
      where: { id: job.deploymentId },
      data: { status: DeploymentStatus.RUNNING },
    });

    await queueService.publishEvent({
      deploymentId: job.deploymentId,
      eventType: 'STARTED',
      status: DeploymentStatus.RUNNING,
      timestamp: new Date().toISOString(),
      payload: { action: job.action, operationType: job.operationType },
    });

    try {
      // 4. Resolve & Decrypt Cloud Account Credentials
      let envVars: Record<string, string> = {};
      let cloudRegion = 'us-east-1';

      if (deployment.environment.cloudAccountId) {
        const credentials: any = await cloudService.getDecryptedCredentials(
          deployment.environment.cloudAccountId,
        );

        if (credentials.accessKeyId && credentials.secretAccessKey) {
          envVars = {
            AWS_ACCESS_KEY_ID: credentials.accessKeyId,
            AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
            AWS_DEFAULT_REGION: credentials.defaultRegion || 'us-east-1',
          };
          if (credentials.sessionToken) {
            envVars.AWS_SESSION_TOKEN = credentials.sessionToken;
          }
          cloudRegion = credentials.defaultRegion || 'us-east-1';
        }
      }

      // 5. Prepare Isolated Workspace Directory
      const workspaceDir = await workspaceManager.prepareWorkspace({
        deploymentId: job.deploymentId,
        templateReference: deployment.template.templateReference,
        configuration: (deployment.configuration as Record<string, any>) || {},
        cloudCredentials: envVars,
        region: cloudRegion,
      });

      // Streaming log chunk collector
      const onLogChunk = (chunk: string) => {
        accumulatedLogs += chunk;
        queueService.publishEvent({
          deploymentId: job.deploymentId,
          eventType: 'LOG_CHUNK',
          status: DeploymentStatus.RUNNING,
          timestamp: new Date().toISOString(),
          payload: { logChunk: chunk },
        });
      };

      const execOptions = {
        workspaceDir,
        envVars,
        onLogChunk,
      };

      // 6. Execute Terraform Action
      if (job.action === 'PLAN') {
        logger.info(`Executing Terraform PLAN for deployment [${job.deploymentId}]`);
        await terraformRunner.init(execOptions);
        const planResult = await terraformRunner.plan(execOptions);

        if (!planResult.success) {
          throw new Error(`Terraform plan failed with exit code ${planResult.exitCode}`);
        }

        await prisma.deployment.update({
          where: { id: job.deploymentId },
          data: {
            status: DeploymentStatus.PLANNED,
            planOutput: accumulatedLogs,
            planTime: new Date(),
          },
        });

        await queueService.publishEvent({
          deploymentId: job.deploymentId,
          eventType: 'COMPLETED',
          status: DeploymentStatus.PLANNED,
          timestamp: new Date().toISOString(),
          payload: { durationMs: Date.now() - startTime },
        });
      } else if (job.action === 'APPLY') {
        logger.info(`Executing Terraform APPLY for deployment [${job.deploymentId}]`);
        await terraformRunner.init(execOptions);
        const applyResult = await terraformRunner.apply(execOptions);

        if (!applyResult.success) {
          throw new Error(`Terraform apply failed with exit code ${applyResult.exitCode}`);
        }

        // 7. Parse State & Record Created Resources
        const parsedState = stateParser.parseWorkspaceState(workspaceDir);
        await resourceService.recordProvisionedResources(
          job.deploymentId,
          deployment.template.provider || Provider.AWS,
          parsedState.resources,
        );

        await prisma.deployment.update({
          where: { id: job.deploymentId },
          data: {
            status: DeploymentStatus.SUCCEEDED,
            applyOutput: accumulatedLogs,
            applyTime: new Date(),
          },
        });

        await prisma.auditLog.create({
          data: {
            userId: job.userId,
            projectId: job.projectId,
            deploymentId: job.deploymentId,
            action: 'DEPLOYMENT_APPLY_SUCCEEDED',
            status: 'SUCCESS',
            message: `Deployment "${job.deploymentId}" (${job.operationType}) successfully provisioned`,
            metadata: { durationMs: Date.now() - startTime, resourceCount: parsedState.resources.length },
          },
        });

        await queueService.publishEvent({
          deploymentId: job.deploymentId,
          eventType: 'COMPLETED',
          status: DeploymentStatus.SUCCEEDED,
          timestamp: new Date().toISOString(),
          payload: {
            outputs: parsedState.outputs,
            resourcesCount: parsedState.resources.length,
            durationMs: Date.now() - startTime,
          },
        });
      } else if (job.action === 'DESTROY') {
        logger.info(`Executing Terraform DESTROY for deployment [${job.deploymentId}]`);
        await terraformRunner.init(execOptions);
        const destroyResult = await terraformRunner.destroy(execOptions);

        if (!destroyResult.success) {
          throw new Error(`Terraform destroy failed with exit code ${destroyResult.exitCode}`);
        }

        // Mark resources as destroyed
        await resourceService.markResourcesDestroyed(job.deploymentId);

        await prisma.deployment.update({
          where: { id: job.deploymentId },
          data: {
            status: DeploymentStatus.SUCCEEDED,
            applyOutput: accumulatedLogs,
          },
        });

        await prisma.auditLog.create({
          data: {
            userId: job.userId,
            projectId: job.projectId,
            deploymentId: job.deploymentId,
            action: 'DEPLOYMENT_DESTROY_SUCCEEDED',
            status: 'SUCCESS',
            message: `Infrastructure for deployment "${job.deploymentId}" was successfully destroyed`,
          },
        });

        await queueService.publishEvent({
          deploymentId: job.deploymentId,
          eventType: 'COMPLETED',
          status: DeploymentStatus.SUCCEEDED,
          timestamp: new Date().toISOString(),
          payload: { durationMs: Date.now() - startTime },
        });
      }
    } catch (err: any) {
      logger.error(`Deployment execution error [${job.deploymentId}]: ${err.message}`);
      await this.markDeploymentFailed(job.deploymentId, err.message, accumulatedLogs);

      await queueService.publishEvent({
        deploymentId: job.deploymentId,
        eventType: 'FAILED',
        status: DeploymentStatus.FAILED,
        timestamp: new Date().toISOString(),
        payload: { error: err.message, durationMs: Date.now() - startTime },
      });
    } finally {
      // 8. Always release deployment lock
      await deploymentLockManager.releaseLock(job.deploymentId);
    }
  }

  private async markDeploymentFailed(
    deploymentId: string,
    errorMessage: string,
    logs: string = '',
  ): Promise<void> {
    try {
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: DeploymentStatus.FAILED,
          applyOutput: `${logs}\n\n[FATAL EXECUTION FAILURE]: ${errorMessage}`.trim(),
        },
      });

      await prisma.auditLog.create({
        data: {
          deploymentId,
          action: 'DEPLOYMENT_EXECUTION_FAILED',
          status: 'FAILURE',
          message: `Deployment failed: ${errorMessage}`,
        },
      });
    } catch (err) {
      logger.error(`Failed to update deployment failure status in database:`, err);
    }
  }
}

export const terraformWorker = new TerraformWorkerService();

// Standalone execution entrypoint
if (require.main === module) {
  terraformWorker
    .start()
    .catch((err) => {
      logger.error('Fatal crash in Terraform Worker process:', err);
      process.exit(1);
    });
}
