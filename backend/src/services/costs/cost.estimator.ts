/**
 * Cost Estimation Service — PDF section 5.13 (Cost-Aware Deployment Selection).
 *
 * Estimates are *estimates*, never bills: every result carries a currency,
 * pricing basis, assumptions list, region, and computed-at timestamp
 * (technical invariant: "Cost estimates are labelled as estimates").
 *
 * Offline-first: uses a built-in rate card with region multipliers so the
 * platform can show costs without live pricing integrations. When a provider
 * pricing API is later integrated, `source` flips from the built-in card to
 * the live source and the rest of the contract stays identical.
 */

export type CostProvider = 'AWS' | 'AZURE' | 'GCP';
export type CostScope = 'template' | 'deployment';

export interface CostLineItem {
  resourceType: string;
  label: string;
  quantity: number;
  unit: string;
  unitMonthlyUsd: number;
  monthlyUsd: number;
  basis: string;
}

export interface CostAssumptions {
  label: string;
  value: string;
}

export interface CostEstimateResult {
  scope: CostScope;
  scopeId: string;
  provider: CostProvider | null;
  region: string | null;
  currency: 'USD';
  monthlyTotalUsd: number;
  lineItems: CostLineItem[];
  assumptions: CostAssumptions[];
  source: string;
  computedAt: string;
}

/** Region price multipliers relative to the baseline region. */
const REGION_MULTIPLIERS: Record<string, number> = {
  'us-east-1': 1.0, 'us-east-2': 0.94, 'us-west-2': 1.08,
  'eu-west-1': 1.05, 'eu-central-1': 1.06, 'ap-south-1': 0.92, 'ap-southeast-1': 1.05,
  eastus: 1.0, eastus2: 0.94, westeurope: 1.09, southeastasia: 1.05,
  'us-central1': 1.0, 'us-east1': 1.02, 'europe-west1': 1.08, 'asia-southeast1': 1.03,
};

const DEFAULT_MULTIPLIER = 1.1;

function regionMultiplier(provider: CostProvider, region?: string | null): number {
  if (!region) return DEFAULT_MULTIPLIER;
  return REGION_MULTIPLIERS[region] ?? DEFAULT_MULTIPLIER;
}

/** Baseline regions per provider for configuration-scope estimates. */
const BASELINE_REGIONS: Record<CostProvider, string> = {
  AWS: 'us-east-1',
  AZURE: 'eastus',
  GCP: 'us-central1',
};

interface RateCardEntry {
  label: string;
  unit: string;
  unitMonthlyUsd: number;
  basis: string;
  quantityFromConfig?: (config: Record<string, unknown>) => number;
}

/**
 * Offline rate card (USD/month, baseline region).
 * `resourceType` matches Terraform resource types so plan/apply artifacts
 * price directly; configuration-level pricing maps template archetypes to
 * an equivalent composition.
 */
const RATE_CARD: Record<string, RateCardEntry> = {
  compute: {
    label: 'Compute instance',
    unit: 'instance',
    unitMonthlyUsd: 24.0, // small general-purpose tier, baseline region
    basis: 'on-demand general-purpose small tier',
    quantityFromConfig: (c) => Math.max(1, Number(c['instance_count'] ?? c['node_count'] ?? c['count'] ?? 1)) || 1,
  },
  storage: {
    label: 'Block storage',
    unit: 'GB-month',
    unitMonthlyUsd: 0.1,
    basis: 'standard SSD tier',
    quantityFromConfig: (c) => Math.max(8, Number(c['volume_size'] ?? c['disk_size'] ?? c['root_volume_size'] ?? 8)) || 8,
  },
  database: {
    label: 'Managed database',
    unit: 'instance',
    unitMonthlyUsd: 32.0,
    basis: 'single-AZ small tier',
    quantityFromConfig: (c) => Math.max(1, Number(c['instance_count'] ?? 1)) || 1,
  },
  network: {
    label: 'Network (VPC/NAT)',
    unit: 'flat',
    unitMonthlyUsd: 8.0,
    basis: 'NAT processing + networking overhead, flat',
    quantityFromConfig: () => 1,
  },
  cluster: {
    label: 'Managed Kubernetes control plane',
    unit: 'cluster',
    unitMonthlyUsd: 73.0,
    basis: 'standard control-plane tier (worker nodes priced as compute)',
    quantityFromConfig: (c) => Math.max(1, Number(c['node_count'] ?? 1)) || 1,
  },
  loadbalancer: {
    label: 'Load balancer',
    unit: 'flat',
    unitMonthlyUsd: 16.0,
    basis: 'standard L4/L7 tier, flat',
    quantityFromConfig: () => 1,
  },
  autoscaling: {
    label: 'Autoscaling group',
    unit: 'group',
    unitMonthlyUsd: 0.0, // ASG itself is free; instances priced as compute
    basis: 'group orchestration is free; member instances priced as compute',
    quantityFromConfig: () => 1,
  },
  objectstorage: {
    label: 'Object storage',
    unit: 'GB-month',
    unitMonthlyUsd: 0.023,
    basis: 'standard infrequent-access tier',
    quantityFromConfig: (c) => Math.max(5, Number(c['storage_gb'] ?? 5)) || 5,
  },
};

/** Template archetype → equivalent composition for pre-deployment estimates. */
const TEMPLATE_ARCHETYPE: Record<string, string[]> = {
  web: ['compute', 'storage'],
  compute: ['compute', 'storage'],
  network: ['network'],
  database: ['database', 'storage'],
  cluster: ['cluster', 'compute', 'network'],
  loadbalancer: ['loadbalancer', 'network'],
  autoscaling: ['compute', 'autoscaling'],
  storage: ['objectstorage'],
};

function classify(templateName: string): string[] {
  const name = String(templateName ?? '').toLowerCase();
  for (const [key, classes] of Object.entries(TEMPLATE_ARCHETYPE)) {
    if (name.includes(key)) return classes;
  }
  return ['compute', 'storage'];
}

function lineItem(cls: string, quantity: number, multiplier: number): CostLineItem | null {
  const entry = RATE_CARD[cls];
  if (!entry) return null;
  const monthlyUsd = Math.round(entry.unitMonthlyUsd * quantity * multiplier * 100) / 100;
  return {
    resourceType: cls,
    label: entry.label,
    quantity,
    unit: entry.unit,
    unitMonthlyUsd: entry.unitMonthlyUsd,
    monthlyUsd,
    basis: entry.basis,
  };
}

export interface TemplateEstimateInput {
  templateName: string;
  provider: CostProvider;
  configuration?: Record<string, unknown>;
  region?: string | null;
}

/** Estimate the monthly cost of deploying a template with a given configuration. */
export function estimateTemplateCost(input: TemplateEstimateInput): CostEstimateResult {
  const region = input.region ?? BASELINE_REGIONS[input.provider];
  const multiplier = regionMultiplier(input.provider, region);
  const config = input.configuration ?? {};
  const classes = classify(input.templateName);

  const lineItems: CostLineItem[] = [];
  for (const cls of classes) {
    const quantity = RATE_CARD[cls]?.quantityFromConfig?.(config) ?? 1;
    const item = lineItem(cls, quantity, multiplier);
    if (item) lineItems.push(item);
  }

  const monthlyTotalUsd = Math.round(lineItems.reduce((s, i) => s + i.monthlyUsd, 0) * 100) / 100;

  return {
    scope: 'template',
    scopeId: input.templateName,
    provider: input.provider,
    region,
    currency: 'USD',
    monthlyTotalUsd,
    lineItems,
    assumptions: [
      { label: 'Pricing source', value: 'built-in offline rate card' },
      { label: 'Baseline region', value: `${region} (multiplier ×${multiplier})` },
      { label: 'Billing period', value: '730 hours/month, on-demand' },
      { label: 'Excluded', value: 'egress, licenses, tax/credits, free-tier effects' },
    ],
    source: 'builtin-rate-card-v1',
    computedAt: new Date().toISOString(),
  };
}

export interface ResourceLike {
  resourceType: string;
  name?: string | null;
}

/** Map a Terraform resource type (e.g. `aws_instance`) to a rate-card class. */
export function classifyTerraformResource(resourceType: string): string | null {
  const t = resourceType.toLowerCase();
  // databases first: `aws_db_instance` contains "instance" but is a database
  if (/(eks|gke|aks|kubernetes)/.test(t)) return 'cluster';
  if (/(db|database|sql)/.test(t)) return 'database';
  if (/(volume|disk|ebs|managed_disk)/.test(t)) return 'storage';
  if (/(s3|bucket|storage_account)/.test(t)) return 'objectstorage';
  if (/(lb|load_balancer|loadbalancer)/.test(t)) return 'loadbalancer';
  if (/(nat|vpc|virtual_network|subnet|network)/.test(t)) return 'network';
  if (/autoscaling/.test(t)) return 'autoscaling';
  if (/(instance|virtual_machine|compute|node_pool|web_app|vm)/.test(t)) return 'compute';
  return null;
}

export interface DeploymentEstimateInput {
  deploymentId: string;
  provider: CostProvider;
  region: string | null;
  resources: ResourceLike[];
  configuration?: Record<string, unknown> | null;
}

/** Estimate the monthly cost of a deployment's actual provisioned resources. */
export function estimateDeploymentCost(input: DeploymentEstimateInput): CostEstimateResult {
  const multiplier = regionMultiplier(input.provider, input.region);
  const classTotals = new Map<string, number>();

  for (const res of input.resources) {
    const cls = classifyTerraformResource(res.resourceType);
    if (cls) classTotals.set(cls, (classTotals.get(cls) ?? 0) + 1);
  }

  const lineItems: CostLineItem[] = [];
  for (const [cls, count] of classTotals) {
    const entry = RATE_CARD[cls];
    if (!entry || entry.unitMonthlyUsd === 0) continue;
    const quantity = cls === 'storage' ? 8 * count : count; // assume 8GB boot volume per compute-ish unit
    const item = lineItem(cls, quantity, multiplier);
    if (item) lineItems.push(item);
  }

  const monthlyTotalUsd = Math.round(lineItems.reduce((s, i) => s + i.monthlyUsd, 0) * 100) / 100;

  return {
    scope: 'deployment',
    scopeId: input.deploymentId,
    provider: input.provider,
    region: input.region,
    currency: 'USD',
    monthlyTotalUsd,
    lineItems,
    assumptions: [
      { label: 'Pricing source', value: 'built-in offline rate card' },
      { label: 'Region', value: `${input.region ?? 'default'} (multiplier ×${multiplier})` },
      { label: 'Storage sizing', value: '8 GB boot volume assumed per storage-backed unit' },
      { label: 'Excluded', value: 'egress, licenses, tax/credits, free-tier effects' },
    ],
    source: 'builtin-rate-card-v1',
    computedAt: new Date().toISOString(),
  };
}
