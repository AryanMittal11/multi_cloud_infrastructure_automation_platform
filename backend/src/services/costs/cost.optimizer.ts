/**
 * Cost Optimization Advisor — basic heuristic engine (PDF flow step 15+).
 *
 * Consumes the same per-deployment estimates the cost summary produces and
 * emits deterministic, human-readable recommendations with concrete steps and
 * a projected monthly spend. This is deliberately rule-based (no ML, no live
 * pricing): every rule is explainable, unit-testable, and safe to display as
 * an *estimate*. A live-pricing/telemetry-driven engine can replace the rule
 * internals later without changing the response contract.
 */

import { CostEstimateResult } from './cost.estimator';

export interface OptimizableDeployment {
  deploymentId: string;
  environmentName: string | null;
  projectName: string;
  provider: 'AWS' | 'AZURE' | 'GCP';
  region: string | null;
  estimate: CostEstimateResult;
  configuration: Record<string, unknown>;
}

export interface CostRecommendation {
  id: string;
  /** Which deployment (or "platform") the advice applies to. */
  deploymentId: string | null;
  projectName: string | null;
  environmentName: string | null;
  /** Stable rule identifier, e.g. `oversized-volume`. */
  rule: string;
  severity: 'info' | 'warning' | 'opportunity';
  title: string;
  detail: string;
  /** Concrete, ordered steps the user can act on. */
  steps: string[];
  /** Estimated USD/month saved if the advice is followed. */
  estimatedMonthlySavingsUsd: number;
}

export interface CostOptimizationResult {
  currency: 'USD';
  currentMonthlyUsd: number;
  projectedMonthlyUsd: number;
  totalEstimatedMonthlySavingsUsd: number;
  savingsPct: number;
  recommendations: CostRecommendation[];
  source: 'builtin-heuristics-v1';
  label: string;
  computedAt: string;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Boot-volume GB the platform assumes per storage-backed unit (mirrors estimator). */
const ASSUMED_BOOT_GB = 8;

/**
 * Over-provisioned volume: the estimator prices 8GB boot volumes, but
 * configurations often request far more. Flag volumes sized well above the
 * observed default when the workload archetype (web/compute) doesn't need it.
 */
function volumeRule(deployment: OptimizableDeployment): CostRecommendation | null {
  const volumeKey = ['volume_size', 'disk_size', 'allocated_storage_gb', 'root_volume_size'].find((k) => deployment.configuration[k] !== undefined);
  const volumeSize = volumeKey ? Number(deployment.configuration[volumeKey]) : 0;
  if (volumeSize < 32) return null; // small volumes are fine

  const computeItems = deployment.estimate.lineItems.filter((li) => li.resourceType === 'storage' || li.resourceType === 'compute');
  if (computeItems.length === 0) return null;

  // Step down to a saner tier: 30% reduction, capped at the requested size.
  const suggestedGb = clamp(Math.round(volumeSize * 0.7), 8, volumeSize - 8);
  if (suggestedGb >= volumeSize) return null;

  const gbSaved = volumeSize - suggestedGb;
  const storageUnit = 0.1 * (deployment.region ? 1.1 : 1); // rough; rate card SSD tier
  // Savings scale with instances actually priced (not the requested count,
  // which may not be a real template variable).
  const pricedUnits = deployment.estimate.lineItems.find((li) => li.resourceType === 'compute')?.quantity ?? 1;
  const savings = round2(gbSaved * storageUnit * pricedUnits);

  if (savings < 0.1) return null;

  return {
    id: `${deployment.deploymentId}:oversized-volume`,
    deploymentId: deployment.deploymentId,
    projectName: deployment.projectName,
    environmentName: deployment.environmentName,
    rule: 'oversized-volume',
    severity: 'opportunity',
    title: `Shrink ${volumeSize} GB volumes to ~${suggestedGb} GB`,
    detail: `Configuration requests ${volumeSize} GB block storage per instance (via ${volumeKey}). Most web/compute workloads operate comfortably ~30% smaller; cloud volumes are the easiest cost lever because resizing is non-destructive when done via snapshot.`,
    steps: [
      `Open the deployment's configuration and set ${volumeKey} to ${suggestedGb} GB.`,
      'Apply the change through the normal plan → approve pipeline (resize is in-place).',
      'Verify disk usage headroom on the affected instances after apply.',
    ],
    estimatedMonthlySavingsUsd: savings,
  };
}

/** Right-size instance count for non-production environments. */
function instanceCountRule(deployment: OptimizableDeployment): CostRecommendation | null {
  const env = (deployment.environmentName ?? '').toLowerCase();
  const isNonProd = /dev|test|staging|sandbox|qa/.test(env);
  if (!isNonProd) return null;

  const count = Number(deployment.configuration['instance_count'] ?? deployment.configuration['node_count'] ?? 1) || 1;
  if (count < 2) return null; // nothing to trim

  const computeLine = deployment.estimate.lineItems.find((li) => li.resourceType === 'compute');
  if (!computeLine) return null;

  // Only claim savings for instances the estimate actually prices: if the
  // template provisions fewer than the requested count, the config key is
  // not a real template variable and there is nothing to trim.
  const priced = Math.min(count, computeLine.quantity);
  if (priced < 2) return null;

  const suggestedCount = Math.max(1, priced - 1);
  const savings = round2(computeLine.unitMonthlyUsd * (priced - suggestedCount));

  return {
    id: `${deployment.deploymentId}:nonprod-redundancy`,
    deploymentId: deployment.deploymentId,
    projectName: deployment.projectName,
    environmentName: deployment.environmentName,
    rule: 'nonprod-redundancy',
    severity: 'opportunity',
    title: `Run ${suggestedCount} instead of ${priced} instance(s) in "${deployment.environmentName}"`,
    detail: `Non-production environments rarely need multi-instance redundancy. Dropping to ${suggestedCount} keeps the environment usable for development while removing idle duplicate spend.`,
    steps: [
      `Set instance_count to ${suggestedCount} in the deployment configuration.`,
      'Run the plan and review the diff — it should show only capacity removal.',
      'Approve during off-hours to avoid disrupting active development.',
    ],
    estimatedMonthlySavingsUsd: savings,
  };
}

/** Region arbitrage: flag expensive regions when a cheaper equivalent exists. */
const CHEAPER_REGION_SUGGESTION: Record<string, { to: string; multiplierDelta: number }> = {
  'us-west-2': { to: 'us-east-1', multiplierDelta: 0.08 },
  'eu-central-1': { to: 'eu-west-1', multiplierDelta: 0.01 },
  westeurope: { to: 'eastus', multiplierDelta: 0.09 },
  'ap-southeast-1': { to: 'ap-south-1', multiplierDelta: 0.13 },
};

function regionRule(deployment: OptimizableDeployment): CostRecommendation | null {
  const region = deployment.region ?? '';
  const suggestion = CHEAPER_REGION_SUGGESTION[region];
  if (!suggestion) return null;

  const env = (deployment.environmentName ?? '').toLowerCase();
  if (/prod/.test(env)) return null; // never suggest latency-affecting moves for prod in basic engine

  const savings = round2(deployment.estimate.monthlyTotalUsd * suggestion.multiplierDelta);
  if (savings < 0.1) return null;

  return {
    id: `${deployment.deploymentId}:region-arbitrage`,
    deploymentId: deployment.deploymentId,
    projectName: deployment.projectName,
    environmentName: deployment.environmentName,
    rule: 'region-arbitrage',
    severity: 'info',
    title: `Consider ${suggestion.to} instead of ${region}`,
    detail: `"${deployment.environmentName}" runs in ${region}, priced ~${Math.round(suggestion.multiplierDelta * 100)}% above ${suggestion.to}. If the workload has no latency or data-residency constraints on this region, redeploying there trims the estimate.`,
    steps: [
      `Create the deployment in ${suggestion.to} (same template and configuration).`,
      'Compare application latency after cutover; keep the old stack until validated.',
      'Tear down the original deployment once the new region is verified.',
    ],
    estimatedMonthlySavingsUsd: savings,
  };
}

/** Platform-level: idle DESTROY-able spend in sandbox accounts. */
function idleSandboxRule(deployments: OptimizableDeployment[]): CostRecommendation | null {
  const sandbox = deployments.filter((d) => {
    const env = (d.environmentName ?? '').toLowerCase();
    const project = d.projectName.toLowerCase();
    return /sandbox|e2e|temp|scratch/.test(env) || /sandbox|e2e|temp|scratch/.test(project);
  });
  if (sandbox.length === 0) return null;

  const total = round2(sandbox.reduce((s, d) => s + d.estimate.monthlyTotalUsd, 0));
  if (total < 0.5) return null;

  return {
    id: 'platform:idle-sandbox',
    deploymentId: null,
    projectName: null,
    environmentName: null,
    rule: 'idle-sandbox',
    severity: 'warning',
    title: `${sandbox.length} sandbox deployment(s) cost ${total.toFixed(2)} USD/mo while idle`,
    detail: 'Scratch and E2E environments accumulate cost between runs. Tearing down unused sandboxes is the fastest zero-risk saving — the platform records everything needed to recreate them from the same template.',
    steps: [
      'Review each sandbox deployment from the Deployments page.',
      'Use Teardown with the typed confirmation for the ones no longer needed.',
      'Recreate on demand from Template Catalog — the same configuration redeploys in minutes.',
    ],
    estimatedMonthlySavingsUsd: total,
  };
}

/** Estimate the projected spend after every recommendation is applied. */
function projectSavings(recommendations: CostRecommendation[], currentTotal: number): number {
  // Recommendations can overlap (e.g. region move changes all line items).
  // Cap the combined claim at 90% of current spend so projections stay sane.
  const raw = recommendations.reduce((s, r) => s + r.estimatedMonthlySavingsUsd, 0);
  return round2(Math.min(raw, currentTotal * 0.9));
}

/**
 * Produce optimization recommendations for a fleet of deployment estimates.
 * Deterministic: same input → same output, safe to cache and test.
 */
export function optimizeCosts(deployments: OptimizableDeployment[]): CostOptimizationResult {
  const currentMonthlyUsd = round2(deployments.reduce((s, d) => s + d.estimate.monthlyTotalUsd, 0));

  const recommendations: CostRecommendation[] = [];
  for (const d of deployments) {
    const rules = [volumeRule, instanceCountRule, regionRule];
    for (const rule of rules) {
      const rec = rule(d);
      if (rec && rec.estimatedMonthlySavingsUsd >= 0.1) recommendations.push(rec);
    }
  }

  const platformRec = idleSandboxRule(deployments);
  if (platformRec) recommendations.push(platformRec);

  recommendations.sort((a, b) => b.estimatedMonthlySavingsUsd - a.estimatedMonthlySavingsUsd);

  const totalEstimatedMonthlySavingsUsd = projectSavings(recommendations, currentMonthlyUsd);
  const projectedMonthlyUsd = round2(Math.max(0, currentMonthlyUsd - totalEstimatedMonthlySavingsUsd));
  const savingsPct = currentMonthlyUsd > 0 ? Math.round((totalEstimatedMonthlySavingsUsd / currentMonthlyUsd) * 100) : 0;

  return {
    currency: 'USD',
    currentMonthlyUsd,
    projectedMonthlyUsd,
    totalEstimatedMonthlySavingsUsd,
    savingsPct,
    recommendations,
    source: 'builtin-heuristics-v1',
    label: 'Rule-based suggestions from recorded configurations — apply through the normal pipeline; figures are estimates.',
    computedAt: new Date().toISOString(),
  };
}
