import { prisma } from '../../config/prisma';
import { Role } from '@prisma/client';
import { maskSecret } from '../../utils/crypto';
import {
  CreateProjectInput,
  UpdateProjectInput,
  CreateEnvironmentInput,
  ProjectResponse,
  EnvironmentResponse,
} from './project.types';

export class ProjectService {
  /**
   * Creates a new project and seeds default environments (development, staging, production).
   */
  async createProject(userId: string, input: CreateProjectInput): Promise<ProjectResponse> {
    const trimmedName = input.name.trim();

    // 1. Create project in PostgreSQL
    const project = await prisma.project.create({
      data: {
        name: trimmedName,
        description: input.description?.trim() || null,
        ownerId: userId,
      },
    });

    // 2. Initialize canonical environments
    const shouldCreateDefaults = input.createDefaultEnvironments !== false;
    if (shouldCreateDefaults) {
      await prisma.environment.createMany({
        data: [
          { name: 'development', projectId: project.id },
          { name: 'staging', projectId: project.id },
          { name: 'production', projectId: project.id },
        ],
      });
    }

    // 3. Write immutable audit log
    await prisma.auditLog.create({
      data: {
        userId,
        projectId: project.id,
        action: 'PROJECT_CREATED',
        status: 'SUCCESS',
        message: `Project "${project.name}" was created with default environments`,
      },
    });

    return this.getProjectById(project.id) as Promise<ProjectResponse>;
  }

  /**
   * Lists projects. The site owner (ADMIN) sees ALL projects; every other
   * user sees only the projects they created — new users start with an
   * isolated workspace instead of inheriting someone else's inventory.
   */
  async listProjects(userId: string, role: Role): Promise<ProjectResponse[]> {
    const where = role === Role.ADMIN ? {} : { ownerId: userId };
    const projects = await prisma.project.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        environments: {
          include: {
            cloudAccount: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        cloudAccounts: true,
        _count: {
          select: { deployments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((p) => this.formatProject(p));
  }

  /**
   * Retrieves a single project by ID with full relations.
   */
  async getProjectById(id: string, userId?: string, role?: Role): Promise<ProjectResponse | null> {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        environments: {
          include: {
            cloudAccount: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        cloudAccounts: true,
        _count: {
          select: { deployments: true },
        },
      },
    });

    if (!project) return null;
    if (role && role !== Role.ADMIN && project.ownerId !== userId) {
      return null;
    }
    return this.formatProject(project);
  }

  /**
   * Updates project details (name, description).
   */
  async updateProject(id: string, userId: string, role: Role, input: UpdateProjectInput): Promise<ProjectResponse> {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      const error: any = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    if (role !== Role.ADMIN && project.ownerId !== userId) {
      const error: any = new Error('Forbidden: You can only update your own project');
      error.statusCode = 403;
      throw error;
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description.trim() || null } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        projectId: id,
        action: 'PROJECT_UPDATED',
        status: 'SUCCESS',
        message: `Project "${updated.name}" details were updated`,
      },
    });

    return this.getProjectById(id) as Promise<ProjectResponse>;
  }

  /**
   * Deletes a project and its associated environments.
   */
  async deleteProject(id: string, userId: string, role: Role): Promise<{ success: boolean; message: string }> {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        deployments: {
          where: {
            status: { in: ['QUEUED', 'RUNNING'] },
          },
        },
      },
    });

    if (!project) {
      const error: any = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    if (role !== Role.ADMIN && project.ownerId !== userId) {
      const error: any = new Error('Forbidden: You can only delete your own project');
      error.statusCode = 403;
      throw error;
    }

    if (project.deployments.length > 0) {
      const error: any = new Error(
        `Cannot delete project "${project.name}". There are ${project.deployments.length} active running deployment(s).`,
      );
      error.statusCode = 400;
      throw error;
    }

    await prisma.project.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PROJECT_DELETED',
        status: 'SUCCESS',
        message: `Project "${project.name}" and associated environments were deleted`,
        metadata: { projectId: id },
      },
    });

    return { success: true, message: `Project "${project.name}" deleted successfully` };
  }

  /**
   * Creates a new environment under a project.
   */
  async createEnvironment(
    projectId: string,
    input: CreateEnvironmentInput,
    userId?: string,
    role?: Role,
  ): Promise<EnvironmentResponse> {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      const error: any = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    if (role && role !== Role.ADMIN && project.ownerId !== userId) {
      const error: any = new Error('Forbidden: You can only add environments to your own project');
      error.statusCode = 403;
      throw error;
    }

    const normalizedName = input.name.trim().toLowerCase();

    // Verify name uniqueness within project
    const existing = await prisma.environment.findUnique({
      where: {
        projectId_name: {
          projectId,
          name: normalizedName,
        },
      },
    });

    if (existing) {
      const error: any = new Error(`Environment "${normalizedName}" already exists for this project`);
      error.statusCode = 409;
      throw error;
    }

    if (input.cloudAccountId) {
      const cloudAccount = await prisma.cloudAccount.findUnique({
        where: { id: input.cloudAccountId },
      });
      if (!cloudAccount) {
        const error: any = new Error('Specified cloud account does not exist');
        error.statusCode = 400;
        throw error;
      }
      if (role && role !== Role.ADMIN && cloudAccount.ownerId !== userId) {
        const error: any = new Error('Forbidden: You can only bind your own cloud account');
        error.statusCode = 403;
        throw error;
      }
    }

    const environment = await prisma.environment.create({
      data: {
        name: normalizedName,
        projectId,
        cloudAccountId: input.cloudAccountId || null,
      },
      include: {
        cloudAccount: true,
      },
    });

    return this.formatEnvironment(environment);
  }

  /**
   * Binds (or unbinds, when cloudAccountId is null) a cloud account on an environment.
   */
  async bindCloudAccountToEnvironment(
    environmentId: string,
    cloudAccountId: string | null,
    userId?: string,
    role?: Role,
  ): Promise<EnvironmentResponse> {
    const environment = await prisma.environment.findUnique({
      where: { id: environmentId },
      include: { project: true },
    });
    if (!environment) {
      const error: any = new Error('Environment not found');
      error.statusCode = 404;
      throw error;
    }

    if (role && role !== Role.ADMIN && environment.project.ownerId !== userId) {
      const error: any = new Error('Forbidden: You can only modify environments of your own project');
      error.statusCode = 403;
      throw error;
    }

    if (cloudAccountId !== null) {
      const cloudAccount = await prisma.cloudAccount.findUnique({ where: { id: cloudAccountId } });
      if (!cloudAccount) {
        const error: any = new Error('Cloud account not found');
        error.statusCode = 404;
        throw error;
      }
      if (role && role !== Role.ADMIN && cloudAccount.ownerId !== userId) {
        const error: any = new Error('Forbidden: You can only bind your own cloud account');
        error.statusCode = 403;
        throw error;
      }
    }

    const updated = await prisma.environment.update({
      where: { id: environmentId },
      data: { cloudAccountId },
      include: { cloudAccount: true },
    });

    return this.formatEnvironment(updated);
  }

  /**
   * Formats a project database entity into a clean client response.
   */
  private formatProject(project: any): ProjectResponse {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      ownerId: project.ownerId,
      owner: project.owner ?? null,
      environments: (project.environments || []).map((e: any) => this.formatEnvironment(e)),
      cloudAccounts: (project.cloudAccounts || []).map((ca: any) => ({
        id: ca.id,
        name: ca.name,
        provider: ca.provider,
        maskedReference: maskSecret(ca.accountReference, 4),
      })),
      deploymentsCount: project._count?.deployments || 0,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  /**
   * Formats an environment entity into a clean response.
   */
  private formatEnvironment(env: any): EnvironmentResponse {
    return {
      id: env.id,
      name: env.name,
      projectId: env.projectId,
      cloudAccountId: env.cloudAccountId,
      cloudAccount: env.cloudAccount
        ? {
            id: env.cloudAccount.id,
            name: env.cloudAccount.name,
            provider: env.cloudAccount.provider,
            maskedReference: maskSecret(env.cloudAccount.accountReference, 4),
          }
        : null,
      createdAt: env.createdAt,
      updatedAt: env.updatedAt,
    };
  }
}

export const projectService = new ProjectService();
