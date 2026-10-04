import { Request, Response, NextFunction } from 'express';
import { Provider } from '@prisma/client';
import { prisma } from '../config/prisma';
import { cloudService } from '../services/cloud/cloud.service';
import {
  estimateTemplateCost,
  estimateDeploymentCost,
  optimizeCosts,
  OptimizableDeployment,
  CostEstimateResult,
  compareMultiCloud,
  analyzeScaling,
  projectCostTrend,
  generateRightsizingReport,
  getOptimizationTips,
  getWorkloadProfiles,
  getSavingsPlans,
} from '../services/costs';

/**
 * Builds a per-request region resolver: maps a bound cloud account to its
 * default region the same way the worker does (decrypted once per account,
 * cached for the request). Falls back to null → estimator default.
 */
function makeRegionResolver() {
  const cache = new Map<string, string | null>();
  return async (cloudAccountId: string | null | undefined): Promise<string | null> => {
    if (!cloudAccountId) return null;
    if (!cache.has(cloudAccountId)) {
      try {
        const creds = await cloudService.getDecryptedCredentials(cloudAccountId);
        cache.set(cloudAccountId, ((creds as unknown) as Record<string, unknown>)?.['defaultRegion'] as string ?? null);
      } catch {
        cache.set(cloudAccountId, null);
      }
    }
    return cache.get(cloudAccountId) ?? null;
  };
}

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

      const where: any = {
        status: { in: ['SUCCEEDED', 'RUNNING'] },
        operationType: { not: 'DESTROY' },
        ...(typeof projectId === 'string' && projectId ? { projectId } : {}),
      };
      if (req.user!.role !== 'ADMIN') {
        where.project = { ownerId: req.user!.userId };
      }

      const deployments = await prisma.deployment.findMany({
        where,
        select: {
          id: true,
          configuration: true,
          template: { select: { provider: true } },
          project: { select: { id: true, name: true } },
          environment: { select: { id: true, name: true, cloudAccountId: true } },
        },
      });

      const resolveRegion = makeRegionResolver();

      const byProject = new Map<string, {
        projectId: string;
        projectName: string;
        monthlyTotalUsd: number;
        deployments: { deploymentId: string; environmentName: string | null; estimate: CostEstimateResult }[];
      }>();

      for (const d of deployments) {
        const resources = await prisma.resource.findMany({
          where: { deploymentId: d.id, status: { not: 'DESTROYED' } },
          select: { resourceType: true, name: true },
        });
        if (resources.length === 0) continue;

        const estimate = estimateDeploymentCost({
          deploymentId: d.id,
          provider: (d.template.provider || 'AWS') as 'AWS' | 'AZURE' | 'GCP',
          region: await resolveRegion(d.environment.cloudAccountId),
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

  /**
   * GET /api/costs/optimizations?projectId=...
   * Heuristic recommendations: concrete steps + projected monthly spend.
   */
  optimizations: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.query;

      const where: any = {
        status: { in: ['SUCCEEDED', 'RUNNING'] },
        operationType: { not: 'DESTROY' },
        ...(typeof projectId === 'string' && projectId ? { projectId } : {}),
      };
      if (req.user!.role !== 'ADMIN') {
        where.project = { ownerId: req.user!.userId };
      }

      const deployments = await prisma.deployment.findMany({
        where,
        select: {
          id: true,
          configuration: true,
          template: { select: { provider: true } },
          project: { select: { id: true, name: true } },
          environment: { select: { id: true, name: true, cloudAccountId: true } },
        },
      });

      const optimizable: OptimizableDeployment[] = [];
      // Resolve each deployment's effective target region the same way the
      // worker does: bound cloud account's default region.
      const resolveRegion = makeRegionResolver();
      for (const d of deployments) {
        const resources = await prisma.resource.findMany({
          where: { deploymentId: d.id, status: { not: 'DESTROYED' } },
          select: { resourceType: true, name: true },
        });
        if (resources.length === 0) continue;

        const region = await resolveRegion(d.environment.cloudAccountId);

        const estimate = estimateDeploymentCost({
          deploymentId: d.id,
          provider: (d.template.provider || 'AWS') as 'AWS' | 'AZURE' | 'GCP',
          region,
          resources,
        });

        optimizable.push({
          deploymentId: d.id,
          environmentName: d.environment.name,
          projectName: d.project.name,
          provider: (d.template.provider || 'AWS') as 'AWS' | 'AZURE' | 'GCP',
          region,
          estimate,
          configuration: (d.configuration as Record<string, unknown>) ?? {},
        });
      }

      const result = optimizeCosts(optimizable);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  /* ================================================================
     Cost Optimization Center — new analytics endpoints
     ================================================================ */

  /**
   * GET /api/costs/compare?workload=web-medium
   * Multi-cloud cost comparison for a given workload profile.
   */
  multiCloudCompare: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workload = typeof req.query.workload === 'string' ? req.query.workload : 'web-medium';
      const result = compareMultiCloud(workload);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/costs/scaling?provider=AWS&workload=web-medium
   * Scaling & traffic cost projection.
   */
  scalingAnalysis: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = (['AWS', 'AZURE', 'GCP'].includes(req.query.provider as string)
        ? req.query.provider : 'AWS') as 'AWS' | 'AZURE' | 'GCP';
      const workload = typeof req.query.workload === 'string' ? req.query.workload : 'web-medium';
      const result = analyzeScaling(provider, workload);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/costs/trends?provider=AWS&baseMonthly=150&growthRate=10
   * 12-month cost trend projection.
   */
  trendProjection: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = (['AWS', 'AZURE', 'GCP'].includes(req.query.provider as string)
        ? req.query.provider : 'AWS') as 'AWS' | 'AZURE' | 'GCP';
      const baseMonthly = Math.max(1, Math.min(100000, Number(req.query.baseMonthly) || 150));
      const growthRate = Math.max(0, Math.min(100, Number(req.query.growthRate) || 8));
      const result = projectCostTrend(provider, baseMonthly, growthRate);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/costs/rightsizing?provider=AWS&workload=web-medium
   * Rightsizing recommendations for a given workload.
   */
  rightsizing: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = (['AWS', 'AZURE', 'GCP'].includes(req.query.provider as string)
        ? req.query.provider : 'AWS') as 'AWS' | 'AZURE' | 'GCP';
      const workload = typeof req.query.workload === 'string' ? req.query.workload : 'web-medium';
      const result = generateRightsizingReport(provider, workload);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/costs/tips?provider=AWS
   * Provider-specific cost optimization tips.
   */
  tips: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = ['AWS', 'AZURE', 'GCP'].includes(req.query.provider as string)
        ? (req.query.provider as 'AWS' | 'AZURE' | 'GCP')
        : undefined;
      const result = getOptimizationTips(provider);
      res.status(200).json({ tips: result });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/costs/workload-profiles
   * List available workload profiles for comparison tools.
   */
  workloadProfiles: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const profiles = getWorkloadProfiles();
      res.status(200).json({ profiles });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/costs/savings-plans?provider=AWS
   * List savings plan options for a given provider.
   */
  savingsPlans: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = (['AWS', 'AZURE', 'GCP'].includes(req.query.provider as string)
        ? req.query.provider : 'AWS') as 'AWS' | 'AZURE' | 'GCP';
      const plans = getSavingsPlans(provider);
      res.status(200).json({ provider, plans });
    } catch (err) {
      next(err);
    }
  },
};
