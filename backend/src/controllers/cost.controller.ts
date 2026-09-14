import { Request, Response, NextFunction } from 'express';
import { Provider } from '@prisma/client';
import { prisma } from '../config/prisma';
import { estimateTemplateCost, estimateDeploymentCost, CostEstimateResult } from '../services/costs';

export const costController = {
  /**
   * POST /api/costs/estimate
   * Pre-deployment estimate for a template + configuration + provider + region.
   */
  estimate: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { templateName, provider, configuration, region } = req.body ?? {};

      if (!templateName || typeof templateName !== 'string') {
        return res.status(400).json({ error: 'templateName is required' });
      }
      if (!provider || !['AWS', 'AZURE', 'GCP'].includes(provider)) {
        return res.status(400).json({ error: 'provider must be one of AWS, AZURE, GCP' });
      }

      const estimate = estimateTemplateCost({
        templateName,
        provider: provider as 'AWS' | 'AZURE' | 'GCP',
        configuration: typeof configuration === 'object' && configuration !== null ? configuration : {},
        region: typeof region === 'string' ? region : null,
      });

      res.status(200).json({ estimate });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/costs/summary?projectId=...
   * Monthly-estimate rollup across a project's active deployments (and a
   * platform-wide rollup when no projectId is given).
   */
  summary: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.query;

      const deployments = await prisma.deployment.findMany({
        where: {
          status: { in: ['SUCCEEDED', 'RUNNING'] },
          operationType: { not: 'DESTROY' },
          ...(typeof projectId === 'string' && projectId ? { projectId } : {}),
        },
        select: {
          id: true,
          configuration: true,
          template: { select: { provider: true } },
          project: { select: { id: true, name: true } },
          environment: { select: { id: true, name: true } },
        },
      });

      const byProject = new Map<string, {
        projectId: string;
        projectName: string;
        monthlyTotalUsd: number;
        deployments: { deploymentId: string; environmentName: string | null; estimate: CostEstimateResult }[];
      }>();

      for (const d of deployments) {
        const resources = await prisma.resource.findMany({
          where: { deploymentId: d.id },
          select: { resourceType: true, name: true },
        });
        if (resources.length === 0) continue;

        const estimate = estimateDeploymentCost({
          deploymentId: d.id,
          provider: (d.template.provider || 'AWS') as 'AWS' | 'AZURE' | 'GCP',
          region: (d.configuration as any)?.['region'] ?? null,
          resources,
        });

        const key = d.project.id;
        if (!byProject.has(key)) {
          byProject.set(key, {
            projectId: d.project.id,
            projectName: d.project.name,
            monthlyTotalUsd: 0,
            deployments: [],
          });
        }
        const bucket = byProject.get(key)!;
        bucket.deployments.push({
          deploymentId: d.id,
          environmentName: d.environment.name,
          estimate,
        });
        bucket.monthlyTotalUsd = Math.round((bucket.monthlyTotalUsd + estimate.monthlyTotalUsd) * 100) / 100;
      }

      const projects = [...byProject.values()].sort((a, b) => b.monthlyTotalUsd - a.monthlyTotalUsd);
      const monthlyTotalUsd = Math.round(projects.reduce((s, p) => s + p.monthlyTotalUsd, 0) * 100) / 100;

      res.status(200).json({
        currency: 'USD',
        source: 'builtin-rate-card-v1',
        label: 'Estimated monthly cost — not a bill. Offline rate card; excludes egress, licenses, tax.',
        monthlyTotalUsd,
        projects,
        computedAt: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
};
