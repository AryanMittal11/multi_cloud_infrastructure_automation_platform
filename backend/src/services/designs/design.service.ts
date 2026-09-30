import fs from 'fs';
import path from 'path';
import { prisma } from '../../config/prisma';
import { Provider, Role } from '@prisma/client';
import { logger } from '../../utils/logger';
import { generateDesignTerraform } from './design.generator';
import { deploymentService } from '../deployments';

export interface DesignNodeInput {
  id: string;
  kind: string;
  position: { x: number; y: number };
  data: {
    kind: string;
    label: string;
    provider: string;
    templateRef: string;
    config: Record<string, any>;
    monthlyCost?: number;
    notes?: string;
  };
}

export interface DesignEdgeInput {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface DesignInput {
  name: string;
  description?: string;
  cloudProvider?: string;
  nodes: DesignNodeInput[];
  edges: DesignEdgeInput[];
}

export interface DeployDesignInput {
  projectId: string;
  environmentId: string;
  configuration?: Record<string, any>;
  name?: string;
  description?: string;
  cloudProvider?: string;
  nodes?: DesignNodeInput[];
  edges?: DesignEdgeInput[];
}

export class DesignService {
  private templatesRootDir: string;

  constructor(templatesRootDir?: string) {
    this.templatesRootDir =
      templatesRootDir || path.resolve(__dirname, '../../../templates');
  }

  /**
   * Lists designs. Admin (site owner) sees ALL designs; others see only their own.
   */
  async listDesigns(userId: string, role: Role) {
    const where = role === Role.ADMIN ? {} : { ownerId: userId };
    const designs = await prisma.architectureDesign.findMany({
      where,
      include: { owner: { select: { id: true, name: true, email: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    return designs.map((d) => this.formatDesignSummary(d));
  }

  /**
   * Retrieves a single design by ID with full canvas state.
   * Admin can access any design; others only their own.
   */
  async getDesignById(id: string, userId: string, role: Role) {
    const design = await prisma.architectureDesign.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });

    if (!design || (role !== Role.ADMIN && design.ownerId !== userId)) {
      const error: any = new Error('Design not found');
      error.statusCode = 404;
      throw error;
    }

    return {
      id: design.id,
      name: design.name,
      description: design.description,
      cloudProvider: design.cloudProvider,
      nodes: (design.nodes as unknown as DesignNodeInput[]) || [],
      edges: (design.edges as unknown as DesignEdgeInput[]) || [],
      owner: design.owner,
      createdAt: design.createdAt,
      updatedAt: design.updatedAt,
    };
  }

  /**
   * Creates a new visual architecture design.
   */
  async createDesign(userId: string, input: DesignInput) {
    if (!input.name || !input.name.trim()) {
      const error: any = new Error('Design name is required');
      error.statusCode = 400;
      throw error;
    }

    const design = await prisma.architectureDesign.create({
      data: {
        name: input.name.trim(),
        description: input.description || null,
        cloudProvider: input.cloudProvider || 'AWS',
        ownerId: userId,
        nodes: (input.nodes || []) as any,
        edges: (input.edges || []) as any,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DESIGN_CREATED',
        status: 'SUCCESS',
        message: `Architecture design "${design.name}" created (${(input.nodes || []).length} resources)`,
        metadata: { designId: design.id, cloudProvider: design.cloudProvider },
      },
    });

    logger.info(`Design [${design.id}] created by user [${userId}]`);
    return design;
  }

  /**
   * Updates an existing design (rename, re-provider, canvas state).
   * Admin can update any design; others only their own.
   */
  async updateDesign(id: string, userId: string, role: Role, input: Partial<DesignInput>) {
    const existing = await prisma.architectureDesign.findUnique({ where: { id } });

    if (!existing || (role !== Role.ADMIN && existing.ownerId !== userId)) {
      const error: any = new Error('Design not found');
      error.statusCode = 404;
      throw error;
    }

    const design = await prisma.architectureDesign.update({
      where: { id },
      data: {
        name: input.name?.trim() || existing.name,
        description: input.description ?? existing.description,
        cloudProvider: input.cloudProvider || existing.cloudProvider,
        nodes: input.nodes ? (input.nodes as any) : existing.nodes,
        edges: input.edges ? (input.edges as any) : existing.edges,
      },
    });

    return design;
  }

  /**
   * Deletes a design. Admin can delete any; others only their own.
   */
  async deleteDesign(id: string, userId: string, role: Role) {
    const existing = await prisma.architectureDesign.findUnique({ where: { id } });

    if (!existing || (role !== Role.ADMIN && existing.ownerId !== userId)) {
      const error: any = new Error('Design not found');
      error.statusCode = 404;
      throw error;
    }

    await prisma.architectureDesign.delete({ where: { id } });

    // Clean up template folder from disk if generated
    ['aws', 'azure', 'gcp'].forEach((p) => {
      const targetDir = path.join(this.templatesRootDir, 'designs', p, id);
      if (fs.existsSync(targetDir)) {
        try {
          fs.rmSync(targetDir, { recursive: true, force: true });
        } catch (err) {
          logger.warn(`Failed to delete design template dir [${targetDir}]:`, err);
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DESIGN_DELETED',
        status: 'SUCCESS',
        message: `Architecture design "${existing.name}" deleted`,
        metadata: { designId: id },
      },
    });

    return { success: true };
  }

  /**
   * Synchronizes an ArchitectureDesign into an isolated, deployable Terraform template catalog entry.
   */
  async syncDesignTemplate(design: any) {
    const provider = ((design.cloudProvider as string) || 'AWS').toUpperCase() as
      | 'AWS'
      | 'AZURE'
      | 'GCP'
      | 'MULTI';
    const providerFolder = provider === 'AZURE' ? 'azure' : provider === 'GCP' ? 'gcp' : 'aws';
    const targetDir = path.join(this.templatesRootDir, 'designs', providerFolder, design.id);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const nodes = (design.nodes as unknown as DesignNodeInput[]) || [];
    const edges = (design.edges as unknown as DesignEdgeInput[]) || [];

    const { mainTf, schemaJson } = generateDesignTerraform(
      design.name,
      provider,
      nodes,
      edges,
    );

    fs.writeFileSync(path.join(targetDir, 'main.tf'), mainTf, 'utf8');
    fs.writeFileSync(
      path.join(targetDir, 'schema.json'),
      JSON.stringify(schemaJson, null, 2),
      'utf8',
    );

    const templateRef = `templates/designs/${providerFolder}/${design.id}`;

    const existingTemplate = await prisma.template.findFirst({
      where: { templateReference: templateRef },
    });

    const templateName = `Design: ${design.name}`;
    const templateDescription =
      design.description ||
      `Visual architecture design with ${nodes.length} resource(s) across ${provider}`;
    const dbProvider = provider === 'MULTI' ? null : (provider as Provider);

    let templateRecord;
    if (existingTemplate) {
      templateRecord = await prisma.template.update({
        where: { id: existingTemplate.id },
        data: {
          name: templateName,
          provider: dbProvider,
          version: '1.0.0',
          description: templateDescription,
          inputSchema: schemaJson as any,
        },
      });
    } else {
      templateRecord = await prisma.template.create({
        data: {
          name: templateName,
          provider: dbProvider,
          version: '1.0.0',
          description: templateDescription,
          templateReference: templateRef,
          inputSchema: schemaJson as any,
        },
      });
    }

    return templateRecord;
  }

  /**
   * Deploys an architecture design by generating its dedicated Terraform template and queuing a plan.
   */
  async deployDesign(
    userId: string,
    role: Role,
    designId: string,
    input: DeployDesignInput,
  ) {
    if (!input.projectId || !input.environmentId) {
      const error: any = new Error('projectId and environmentId are required');
      error.statusCode = 400;
      throw error;
    }

    // 1. If payload contains updated canvas state, persist it first
    if (input.name || input.nodes || input.edges || input.cloudProvider) {
      await this.updateDesign(designId, userId, role, {
        name: input.name,
        description: input.description,
        cloudProvider: input.cloudProvider,
        nodes: input.nodes,
        edges: input.edges,
      });
    }

    // 2. Fetch authoritative design
    const design = await prisma.architectureDesign.findUnique({
      where: { id: designId },
    });

    if (!design || (role !== Role.ADMIN && design.ownerId !== userId)) {
      const error: any = new Error('Design not found');
      error.statusCode = 404;
      throw error;
    }

    const nodes = (design.nodes as unknown as DesignNodeInput[]) || [];
    if (nodes.length === 0) {
      const error: any = new Error(
        'Cannot deploy an empty design. Add at least one resource to the canvas.',
      );
      error.statusCode = 400;
      throw error;
    }

    // 3. Generate template on disk and record in DB
    const template = await this.syncDesignTemplate(design);

    // 4. Dispatch deployment plan creation
    const deployment = await deploymentService.createPlan(userId, {
      projectId: input.projectId,
      environmentId: input.environmentId,
      templateId: template.id,
      configuration: input.configuration || {},
    });

    logger.info(
      `Plan initiated for design [${design.name}] (${design.id}) via deployment [${deployment.id}]`,
    );

    return {
      deployment,
      template,
      message: `Plan generation initiated successfully for design "${design.name}"`,
    };
  }

  private formatDesignSummary(design: any) {
    return {
      id: design.id,
      name: design.name,
      description: design.description,
      cloudProvider: design.cloudProvider,
      nodeCount: Array.isArray(design.nodes) ? design.nodes.length : 0,
      edgeCount: Array.isArray(design.edges) ? design.edges.length : 0,
      owner: design.owner || null,
      updatedAt: design.updatedAt,
    };
  }
}

export const designService = new DesignService();
