import { optimizeCosts, OptimizableDeployment } from './cost.optimizer';
import { CostEstimateResult } from './cost.estimator';

function estimate(total: number, resourceTypes: string[] = ['compute'], qty: number = 1): CostEstimateResult {
  const per = total / resourceTypes.length;
  return {
    scope: 'deployment',
    scopeId: 'dep-x',
    provider: 'AWS',
    region: 'us-east-1',
    currency: 'USD',
    monthlyTotalUsd: total,
    lineItems: resourceTypes.map((t) => ({
      resourceType: t,
      label: t,
      quantity: qty,
      unit: 'flat',
      unitMonthlyUsd: per / qty,
      monthlyUsd: Math.round(per * 100) / 100,
      basis: 'test',
    })),
    assumptions: [],
    source: 'test',
    computedAt: new Date().toISOString(),
  };
}

function dep(overrides: Partial<OptimizableDeployment> & { id: string }): OptimizableDeployment {
  return {
    deploymentId: overrides.id,
    environmentName: 'development',
    projectName: 'web-platform',
    provider: 'AWS',
    region: 'us-east-1',
    estimate: overrides.estimate ?? estimate(24),
    configuration: overrides.configuration ?? {},
    ...overrides,
  } as OptimizableDeployment;
}

describe('cost.optimizer (builtin-heuristics-v1)', () => {
  it('returns zero recommendations and zero savings for a lean fleet', () => {
    const result = optimizeCosts([
      dep({ id: 'dep-lean', configuration: { instance_count: 1, volume_size: 8 }, estimate: estimate(24) }),
    ]);

    expect(result.currentMonthlyUsd).toBe(24);
    expect(result.recommendations).toHaveLength(0);
    expect(result.projectedMonthlyUsd).toBe(24);
    expect(result.totalEstimatedMonthlySavingsUsd).toBe(0);
    expect(result.savingsPct).toBe(0);
    expect(result.source).toBe('builtin-heuristics-v1');
  });

  it('flags oversized volumes with concrete shrink steps', () => {
    const result = optimizeCosts([
      dep({ id: 'dep-big-disk', configuration: { instance_count: 1, volume_size: 100 }, estimate: estimate(24, ['compute', 'storage']) }),
    ]);

    const rec = result.recommendations.find((r) => r.rule === 'oversized-volume');
    expect(rec).toBeDefined();
    expect(rec!.steps.length).toBeGreaterThanOrEqual(3);
    expect(rec!.steps[0]).toContain('volume_size');
    expect(rec!.estimatedMonthlySavingsUsd).toBeGreaterThan(0);
  });

  it('flags non-production multi-instance redundancy', () => {
    // estimate prices 3 instances at $24 each; dropping 3 → 2 saves one unit
    const result = optimizeCosts([
      dep({ id: 'dep-staging', environmentName: 'staging', configuration: { instance_count: 3 }, estimate: estimate(72, ['compute'], 3) }),
    ]);

    const rec = result.recommendations.find((r) => r.rule === 'nonprod-redundancy');
    expect(rec).toBeDefined();
    expect(rec!.title).toContain('2 instead of 3');
    expect(rec!.estimatedMonthlySavingsUsd).toBeCloseTo(24, 0);
  });

  it('does not claim redundancy savings when the estimate prices fewer instances than configured', () => {
    // config requests 3 but the template only priced 1 — nothing real to trim
    const result = optimizeCosts([
      dep({ id: 'dep-mismatch', environmentName: 'staging', configuration: { instance_count: 3 }, estimate: estimate(24, ['compute'], 1) }),
    ]);

    expect(result.recommendations.find((r) => r.rule === 'nonprod-redundancy')).toBeUndefined();
  });

  it('never suggests region moves or trimming for production', () => {
    const result = optimizeCosts([
      dep({
        id: 'dep-prod',
        environmentName: 'production',
        region: 'us-west-2',
        configuration: { instance_count: 3, volume_size: 200 },
        estimate: estimate(100, ['compute', 'storage']),
      }),
    ]);

    expect(result.recommendations.find((r) => r.rule === 'region-arbitrage')).toBeUndefined();
    expect(result.recommendations.find((r) => r.rule === 'nonprod-redundancy')).toBeUndefined();
  });

  it('suggests a cheaper region for non-prod in an expensive region', () => {
    const result = optimizeCosts([
      dep({ id: 'dep-apse', environmentName: 'staging', region: 'ap-southeast-1', estimate: estimate(50, ['compute']) }),
    ]);

    const rec = result.recommendations.find((r) => r.rule === 'region-arbitrage');
    expect(rec).toBeDefined();
    expect(rec!.title).toContain('ap-south-1');
  });

  it('aggregates idle sandbox spend into a platform-level teardown recommendation', () => {
    const result = optimizeCosts([
      dep({ id: 'dep-sb-1', projectName: 'sandbox-a', estimate: estimate(10) }),
      dep({ id: 'dep-sb-2', projectName: 'e2e-b', estimate: estimate(8) }),
    ]);

    const rec = result.recommendations.find((r) => r.rule === 'idle-sandbox');
    expect(rec).toBeDefined();
    expect(rec!.deploymentId).toBeNull();
    expect(rec!.estimatedMonthlySavingsUsd).toBeCloseTo(18, 0);
  });

  it('caps combined savings at 90% of current spend and orders by savings', () => {
    const result = optimizeCosts([
      dep({ id: 'dep-1', environmentName: 'staging', configuration: { instance_count: 4, volume_size: 500 }, region: 'us-west-2', estimate: estimate(60, ['compute', 'storage']) }),
      dep({ id: 'dep-2', projectName: 'sandbox-x', estimate: estimate(40, ['compute']) }),
    ]);

    expect(result.totalEstimatedMonthlySavingsUsd).toBeLessThanOrEqual((60 + 40) * 0.9);
    const savings = result.recommendations.map((r) => r.estimatedMonthlySavingsUsd);
    expect([...savings].sort((a, b) => b - a)).toEqual(savings);
    expect(result.projectedMonthlyUsd).toBeCloseTo(result.currentMonthlyUsd - result.totalEstimatedMonthlySavingsUsd, 2);
  });
});
