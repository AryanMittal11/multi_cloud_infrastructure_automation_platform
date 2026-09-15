import { OperationType, DeploymentStatus, Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logger } from '../../utils/logger';
import { queueService } from '../queue';
import { templateService } from '../templates';
import { resourceService } from '../resources';
import { deploymentLockManager } from './deployment.lock';
import { planParser } from './plan.parser';
import {
  CreatePlanInput,
  ApproveDeploymentInput,
  CancelDeploymentInput,
  CreateDestroyPlanInput,
  ConfirmDestroyInput,
  DeploymentResponse,
} from './deployment.types';

export class DeploymentService {
  /**
   * Submits infrastructure configuration to generate a plan.
   * Validates project/environment bindings, template schema, checks lock,
   * records deployment in PLANNING state, and dispatches PLAN job to the queue.
   */
  async createPlan(userId: string, input: CreatePlanInput): Promise<DeploymentResponse> {
    if (!input.projectId || !input.environmentId || !input.templateId) {
      const error: any = new Error('projectId, environmentId, and templateId are required');
      error.statusCode = 400;
      throw error;
    }

    // 1. Verify Project existence
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
    });
    if (!project) {
      const error: any = new Error(`Project [${input.projectId}] not found`);
      error.statusCode = 404;
      throw error;
    }

    // 2. Verify Environment existence & binding to project
    const environment = await prisma.environment.findUnique({
      where: { id: input.environmentId },
    });
    if (!environment) {
      const error: any = new Error(`Environment [${input.environmentId}] not found`);
      error.statusCode = 404;
      throw error;
    }

    if (environment.projectId !== input.projectId) {
      const error: any = new Error('Environment does not belong to the specified project');
      error.statusCode = 400;
      throw error;
    }

    if (!environment.cloudAccountId) {
      const error: any = new Error('Environment must have an associated cloud account before generating a plan');
      error.statusCode = 400;
      throw error;
    }

    // 3. Validate Configuration against Template JSONSchema
    const validation = await templateService.validateConfiguration(
      input.templateId,
      input.configuration || {},
    );

    if (!validation.valid) {
      const errorDetails = validation.errors.map((e) => `${e.field}: ${e.message}`).join(', ');
      const error: any = new Error(`Template configuration validation failed: ${errorDetails}`);
      error.statusCode = 400;
      error.errors = validation.errors;
      throw error;
    }

    // 4. Concurrency Guard: Check if environment is already locked by an active deployment
    const lockStatus = await deploymentLockManager.getLockStatus(input.environmentId);
    if (lockStatus.isLocked) {
      const error: any = new Error(
        `Environment is currently locked by active deployment [${lockStatus.activeDeployment?.id}]`,
      );
      error.statusCode = 409;
      throw error;
    }

    const finalConfig = validation.sanitizedConfiguration || input.configuration || {};
    const operationType = input.operationType || OperationType.CREATE;

    // 5. Persist Deployment record in PLANNING state
    const deployment = await prisma.deployment.create({
      data: {
        projectId: input.projectId,
        environmentId: input.environmentId,
        templateId: input.templateId,
        userId,
        operationType,
        status: DeploymentStatus.PLANNING,
        configuration: finalConfig,
      },
      include: {
        project: { select: { id: true, name: true } },
        environment: { select: { id: true, name: true, cloudAccountId: true } },
        template: { select: { id: true, name: true, provider: true, version: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // 6. Record Audit Log for plan request
    await prisma.auditLog.create({
      data: {
        userId,
        projectId: input.projectId,
        deploymentId: deployment.id,
        action: 'DEPLOYMENT_PLAN_REQUESTED',
        status: 'SUCCESS',
        message: `Plan generation requested for template "${deployment.template.name}" in environment "${deployment.environment.name}"`,
        metadata: {
          templateId: input.templateId,
          environmentId: input.environmentId,
          operationType,
        },
      },
    });

    // 7. Dispatch PLAN job to RabbitMQ queue
    await queueService.publishJob(
      {
        deploymentId: deployment.id,
        projectId: deployment.projectId,
        environmentId: deployment.environmentId,
        templateId: deployment.templateId,
        userId,
        operationType: deployment.operationType,
        action: 'PLAN',
        timestamp: new Date().toISOString(),
        attempt: 1,
        correlationId: deployment.id,
      },
      'PLAN',
    );

    logger.info(`Queued PLAN job for deployment [${deployment.id}] on env [${deployment.environmentId}]`);

    return this.formatDeploymentResponse(deployment);
  }

  /**
   * Explicit approval gate for a planned deployment.
   * Enforces that deployment is in PLANNED status, validates destructive confirmation guards,
   * checks for concurrency lock conflicts, transitions deployment status to QUEUED,
   * records an immutable audit log, and dispatches an APPLY job to the queue.
   */
  async approveDeployment(
    deploymentId: string,
    user: { userId: string; role: Role },
    input?: ApproveDeploymentInput,
  ): Promise<DeploymentResponse> {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        project: { select: { id: true, name: true } },
        environment: { select: { id: true, name: true, cloudAccountId: true } },
        template: { select: { id: true, name: true, provider: true, version: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!deployment) {
      const error: any = new Error(`Deployment [${deploymentId}] not found`);
      error.statusCode = 404;
      throw error;
    }

    // 1. Enforce PLANNED state invariant
    if (deployment.status !== DeploymentStatus.PLANNED) {
      const error: any = new Error(
        `Cannot approve deployment in status "${deployment.status}". Deployment must be in "PLANNED" status.`,
      );
      error.statusCode = 400;
      throw error;
    }

    // 2. Destructive & Production Confirmation Guard
    const planSummary = planParser.parsePlanOutput(deployment.planOutput);
    const isDestructive =
      planSummary.isDestructive || deployment.operationType === OperationType.DESTROY;
    const isProduction = deployment.environment.name.toLowerCase() === 'production';

    if (isDestructive && input?.confirmationKeyword !== 'CONFIRM_APPLY') {
      const error: any = new Error(
        'This plan contains destructive changes (resources will be destroyed or replaced). You must provide confirmationKeyword: "CONFIRM_APPLY" to proceed.',
      );
      error.statusCode = 400;
      throw error;
    }

    if (isProduction && user.role !== Role.ADMIN && input?.confirmationKeyword !== 'CONFIRM_APPLY') {
      const error: any = new Error(
        'Deploying to production requires administrator privileges or confirmationKeyword: "CONFIRM_APPLY".',
      );
      error.statusCode = 403;
      throw error;
    }

    // 3. Concurrency Guard: Check if environment is currently locked by another deployment
    const lockStatus = await deploymentLockManager.getLockStatus(deployment.environmentId);
    if (lockStatus.isLocked && lockStatus.activeDeployment?.id !== deployment.id) {
      const error: any = new Error(
        `Environment is currently locked by active deployment [${lockStatus.activeDeployment?.id}]`,
      );
      error.statusCode = 409;
      throw error;
    }

    // 4. Transition status: PLANNED -> QUEUED
    const updated = await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: DeploymentStatus.QUEUED,
      },
      include: {
        project: { select: { id: true, name: true } },
        environment: { select: { id: true, name: true, cloudAccountId: true } },
        template: { select: { id: true, name: true, provider: true, version: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // 5. Immutable Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        projectId: deployment.projectId,
        deploymentId: deployment.id,
        action: 'DEPLOYMENT_APPROVED',
        status: 'SUCCESS',
        message: `Deployment "${deployment.id}" approved by user "${user.userId}" (${user.role}) for execution in "${deployment.environment.name}"`,
        metadata: {
          toAdd: planSummary.toAdd,
          toChange: planSummary.toChange,
          toDestroy: planSummary.toDestroy,
          isDestructive,
          comment: input?.comment || null,
        },
      },
    });

    // 6. Dispatch APPLY job to RabbitMQ queue
    await queueService.publishJob(
      {
        deploymentId: deployment.id,
        projectId: deployment.projectId,
        environmentId: deployment.environmentId,
        templateId: deployment.templateId,
        userId: user.userId,
        operationType: deployment.operationType,
        action: 'APPLY',
        timestamp: new Date().toISOString(),
        attempt: 1,
        correlationId: deployment.id,
      },
      'APPLY',
    );

    logger.info(`Queued APPLY job for deployment [${deployment.id}] on env [${deployment.environmentId}]`);

    return this.formatDeploymentResponse(updated);
  }

  /**
   * Rejects or cancels a deployment in DRAFT, PLANNING, or PLANNED status.
   */
  async cancelDeployment(
    deploymentId: string,
    user: { userId: string; role: Role },
    input?: CancelDeploymentInput,
  ): Promise<DeploymentResponse> {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        project: { select: { id: true, name: true } },
        environment: { select: { id: true, name: true, cloudAccountId: true } },
        template: { select: { id: true, name: true, provider: true, version: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!deployment) {
      const error: any = new Error(`Deployment [${deploymentId}] not found`);
      error.statusCode = 404;
      throw error;
    }

    if (
      deployment.status !== DeploymentStatus.PLANNED &&
      deployment.status !== DeploymentStatus.DRAFT &&
      deployment.status !== DeploymentStatus.PLANNING
    ) {
      const error: any = new Error(
        `Cannot cancel deployment in status "${deployment.status}". Only DRAFT, PLANNING, or PLANNED deployments can be cancelled.`,
      );
      error.statusCode = 400;
      throw error;
    }

    const updated = await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: DeploymentStatus.CANCELLED,
      },
      include: {
        project: { select: { id: true, name: true } },
        environment: { select: { id: true, name: true, cloudAccountId: true } },
        template: { select: { id: true, name: true, provider: true, version: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        projectId: deployment.projectId,
        deploymentId: deployment.id,
        action: 'DEPLOYMENT_CANCELLED',
        status: 'SUCCESS',
        message: `Deployment "${deployment.id}" cancelled by user "${user.userId}". Reason: ${input?.reason || 'No reason provided'}`,
        metadata: {
          reason: input?.reason || null,
        },
      },
    });

    logger.info(`Deployment [${deployment.id}] cancelled by user [${user.userId}]`);

    return this.formatDeploymentResponse(updated);
  }

  /**
   * Generates a safe destruction preview plan (terraform plan -destroy).
   * Validates target environment, checks concurrency locks, sets status to PLANNING
   * with operationType DESTROY, and dispatches PLAN job to queue.
   */
  async createDestroyPlan(
    userId: string,
    input: CreateDestroyPlanInput,
  ): Promise<DeploymentResponse> {
    let projectId = input.projectId;
    let environmentId = input.environmentId;
    let templateId = input.templateId;
    let configuration = input.configuration || {};

    // 1. If targeting an existing deployment, infer missing context
    if (input.deploymentId) {
      const existing = await prisma.deployment.findUnique({
        where: { id: input.deploymentId },
        include: { environment: true, project: true, template: true },
      });
      if (!existing) {
        const error: any = new Error(`Target deployment [${input.deploymentId}] not found`);
        error.statusCode = 404;
        throw error;
      }
      projectId = projectId || existing.projectId;
      environmentId = environmentId || existing.environmentId;
      templateId = templateId || existing.templateId;
      configuration = Object.keys(configuration).length > 0 ? configuration : (existing.configuration as any);
    }

    if (!projectId || !environmentId || !templateId) {
      const error: any = new Error(
        'projectId, environmentId, and templateId (or target deploymentId) are required to generate destroy plan',
      );
      error.statusCode = 400;
      throw error;
    }

    // 2. Validate Project and Environment
    const environment = await prisma.environment.findUnique({
      where: { id: environmentId },
    });
    if (!environment) {
      const error: any = new Error(`Environment [${environmentId}] not found`);
      error.statusCode = 404;
      throw error;
    }

    if (environment.projectId !== projectId) {
      const error: any = new Error('Environment does not belong to the specified project');
      error.statusCode = 400;
      throw error;
    }

    // 3. Concurrency Lock Guard
    const lockStatus = await deploymentLockManager.getLockStatus(environmentId);
    if (lockStatus.isLocked) {
      const error: any = new Error(
        `Environment is currently locked by active deployment [${lockStatus.activeDeployment?.id}]`,
      );
      error.statusCode = 409;
      throw error;
    }

    // 4. Persist DESTROY deployment record in PLANNING state
    const destroyDeployment = await prisma.deployment.create({
      data: {
        projectId,
        environmentId,
        templateId,
        userId,
        operationType: OperationType.DESTROY,
        status: DeploymentStatus.PLANNING,
        configuration,
      },
      include: {
        project: { select: { id: true, name: true } },
        environment: { select: { id: true, name: true, cloudAccountId: true } },
        template: { select: { id: true, name: true, provider: true, version: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // 5. Audit Log
    await prisma.auditLog.create({
      data: {
        userId,
        projectId,
        deploymentId: destroyDeployment.id,
        action: 'DEPLOYMENT_DESTROY_PLAN_REQUESTED',
        status: 'SUCCESS',
        message: `Destruction preview requested for environment "${destroyDeployment.environment.name}"`,
        metadata: {
          templateId,
          environmentId,
          operationType: OperationType.DESTROY,
          targetDeploymentId: input.deploymentId || null,
        },
      },
    });

    // 6. Dispatch PLAN job with operationType DESTROY
    await queueService.publishJob(
      {
        deploymentId: destroyDeployment.id,
        projectId: destroyDeployment.projectId,
        environmentId: destroyDeployment.environmentId,
        templateId: destroyDeployment.templateId,
        userId,
        operationType: OperationType.DESTROY,
        action: 'PLAN',
        timestamp: new Date().toISOString(),
        attempt: 1,
        correlationId: destroyDeployment.id,
      },
      'PLAN',
    );

    logger.info(
      `Queued DESTROY PLAN job for deployment [${destroyDeployment.id}] on env [${destroyDeployment.environmentId}]`,
    );

    return this.formatDeploymentResponse(destroyDeployment);
  }

  /**
   * Explicit confirmation and execution of infrastructure destruction.
   * Enforces confirmationKeyword ("CONFIRM_DESTROY"), validates PLANNED status,
   * checks production administrator role requirements, transitions to QUEUED, and dispatches DESTROY job.
   */
  async confirmDestroy(
    deploymentId: string,
    user: { userId: string; role: Role },
    input: ConfirmDestroyInput,
  ): Promise<DeploymentResponse> {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        project: { select: { id: true, name: true } },
        environment: { select: { id: true, name: true, cloudAccountId: true } },
        template: { select: { id: true, name: true, provider: true, version: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!deployment) {
      const error: any = new Error(`Deployment [${deploymentId}] not found`);
      error.statusCode = 404;
      throw error;
    }

    if (deployment.operationType !== OperationType.DESTROY) {
      const error: any = new Error(
        `Deployment [${deploymentId}] does not have operationType DESTROY. Use approveDeployment instead.`,
      );
      error.statusCode = 400;
      throw error;
    }

    if (deployment.status !== DeploymentStatus.PLANNED) {
      const error: any = new Error(
        `Cannot execute destruction for deployment in status "${deployment.status}". Deployment must be in "PLANNED" status.`,
      );
      error.statusCode = 400;
      throw error;
    }

    // Enforce explicit confirmation keyword
    if (input.confirmationKeyword !== 'CONFIRM_DESTROY') {
      const error: any = new Error(
        'Infrastructure teardown requires explicit confirmation. You must provide confirmationKeyword: "CONFIRM_DESTROY".',
      );
      error.statusCode = 400;
      throw error;
    }

    // Production environment protection: teardown requires ADMIN
    const isProduction = deployment.environment.name.toLowerCase() === 'production';
    if (isProduction && user.role !== Role.ADMIN) {
      const error: any = new Error(
        'Tearing down production infrastructure strictly requires administrator privileges.',
      );
      error.statusCode = 403;
      throw error;
    }

    // Concurrency Lock Guard
    const lockStatus = await deploymentLockManager.getLockStatus(deployment.environmentId);
    if (lockStatus.isLocked && lockStatus.activeDeployment?.id !== deployment.id) {
      const error: any = new Error(
        `Environment is currently locked by active deployment [${lockStatus.activeDeployment?.id}]`,
      );
      error.statusCode = 409;
      throw error;
    }

    // Transition status to QUEUED
    const updated = await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: DeploymentStatus.QUEUED },
      include: {
        project: { select: { id: true, name: true } },
        environment: { select: { id: true, name: true, cloudAccountId: true } },
        template: { select: { id: true, name: true, provider: true, version: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // Immutable Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        projectId: deployment.projectId,
        deploymentId: deployment.id,
        action: 'DEPLOYMENT_DESTROY_CONFIRMED',
        status: 'SUCCESS',
        message: `Infrastructure destruction confirmed by user "${user.userId}" (${user.role}) for environment "${deployment.environment.name}"`,
        metadata: {
          comment: input.comment || null,
          environmentId: deployment.environmentId,
        },
      },
    });

    // Dispatch DESTROY job to RabbitMQ
    await queueService.publishJob(
      {
        deploymentId: deployment.id,
        projectId: deployment.projectId,
        environmentId: deployment.environmentId,
        templateId: deployment.templateId,
        userId: user.userId,
        operationType: OperationType.DESTROY,
        action: 'DESTROY',
        timestamp: new Date().toISOString(),
        attempt: 1,
        correlationId: deployment.id,
      },
      'DESTROY',
    );

    logger.info(`Queued DESTROY job for deployment [${deployment.id}] on env [${deployment.environmentId}]`);

    return this.formatDeploymentResponse(updated);
  }

  /**
   * Retrieves a deployment by ID, incorporating parsed plan output if available.
   */
  async getDeploymentById(id: string, userId?: string, role?: Role): Promise<DeploymentResponse> {
    const deployment = await prisma.deployment.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, ownerId: true } },
        environment: { select: { id: true, name: true, cloudAccountId: true } },
        template: { select: { id: true, name: true, provider: true, version: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!deployment) {
      const error: any = new Error(`Deployment [${id}] not found`);
      error.statusCode = 404;
      throw error;
    }

    if (role && role !== Role.ADMIN && deployment.project.ownerId !== userId && deployment.userId !== userId) {
      const error: any = new Error(`Deployment [${id}] not found`);
      error.statusCode = 404;
      throw error;
    }

    return this.formatDeploymentResponse(deployment);
  }

  /**
   * Lists deployments with optional filtering by project, environment, or status.
   * ADMIN sees all; DEVELOPER sees only deployments for their own projects/user.
   */
  async listDeployments(
    userId: string,
    role: Role,
    filter?: {
      projectId?: string;
      environmentId?: string;
      status?: DeploymentStatus;
    },
  ): Promise<DeploymentResponse[]> {
    const where: any = {};
    if (role !== Role.ADMIN) {
      where.project = { ownerId: userId };
    }
    if (filter?.projectId) where.projectId = filter.projectId;
    if (filter?.environmentId) where.environmentId = filter.environmentId;
    if (filter?.status) where.status = filter.status;

    const deployments = await prisma.deployment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true, ownerId: true } },
        environment: { select: { id: true, name: true, cloudAccountId: true } },
        template: { select: { id: true, name: true, provider: true, version: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return deployments.map((d) => this.formatDeploymentResponse(d));
  }

  /**
   * Retrieves all provisioned resources created by a specific deployment.
   */
  async getDeploymentResources(deploymentId: string, userId?: string, role?: Role) {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { project: true },
    });

    if (!deployment) {
      const error: any = new Error(`Deployment [${deploymentId}] not found`);
      error.statusCode = 404;
      throw error;
    }

    if (role && role !== Role.ADMIN && deployment.project.ownerId !== userId && deployment.userId !== userId) {
      const error: any = new Error(`Deployment [${deploymentId}] not found`);
      error.statusCode = 404;
      throw error;
    }

    return resourceService.getResourcesByDeployment(deploymentId);
  }

  /**
   * Retrieves execution logs and status timings for a deployment.
   */
  async getDeploymentLogs(deploymentId: string, userId?: string, role?: Role) {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { project: true },
    });

    if (!deployment) {
      const error: any = new Error(`Deployment [${deploymentId}] not found`);
      error.statusCode = 404;
      throw error;
    }

    if (role && role !== Role.ADMIN && deployment.project.ownerId !== userId && deployment.userId !== userId) {
      const error: any = new Error(`Deployment [${deploymentId}] not found`);
      error.statusCode = 404;
      throw error;
    }

    return {
      id: deployment.id,
      status: deployment.status,
      operationType: deployment.operationType,
      planOutput: deployment.planOutput,
      applyOutput: deployment.applyOutput,
      planTime: deployment.planTime,
      applyTime: deployment.applyTime,
      createdAt: deployment.createdAt,
      updatedAt: deployment.updatedAt,
    };
  }

  /**
   * Formats a deployment database model into a clean API response with parsed plan summary.
   */
  private formatDeploymentResponse(deployment: any): DeploymentResponse {
    let parsedPlanSummary = null;
    if (deployment.planOutput) {
      parsedPlanSummary = planParser.parsePlanOutput(deployment.planOutput);
    }

    return {
      id: deployment.id,
      projectId: deployment.projectId,
      environmentId: deployment.environmentId,
      templateId: deployment.templateId,
      userId: deployment.userId,
      operationType: deployment.operationType,
      status: deployment.status,
      configuration: deployment.configuration,
      planOutput: deployment.planOutput,
      parsedPlanSummary,
      applyOutput: deployment.applyOutput,
      costEstimate: deployment.costEstimate,
      policyEvaluation: deployment.policyEvaluation,
      planTime: deployment.planTime,
      applyTime: deployment.applyTime,
      createdAt: deployment.createdAt,
      updatedAt: deployment.updatedAt,
      project: deployment.project,
      environment: deployment.environment,
      template: deployment.template,
      user: deployment.user,
    };
  }
}

export const deploymentService = new DeploymentService();
