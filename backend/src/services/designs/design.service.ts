import { prisma } from '../../config/prisma';
import { logger } from '../../utils/logger';

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

export class DesignService {
  /**
   * Lists all designs owned by the user, newest first.
   */
  async listDesigns(userId: string) {
    const designs = await prisma.architectureDesign.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
    });

    return designs.map((d) => this.formatDesignSummary(d));
  }

  /**
   * Retrieves a single design by ID with full canvas state.
   */
  async getDesignById(id: string, userId: string) {
    const design = await prisma.architectureDesign.findUnique({ where: { id } });

    if (!design || design.ownerId !== userId) {
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
   */
  async updateDesign(id: string, userId: string, input: Partial<DesignInput>) {
    const existing = await prisma.architectureDesign.findUnique({ where: { id } });

    if (!existing || existing.ownerId !== userId) {
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
   * Deletes a design owned by the user.
   */
  async deleteDesign(id: string, userId: string) {
    const existing = await prisma.architectureDesign.findUnique({ where: { id } });

    if (!existing || existing.ownerId !== userId) {
      const error: any = new Error('Design not found');
      error.statusCode = 404;
      throw error;
    }

    await prisma.architectureDesign.delete({ where: { id } });

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

  private formatDesignSummary(design: any) {
    return {
      id: design.id,
      name: design.name,
      description: design.description,
      cloudProvider: design.cloudProvider,
      nodeCount: Array.isArray(design.nodes) ? design.nodes.length : 0,
      edgeCount: Array.isArray(design.edges) ? design.edges.length : 0,
      updatedAt: design.updatedAt,
    };
  }
}

export const designService = new DesignService();
