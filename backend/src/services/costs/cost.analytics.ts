/**
 * Cost Analytics & Multi-Cloud Intelligence Engine
 *
 * Provides:
 * 1. Multi-cloud cost comparison for identical workloads across AWS/Azure/GCP
 * 2. Scaling & traffic cost projections (what happens if traffic grows 2x, 5x?)
 * 3. Reserved / spot / preemptible savings calculator
 * 4. Resource rightsizing intelligence (match workload class to optimal tier)
 * 5. Cost trend simulation (12-month projection with growth assumptions)
 * 6. Provider-specific optimization tips
 */

import type { CostProvider } from './cost.estimator';

/* ================================================================
   Multi-Cloud Price Matrix
   Provider-specific unit costs (USD/month, baseline region).
   Realistic 2024-era on-demand pricing for cross-cloud comparison.
   ================================================================ */

export interface ProviderPricing {
  compute: { small: number; medium: number; large: number; xlarge: number };
  database: { small: number; medium: number; large: number };
  storage: { ssd: number; hdd: number; object: number }; // per GB
  network: { nat: number; lb: number; egress: number }; // egress per GB
  cluster: { controlPlane: number; nodeSmall: number; nodeMedium: number };
}

const PROVIDER_PRICING: Record<CostProvider, ProviderPricing> = {
  AWS: {
    compute: { small: 8.47, medium: 30.37, large: 121.47, xlarge: 242.94 },
    database: { small: 24.82, medium: 49.64, large: 198.56 },
    storage: { ssd: 0.10, hdd: 0.045, object: 0.023 },
    network: { nat: 32.40, lb: 16.43, egress: 0.09 },
    cluster: { controlPlane: 73.00, nodeSmall: 8.47, nodeMedium: 30.37 },
  },
  AZURE: {
    compute: { small: 7.59, medium: 27.74, large: 110.96, xlarge: 221.92 },
    database: { small: 25.55, medium: 51.10, large: 204.40 },
    storage: { ssd: 0.095, hdd: 0.04, object: 0.018 },
    network: { nat: 30.66, lb: 18.25, egress: 0.087 },
    cluster: { controlPlane: 73.00, nodeSmall: 7.59, nodeMedium: 27.74 },
  },
  GCP: {
    compute: { small: 6.11, medium: 24.27, large: 97.08, xlarge: 194.16 },
    database: { small: 25.55, medium: 51.10, large: 205.40 },
    storage: { ssd: 0.17, hdd: 0.04, object: 0.020 },
    network: { nat: 31.54, lb: 18.26, egress: 0.12 },
    cluster: { controlPlane: 73.00, nodeSmall: 6.11, nodeMedium: 24.27 },
  },
};

/* ================================================================
   Reserved / Spot pricing discounts (percentage off on-demand)
   ================================================================ */

export interface SavingsPlan {
  plan: string;
  description: string;
  discountPct: number;
  commitment: string;
  risk: 'none' | 'low' | 'medium' | 'high';
}

const SAVINGS_PLANS: Record<CostProvider, SavingsPlan[]> = {
  AWS: [
    { plan: 'On-Demand', description: 'Pay as you go, no commitment', discountPct: 0, commitment: 'None', risk: 'none' },
    { plan: 'Reserved 1yr', description: '1-year All Upfront Reserved Instance', discountPct: 36, commitment: '1 year', risk: 'low' },
    { plan: 'Reserved 3yr', description: '3-year All Upfront Reserved Instance', discountPct: 56, commitment: '3 years', risk: 'medium' },
    { plan: 'Savings Plan 1yr', description: '1-year Compute Savings Plan', discountPct: 30, commitment: '1 year', risk: 'low' },
    { plan: 'Spot Instance', description: 'Interruptible capacity, up to 90% off', discountPct: 72, commitment: 'None (interruptible)', risk: 'high' },
  ],
  AZURE: [
    { plan: 'Pay-As-You-Go', description: 'Standard pay-per-use pricing', discountPct: 0, commitment: 'None', risk: 'none' },
    { plan: 'Reserved 1yr', description: '1-year Reserved VM Instance', discountPct: 38, commitment: '1 year', risk: 'low' },
    { plan: 'Reserved 3yr', description: '3-year Reserved VM Instance', discountPct: 58, commitment: '3 years', risk: 'medium' },
    { plan: 'Spot VM', description: 'Evictable surplus capacity', discountPct: 68, commitment: 'None (evictable)', risk: 'high' },
    { plan: 'Dev/Test Pricing', description: 'Reduced rate for dev/test workloads', discountPct: 25, commitment: 'Visual Studio subscription', risk: 'low' },
  ],
  GCP: [
    { plan: 'On-Demand', description: 'Standard per-second billing', discountPct: 0, commitment: 'None', risk: 'none' },
    { plan: 'CUD 1yr', description: '1-year Committed Use Discount', discountPct: 37, commitment: '1 year', risk: 'low' },
    { plan: 'CUD 3yr', description: '3-year Committed Use Discount', discountPct: 55, commitment: '3 years', risk: 'medium' },
    { plan: 'Sustained Use', description: 'Automatic discount for sustained usage', discountPct: 20, commitment: 'None (automatic)', risk: 'none' },
    { plan: 'Preemptible VM', description: 'Short-lived, interruptible VM', discountPct: 80, commitment: 'None (max 24h)', risk: 'high' },
  ],
};

/* ================================================================
   Workload archetype → resource composition mapping
   ================================================================ */

type WorkloadTier = 'small' | 'medium' | 'large';

interface WorkloadComposition {
  computeCount: number;
  computeTier: WorkloadTier;
  databaseCount: number;
  databaseTier: WorkloadTier;
  storageSsdGb: number;
  storageObjectGb: number;
  hasNat: boolean;
  hasLb: boolean;
  hasCluster: boolean;
  egressGb: number;
}

const WORKLOAD_PROFILES: Record<string, WorkloadComposition> = {
  'web-small': {
    computeCount: 1, computeTier: 'small', databaseCount: 1, databaseTier: 'small',
    storageSsdGb: 20, storageObjectGb: 10, hasNat: true, hasLb: false, hasCluster: false, egressGb: 50,
  },
  'web-medium': {
    computeCount: 2, computeTier: 'medium', databaseCount: 1, databaseTier: 'medium',
    storageSsdGb: 50, storageObjectGb: 100, hasNat: true, hasLb: true, hasCluster: false, egressGb: 200,
  },
  'web-large': {
    computeCount: 4, computeTier: 'large', databaseCount: 1, databaseTier: 'large',
    storageSsdGb: 200, storageObjectGb: 500, hasNat: true, hasLb: true, hasCluster: false, egressGb: 1000,
  },
  'microservices-small': {
    computeCount: 3, computeTier: 'small', databaseCount: 1, databaseTier: 'small',
    storageSsdGb: 30, storageObjectGb: 20, hasNat: true, hasLb: true, hasCluster: true, egressGb: 100,
  },
  'microservices-medium': {
    computeCount: 6, computeTier: 'medium', databaseCount: 2, databaseTier: 'medium',
    storageSsdGb: 100, storageObjectGb: 200, hasNat: true, hasLb: true, hasCluster: true, egressGb: 500,
  },
  'data-pipeline': {
    computeCount: 2, computeTier: 'large', databaseCount: 1, databaseTier: 'large',
    storageSsdGb: 500, storageObjectGb: 2000, hasNat: true, hasLb: false, hasCluster: false, egressGb: 300,
  },
  'static-site': {
    computeCount: 0, computeTier: 'small', databaseCount: 0, databaseTier: 'small',
    storageSsdGb: 0, storageObjectGb: 50, hasNat: false, hasLb: false, hasCluster: false, egressGb: 100,
  },
};

/* ================================================================
   Multi-Cloud Comparison Engine
   ================================================================ */

export interface CloudCostBreakdown {
  provider: CostProvider;
  compute: number;
  database: number;
  storage: number;
  network: number;
  cluster: number;
  total: number;
  savingsPlans: { plan: string; discountPct: number; projectedTotal: number; monthlySavings: number }[];
  providerBadge: string;
  cheapestPlan: string;
  cheapestTotal: number;
}

export interface MultiCloudComparison {
  workloadProfile: string;
  workloadDescription: string;
  comparisons: CloudCostBreakdown[];
  cheapestProvider: CostProvider;
  mostExpensiveProvider: CostProvider;
  maxSavingsUsd: number;
  maxSavingsPct: number;
  recommendation: string;
  computedAt: string;
}

function computeProviderCost(provider: CostProvider, workload: WorkloadComposition): CloudCostBreakdown {
  const p = PROVIDER_PRICING[provider];

  const computeCost = workload.computeCount * p.compute[workload.computeTier];
  const dbCost = workload.databaseCount * p.database[workload.databaseTier];
  const storageCost = workload.storageSsdGb * p.storage.ssd + workload.storageObjectGb * p.storage.object;
  const networkCost = (workload.hasNat ? p.network.nat : 0) + (workload.hasLb ? p.network.lb : 0) + workload.egressGb * p.network.egress;
  const clusterCost = workload.hasCluster ? p.cluster.controlPlane : 0;

  const total = round2(computeCost + dbCost + storageCost + networkCost + clusterCost);

  const plans = SAVINGS_PLANS[provider].map((sp) => {
    const computeDiscount = computeCost * sp.discountPct / 100;
    const dbDiscount = dbCost * sp.discountPct * 0.5 / 100; // DB reservations have less discount
    const projectedTotal = round2(total - computeDiscount - dbDiscount);
    return {
      plan: sp.plan,
      discountPct: sp.discountPct,
      projectedTotal,
      monthlySavings: round2(total - projectedTotal),
    };
  });

  const cheapest = plans.reduce((best, p) => p.projectedTotal < best.projectedTotal ? p : best, plans[0]);

  const badges: Record<CostProvider, string> = {
    AWS: 'Amazon Web Services',
    AZURE: 'Microsoft Azure',
    GCP: 'Google Cloud Platform',
  };

  return {
    provider,
    compute: round2(computeCost),
    database: round2(dbCost),
    storage: round2(storageCost),
    network: round2(networkCost),
    cluster: round2(clusterCost),
    total,
    savingsPlans: plans,
    providerBadge: badges[provider],
    cheapestPlan: cheapest.plan,
    cheapestTotal: cheapest.projectedTotal,
  };
}

export function compareMultiCloud(workloadProfile: string): MultiCloudComparison {
  const workload = WORKLOAD_PROFILES[workloadProfile] ?? WORKLOAD_PROFILES['web-medium']!;

  const comparisons = (['AWS', 'AZURE', 'GCP'] as CostProvider[]).map(
    (p) => computeProviderCost(p, workload),
  );

  const sorted = [...comparisons].sort((a, b) => a.total - b.total);
  const cheapest = sorted[0];
  const mostExpensive = sorted[sorted.length - 1];
  const maxSavings = round2(mostExpensive.total - cheapest.total);
  const maxSavingsPct = mostExpensive.total > 0 ? Math.round((maxSavings / mostExpensive.total) * 100) : 0;

  const descriptions: Record<string, string> = {
    'web-small': 'Small web application: 1 VM, 1 DB, basic networking',
    'web-medium': 'Medium web application: 2 VMs + LB, 1 DB, NAT gateway',
    'web-large': 'Large web application: 4 VMs + LB, 1 large DB, high egress',
    'microservices-small': 'Small microservices: 3 VMs, Kubernetes, 1 DB',
    'microservices-medium': 'Medium microservices: 6 VMs, Kubernetes, 2 DBs',
    'data-pipeline': 'Data pipeline: 2 large VMs, large DB, high storage',
    'static-site': 'Static site: Object storage + CDN egress only',
  };

  return {
    workloadProfile,
    workloadDescription: descriptions[workloadProfile] ?? 'Custom workload configuration',
    comparisons,
    cheapestProvider: cheapest.provider,
    mostExpensiveProvider: mostExpensive.provider,
    maxSavingsUsd: maxSavings,
    maxSavingsPct,
    recommendation: `${cheapest.provider} is the most cost-effective for this workload at $${cheapest.total.toFixed(2)}/mo. Switching from ${mostExpensive.provider} could save ~$${maxSavings.toFixed(2)}/mo (${maxSavingsPct}%). Consider ${cheapest.cheapestPlan} for additional savings to $${cheapest.cheapestTotal.toFixed(2)}/mo.`,
    computedAt: new Date().toISOString(),
  };
}

/* ================================================================
   Scaling & Traffic Cost Projector
   ================================================================ */

export interface ScalingScenario {
  label: string;
  multiplier: number;
  computeCost: number;
  databaseCost: number;
  networkCost: number;
  storageCost: number;
  totalCost: number;
  deltaFromBaseline: number;
  deltaPct: number;
  tips: string[];
}

export interface ScalingAnalysis {
  provider: CostProvider;
  baselineCost: number;
  scenarios: ScalingScenario[];
  scalingStrategy: string;
  autoScalingTips: string[];
  computedAt: string;
}

export function analyzeScaling(
  provider: CostProvider,
  workloadProfile: string,
): ScalingAnalysis {
  const workload = WORKLOAD_PROFILES[workloadProfile] ?? WORKLOAD_PROFILES['web-medium']!;
  const p = PROVIDER_PRICING[provider];

  const baseCompute = workload.computeCount * p.compute[workload.computeTier];
  const baseDb = workload.databaseCount * p.database[workload.databaseTier];
  const baseStorage = workload.storageSsdGb * p.storage.ssd + workload.storageObjectGb * p.storage.object;
  const baseNetwork = (workload.hasNat ? p.network.nat : 0) + (workload.hasLb ? p.network.lb : 0) + workload.egressGb * p.network.egress;
  const baseTotal = round2(baseCompute + baseDb + baseStorage + baseNetwork);

  const multipliers = [
    { label: 'Baseline (1×)', m: 1 },
    { label: 'Light growth (1.5×)', m: 1.5 },
    { label: 'Double traffic (2×)', m: 2 },
    { label: 'High traffic (3×)', m: 3 },
    { label: 'Peak burst (5×)', m: 5 },
    { label: 'Extreme scale (10×)', m: 10 },
  ];

  const scenarios: ScalingScenario[] = multipliers.map(({ label, m }) => {
    // Compute scales linearly; DB scales sub-linearly (vertical scale);
    // Storage grows logarithmically; Network scales with traffic
    const computeCost = round2(baseCompute * m);
    const databaseCost = round2(baseDb * Math.pow(m, 0.6)); // DB scales vertically
    const storageCost = round2(baseStorage * Math.pow(m, 0.3)); // Storage grows slower
    const networkCost = round2(baseNetwork * Math.pow(m, 0.85)); // Egress grows with traffic
    const totalCost = round2(computeCost + databaseCost + storageCost + networkCost);

    const tips: string[] = [];
    if (m >= 3) tips.push('Consider horizontal autoscaling with spot/preemptible instances for burst capacity');
    if (m >= 5) tips.push('Evaluate managed container orchestration (EKS/AKS/GKE) for elastic scaling');
    if (m >= 2) tips.push('Enable CDN/edge caching to reduce origin compute and egress costs');
    if (m >= 3 && workload.databaseCount > 0) tips.push('Add read replicas instead of vertically scaling the primary database');

    return {
      label,
      multiplier: m,
      computeCost,
      databaseCost,
      networkCost,
      storageCost,
      totalCost,
      deltaFromBaseline: round2(totalCost - baseTotal),
      deltaPct: baseTotal > 0 ? Math.round(((totalCost - baseTotal) / baseTotal) * 100) : 0,
      tips,
    };
  });

  const autoScalingTips = [
    'Set minimum instance count to handle baseline traffic without cold-start latency.',
    'Configure target CPU utilization at 60–70% for predictable scaling behavior.',
    'Use scheduled scaling for known traffic patterns (e.g., business hours, marketing events).',
    'Implement request-based autoscaling if response time is critical.',
    `On ${provider}, use ${provider === 'AWS' ? 'Auto Scaling Groups with mixed instances' : provider === 'AZURE' ? 'VM Scale Sets with spot priority' : 'Managed Instance Groups with preemptible'} to blend on-demand and spot capacity.`,
    'Enable horizontal pod autoscaler (HPA) if running Kubernetes workloads.',
  ];

  const scalingStrategy = workload.hasCluster
    ? 'Kubernetes-native HPA + Cluster Autoscaler for pod-level and node-level elasticity'
    : workload.computeCount > 1
      ? `${provider === 'AWS' ? 'Auto Scaling Groups' : provider === 'AZURE' ? 'VM Scale Sets' : 'Managed Instance Groups'} with target tracking policy`
      : 'Vertical scaling with instance right-sizing; upgrade to autoscaling group when traffic exceeds 2× baseline';

  return {
    provider,
    baselineCost: baseTotal,
    scenarios,
    scalingStrategy,
    autoScalingTips,
    computedAt: new Date().toISOString(),
  };
}

/* ================================================================
   Cost Trend Projection (12-month forecast)
   ================================================================ */

export interface CostTrendPoint {
  month: string; // "Jan", "Feb", etc.
  monthIndex: number;
  onDemand: number;
  reserved: number;
  optimized: number; // with all recommendations applied
}

export interface CostTrendProjection {
  provider: CostProvider;
  baseMonthly: number;
  growthRatePct: number;
  trend: CostTrendPoint[];
  annualOnDemand: number;
  annualReserved: number;
  annualOptimized: number;
  annualSavingsReserved: number;
  annualSavingsOptimized: number;
  computedAt: string;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function projectCostTrend(
  provider: CostProvider,
  baseMonthlyUsd: number,
  growthRatePct: number = 8,
): CostTrendProjection {
  const monthlyGrowth = growthRatePct / 100 / 12;
  const bestReserved = SAVINGS_PLANS[provider].find((p) => p.discountPct > 30 && p.risk !== 'high');
  const reservedDiscount = bestReserved ? bestReserved.discountPct / 100 : 0.35;
  const optimizedDiscount = reservedDiscount + 0.12; // additional rightsizing + scheduling savings

  const trend: CostTrendPoint[] = MONTH_LABELS.map((month, i) => {
    const growthMultiplier = Math.pow(1 + monthlyGrowth, i);
    const onDemand = round2(baseMonthlyUsd * growthMultiplier);
    const reserved = round2(onDemand * (1 - reservedDiscount));
    const optimized = round2(onDemand * (1 - Math.min(optimizedDiscount, 0.65)));
    return { month, monthIndex: i, onDemand, reserved, optimized };
  });

  const annualOnDemand = round2(trend.reduce((s, t) => s + t.onDemand, 0));
  const annualReserved = round2(trend.reduce((s, t) => s + t.reserved, 0));
  const annualOptimized = round2(trend.reduce((s, t) => s + t.optimized, 0));

  return {
    provider,
    baseMonthly: baseMonthlyUsd,
    growthRatePct,
    trend,
    annualOnDemand,
    annualReserved,
    annualOptimized,
    annualSavingsReserved: round2(annualOnDemand - annualReserved),
    annualSavingsOptimized: round2(annualOnDemand - annualOptimized),
    computedAt: new Date().toISOString(),
  };
}

/* ================================================================
   Rightsizing Intelligence
   ================================================================ */

export interface RightsizingRecommendation {
  id: string;
  currentTier: string;
  suggestedTier: string;
  currentMonthlyCost: number;
  suggestedMonthlyCost: number;
  monthlySavings: number;
  reason: string;
  impact: 'low' | 'medium' | 'high';
  category: 'compute' | 'database' | 'storage' | 'network';
  provider: CostProvider;
  action: string;
}

export interface RightsizingReport {
  recommendations: RightsizingRecommendation[];
  totalCurrentMonthly: number;
  totalSuggestedMonthly: number;
  totalMonthlySavings: number;
  savingsPct: number;
  computedAt: string;
}

export function generateRightsizingReport(
  provider: CostProvider,
  workloadProfile: string,
): RightsizingReport {
  const workload = WORKLOAD_PROFILES[workloadProfile] ?? WORKLOAD_PROFILES['web-medium']!;
  const p = PROVIDER_PRICING[provider];
  const recommendations: RightsizingRecommendation[] = [];
  let rId = 0;

  // Compute rightsizing
  if (workload.computeCount > 0 && workload.computeTier !== 'small') {
    const tiers: WorkloadTier[] = ['small', 'medium', 'large'];
    const currentIdx = tiers.indexOf(workload.computeTier);
    if (currentIdx > 0) {
      const suggested = tiers[currentIdx - 1];
      const current = p.compute[workload.computeTier] * workload.computeCount;
      const suggestedCost = p.compute[suggested] * workload.computeCount;
      recommendations.push({
        id: `rs-${rId++}`,
        currentTier: `${provider} ${workload.computeTier} (×${workload.computeCount})`,
        suggestedTier: `${provider} ${suggested} (×${workload.computeCount})`,
        currentMonthlyCost: round2(current),
        suggestedMonthlyCost: round2(suggestedCost),
        monthlySavings: round2(current - suggestedCost),
        reason: `CPU utilization is typically below 40% for ${workloadProfile} workloads. Downsizing saves ${Math.round(((current - suggestedCost) / current) * 100)}% on compute without performance impact.`,
        impact: 'medium',
        category: 'compute',
        provider,
        action: `Resize instances from ${workload.computeTier} to ${suggested} tier`,
      });
    }
  }

  // Database rightsizing
  if (workload.databaseCount > 0 && workload.databaseTier !== 'small') {
    const tiers: WorkloadTier[] = ['small', 'medium', 'large'];
    const currentIdx = tiers.indexOf(workload.databaseTier);
    if (currentIdx > 0) {
      const suggested = tiers[currentIdx - 1];
      const current = p.database[workload.databaseTier] * workload.databaseCount;
      const suggestedCost = p.database[suggested] * workload.databaseCount;
      recommendations.push({
        id: `rs-${rId++}`,
        currentTier: `${provider} DB ${workload.databaseTier} (×${workload.databaseCount})`,
        suggestedTier: `${provider} DB ${suggested} (×${workload.databaseCount})`,
        currentMonthlyCost: round2(current),
        suggestedMonthlyCost: round2(suggestedCost),
        monthlySavings: round2(current - suggestedCost),
        reason: `Database connections and query load suggest ${suggested} tier is sufficient. Consider read replicas for read-heavy patterns instead of a larger primary.`,
        impact: 'medium',
        category: 'database',
        provider,
        action: `Downsize DB from ${workload.databaseTier} to ${suggested} tier`,
      });
    }
  }

  // Storage optimization
  if (workload.storageSsdGb > 50) {
    const currentCost = workload.storageSsdGb * p.storage.ssd;
    const coldPortion = workload.storageSsdGb * 0.4; // 40% of data can be cold
    const suggestedCost = (workload.storageSsdGb - coldPortion) * p.storage.ssd + coldPortion * p.storage.hdd;
    recommendations.push({
      id: `rs-${rId++}`,
      currentTier: `${workload.storageSsdGb} GB all-SSD`,
      suggestedTier: `${round2(workload.storageSsdGb - coldPortion)} GB SSD + ${round2(coldPortion)} GB HDD`,
      currentMonthlyCost: round2(currentCost),
      suggestedMonthlyCost: round2(suggestedCost),
      monthlySavings: round2(currentCost - suggestedCost),
      reason: 'Analysis shows ~40% of stored data has low access frequency. Tiering cold data to HDD/archive storage significantly reduces costs.',
      impact: 'low',
      category: 'storage',
      provider,
      action: 'Enable storage lifecycle policy to tier cold data automatically',
    });
  }

  // Network optimization (egress)
  if (workload.egressGb > 100) {
    const currentEgress = workload.egressGb * p.network.egress;
    const withCdn = workload.egressGb * p.network.egress * 0.4; // CDN reduces egress 60%
    recommendations.push({
      id: `rs-${rId++}`,
      currentTier: `${workload.egressGb} GB direct egress`,
      suggestedTier: `CDN-cached delivery`,
      currentMonthlyCost: round2(currentEgress),
      suggestedMonthlyCost: round2(withCdn),
      monthlySavings: round2(currentEgress - withCdn),
      reason: `${workload.egressGb} GB/mo egress is better served through a CDN. Cache-hit ratios of 60–80% are typical for web workloads, directly reducing origin egress charges.`,
      impact: 'medium',
      category: 'network',
      provider,
      action: `Enable ${provider === 'AWS' ? 'CloudFront' : provider === 'AZURE' ? 'Azure CDN' : 'Cloud CDN'} with appropriate cache policies`,
    });
  }

  const totalCurrent = round2(recommendations.reduce((s, r) => s + r.currentMonthlyCost, 0));
  const totalSuggested = round2(recommendations.reduce((s, r) => s + r.suggestedMonthlyCost, 0));
  const totalSavings = round2(totalCurrent - totalSuggested);

  return {
    recommendations,
    totalCurrentMonthly: totalCurrent,
    totalSuggestedMonthly: totalSuggested,
    totalMonthlySavings: totalSavings,
    savingsPct: totalCurrent > 0 ? Math.round((totalSavings / totalCurrent) * 100) : 0,
    computedAt: new Date().toISOString(),
  };
}

/* ================================================================
   Provider-Specific Optimization Tips
   ================================================================ */

export interface OptimizationTip {
  id: string;
  provider: CostProvider | 'ALL';
  category: 'compute' | 'database' | 'storage' | 'network' | 'architecture' | 'billing';
  title: string;
  description: string;
  estimatedSavingsPct: number;
  effort: 'low' | 'medium' | 'high';
  link?: string;
}

export function getOptimizationTips(provider?: CostProvider): OptimizationTip[] {
  const tips: OptimizationTip[] = [
    // Universal
    { id: 'tip-1', provider: 'ALL', category: 'compute', title: 'Schedule non-production environments', description: 'Shut down dev/staging environments outside business hours (e.g., 8 PM–8 AM) to save ~50% on non-production compute costs.', estimatedSavingsPct: 50, effort: 'low' },
    { id: 'tip-2', provider: 'ALL', category: 'storage', title: 'Implement storage lifecycle policies', description: 'Automatically transition infrequently accessed data to cheaper storage tiers. Most cloud providers offer 3–4 tiers with up to 90% cost difference.', estimatedSavingsPct: 40, effort: 'low' },
    { id: 'tip-3', provider: 'ALL', category: 'architecture', title: 'Use serverless for bursty workloads', description: 'Replace always-on VMs with serverless functions for event-driven, low-traffic endpoints. Pay only for actual invocations.', estimatedSavingsPct: 70, effort: 'high' },
    { id: 'tip-4', provider: 'ALL', category: 'network', title: 'Enable CDN for static assets', description: 'Serve static content from edge locations to reduce origin compute load and egress charges by 60–80%.', estimatedSavingsPct: 60, effort: 'low' },
    { id: 'tip-5', provider: 'ALL', category: 'billing', title: 'Set up budget alerts', description: 'Configure billing alerts at 50%, 80%, and 100% of your monthly budget to catch unexpected cost spikes early.', estimatedSavingsPct: 5, effort: 'low' },
    { id: 'tip-6', provider: 'ALL', category: 'database', title: 'Use connection pooling', description: 'Implement connection pooling (PgBouncer, ProxySQL) to reduce DB resource usage and potentially downsize the instance.', estimatedSavingsPct: 15, effort: 'medium' },

    // AWS specific
    { id: 'tip-aws-1', provider: 'AWS', category: 'compute', title: 'Use Graviton instances', description: 'ARM-based Graviton instances offer up to 40% better price-performance than x86 equivalents for compatible workloads.', estimatedSavingsPct: 40, effort: 'medium' },
    { id: 'tip-aws-2', provider: 'AWS', category: 'storage', title: 'Use S3 Intelligent Tiering', description: 'S3 Intelligent Tiering automatically moves objects between access tiers. No retrieval fees, minimal management overhead.', estimatedSavingsPct: 30, effort: 'low' },
    { id: 'tip-aws-3', provider: 'AWS', category: 'network', title: 'Use VPC endpoints for AWS services', description: 'Replace NAT Gateway data processing charges with VPC endpoints for S3, DynamoDB, and other AWS services.', estimatedSavingsPct: 25, effort: 'medium' },

    // Azure specific
    { id: 'tip-az-1', provider: 'AZURE', category: 'compute', title: 'Enable Azure Hybrid Benefit', description: 'Use existing Windows Server or SQL Server licenses to save up to 40% on Azure VMs and SQL Database.', estimatedSavingsPct: 40, effort: 'low' },
    { id: 'tip-az-2', provider: 'AZURE', category: 'compute', title: 'Use Bsv2-series for burstable workloads', description: 'B-series VMs accumulate CPU credits during low usage and burst when needed, ideal for dev/test and web servers.', estimatedSavingsPct: 30, effort: 'low' },
    { id: 'tip-az-3', provider: 'AZURE', category: 'database', title: 'Use Serverless Azure SQL', description: 'Auto-pause Azure SQL Database during inactivity. Pay only when the database is actively processing queries.', estimatedSavingsPct: 50, effort: 'medium' },

    // GCP specific
    { id: 'tip-gcp-1', provider: 'GCP', category: 'compute', title: 'Leverage sustained use discounts', description: 'GCP automatically applies discounts of up to 30% for VMs running more than 25% of the month. No commitment required.', estimatedSavingsPct: 30, effort: 'low' },
    { id: 'tip-gcp-2', provider: 'GCP', category: 'compute', title: 'Use custom machine types', description: 'GCP allows custom vCPU/memory ratios so you pay only for the resources you need, unlike fixed instance families.', estimatedSavingsPct: 20, effort: 'medium' },
    { id: 'tip-gcp-3', provider: 'GCP', category: 'storage', title: 'Use Nearline/Coldline for archives', description: 'Nearline ($0.01/GB/mo) and Coldline ($0.004/GB/mo) storage classes offer massive savings for infrequently accessed data.', estimatedSavingsPct: 80, effort: 'low' },
  ];

  if (provider) {
    return tips.filter((t) => t.provider === provider || t.provider === 'ALL');
  }
  return tips;
}

/* ================================================================
   Available workload profiles for the frontend
   ================================================================ */

export function getWorkloadProfiles(): { id: string; label: string; description: string }[] {
  return Object.keys(WORKLOAD_PROFILES).map((id) => {
    const labels: Record<string, string> = {
      'web-small': 'Small Web App',
      'web-medium': 'Medium Web App',
      'web-large': 'Large Web App',
      'microservices-small': 'Small Microservices',
      'microservices-medium': 'Medium Microservices',
      'data-pipeline': 'Data Pipeline',
      'static-site': 'Static Website',
    };
    const descriptions: Record<string, string> = {
      'web-small': '1 VM, 1 DB, basic networking',
      'web-medium': '2 VMs + LB, 1 DB, NAT gateway',
      'web-large': '4 VMs + LB, large DB, high egress',
      'microservices-small': '3 VMs, Kubernetes, 1 DB',
      'microservices-medium': '6 VMs, Kubernetes, 2 DBs',
      'data-pipeline': '2 large VMs, large DB, high storage',
      'static-site': 'Object storage + CDN',
    };
    return { id, label: labels[id] ?? id, description: descriptions[id] ?? '' };
  });
}

/* ================================================================
   Savings Plans Listing
   ================================================================ */

export function getSavingsPlans(provider: CostProvider): SavingsPlan[] {
  return SAVINGS_PLANS[provider];
}

/* ================================================================
   Helpers
   ================================================================ */

const round2 = (n: number) => Math.round(n * 100) / 100;
