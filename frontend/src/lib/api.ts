import { env } from '../config/env';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'DEVELOPER';
  createdAt?: string;
  updatedAt?: string;
}

export interface UserWithCounts extends User {
  _count?: {
    projects?: number;
    deployments?: number;
    designs?: number;
    cloudAccounts?: number;
  };
}

export interface Environment {
  id: string;
  name: string;
  projectId: string;
  cloudAccountId?: string | null;
  cloudAccount?: CloudAccount | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  environments: Environment[];
  cloudAccounts?: CloudAccount[];
  owner?: User;
  _count?: {
    deployments?: number;
  };
}

export interface CloudAccount {
  id: string;
  name: string;
  provider: 'AWS' | 'AZURE' | 'GCP';
  accountReference: string;
  ownerId: string;
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: User;
}

export interface Template {
  id: string;
  name: string;
  provider: 'AWS' | 'AZURE' | 'GCP' | null;
  version: string;
  description?: string | null;
  inputSchema: Record<string, any>;
  templateReference: string;
  createdAt: string;
  updatedAt: string;
}

export interface Deployment {
  id: string;
  projectId: string;
  environmentId: string;
  templateId: string;
  userId: string;
  operationType: 'CREATE' | 'MODIFY' | 'DESTROY';
  status:
    | 'DRAFT'
    | 'PLANNING'
    | 'PLANNED'
    | 'QUEUED'
    | 'RUNNING'
    | 'SUCCEEDED'
    | 'FAILED'
    | 'CANCELLED';
  configuration: Record<string, any>;
  planOutput?: string | null;
  applyOutput?: string | null;
  executionReference?: string | null;
  costEstimate?: any;
  policyEvaluation?: any;
  planTime?: string | null;
  applyTime?: string | null;
  createdAt: string;
  updatedAt: string;
  project?: Project;
  environment?: Environment;
  template?: Template;
  user?: User;
}

export interface Resource {
  id: string;
  deploymentId: string;
  provider: 'AWS' | 'AZURE' | 'GCP';
  resourceType: string;
  providerResourceId?: string | null;
  name?: string | null;
  status: 'PENDING' | 'PROVISIONING' | 'ACTIVE' | 'FAILED' | 'DESTROYING' | 'DESTROYED';
  outputs?: any;
  dependencies?: any;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  projectId?: string | null;
  deploymentId?: string | null;
  action: string;
  status: string;
  message: string;
  metadata?: any;
  timestamp: string;
  user?: User | null;
  project?: { id: string; name: string } | null;
  deployment?: { id: string; operationType: string; status: string } | null;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  service: string;
  environment: string;
  version: string;
}

// Token management in localStorage
const TOKEN_KEY = 'multicloud_token';
const REFRESH_TOKEN_KEY = 'multicloud_refresh_token';
const USER_KEY = 'multicloud_user';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredRefreshToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

let refreshInFlightPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  if (refreshInFlightPromise) {
    return refreshInFlightPromise;
  }

  refreshInFlightPromise = (async () => {
    try {
      const url = `${env.API_URL}/auth/refresh`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        setStoredToken(null);
        setStoredRefreshToken(null);
        setStoredUser(null);
        return null;
      }

      const data = await res.json();
      if (data?.accessToken) {
        setStoredToken(data.accessToken);
        if (data.refreshToken) {
          setStoredRefreshToken(data.refreshToken);
        }
        return data.accessToken;
      }
      return null;
    } catch {
      setStoredToken(null);
      setStoredRefreshToken(null);
      setStoredUser(null);
      return null;
    } finally {
      refreshInFlightPromise = null;
    }
  })();

  return refreshInFlightPromise;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry: boolean = false
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${env.API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/register') || endpoint.includes('/auth/refresh');

  if (res.status === 401 && !isAuthEndpoint && !isRetry) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      return request<T>(endpoint, options, true);
    }
  }

  const contentType = res.headers.get('content-type');
  let data: any = null;
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const message = data?.message || data?.error || `Request failed with status ${res.status}`;
    const error = new Error(message);
    (error as any).status = res.status;
    (error as any).data = data;
    throw error;
  }

  return data as T;
}

export const api = {
  health: {
    get: () => request<HealthResponse>('/health'),
  },

  auth: {
    login: async (email: string, password: string) => {
      const res = await request<{ user: User; accessToken: string; refreshToken?: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setStoredToken(res.accessToken);
      if (res.refreshToken) {
        setStoredRefreshToken(res.refreshToken);
      }
      setStoredUser(res.user);
      return res;
    },

    register: async (name: string, email: string, password: string) => {
      const res = await request<{ user: User; accessToken: string; refreshToken?: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      setStoredToken(res.accessToken);
      if (res.refreshToken) {
        setStoredRefreshToken(res.refreshToken);
      }
      setStoredUser(res.user);
      return res;
    },

    refresh: async () => {
      const token = await refreshAccessToken();
      return { accessToken: token };
    },

    me: () => request<{ user: User }>('/auth/me'),

    logout: () => {
      setStoredToken(null);
      setStoredRefreshToken(null);
      setStoredUser(null);
    },
  },

  projects: {
    list: () => request<{ projects: Project[] }>('/projects'),
    get: (id: string) => request<{ project: Project }>(`/projects/${id}`),
    create: (data: { name: string; description?: string; createDefaultEnvironments?: boolean }) =>
      request<{ project: Project }>('/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    createEnvironment: (projectId: string, data: { name: string; cloudAccountId?: string }) =>
      request<{ environment: Environment }>(`/projects/${projectId}/environments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    bindCloudAccount: (projectId: string, environmentId: string, cloudAccountId: string | null) =>
      request<{ message: string; environment: Environment }>(
        `/projects/${projectId}/environments/${environmentId}/account`,
        {
          method: 'PATCH',
          body: JSON.stringify({ cloudAccountId }),
        },
      ),
  },

  cloudAccounts: {
    list: () => request<{ cloudAccounts: CloudAccount[] }>('/cloud-accounts'),
    get: (id: string) => request<{ cloudAccount: CloudAccount }>(`/cloud-accounts/${id}`),
    create: (data: {
      name: string;
      provider: 'AWS' | 'AZURE' | 'GCP';
      accountReference: string;
      credentials: Record<string, string>;
      projectId?: string;
    }) =>
      request<{ message: string; cloudAccount: CloudAccount }>('/cloud-accounts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: string, confirmation: string) =>
      request<{ message: string }>(`/cloud-accounts/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ confirmation }),
      }),
  },

  templates: {
    list: (provider?: string) =>
      request<{ templates: Template[] }>(`/templates${provider ? `?provider=${provider}` : ''}`),
    get: (id: string) => request<{ template: Template }>(`/templates/${id}`),
    validate: (id: string, configuration: Record<string, any>) =>
      request<{ valid: boolean; message: string; errors?: any[]; sanitizedConfiguration?: any }>(
        `/templates/${id}/validate`,
        {
          method: 'POST',
          body: JSON.stringify({ configuration }),
        }
      ),
    sync: () =>
      request<{ message: string; syncedCount: number; templates: Template[] }>('/templates/sync', {
        method: 'POST',
      }),
  },

  deployments: {
    list: (filters?: { projectId?: string; environmentId?: string; status?: string }) => {
      const params = new URLSearchParams();
      if (filters?.projectId) params.set('projectId', filters.projectId);
      if (filters?.environmentId) params.set('environmentId', filters.environmentId);
      if (filters?.status) params.set('status', filters.status);
      const query = params.toString();
      return request<{ deployments: Deployment[] }>(`/deployments${query ? `?${query}` : ''}`);
    },
    get: (id: string) => request<{ deployment: Deployment }>(`/deployments/${id}`),
    createPlan: (data: { projectId: string; environmentId: string; templateId: string; configuration: Record<string, any> }) =>
      request<{ deployment: Deployment; message: string }>('/deployments/plan', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    approve: (
      id: string,
      data?: { confirmationKeyword?: string; comment?: string }
    ) =>
      request<{ deployment: Deployment; message: string }>(`/deployments/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
    createDestroyPlan: (id: string) =>
      request<{ deployment: Deployment; message: string }>(`/deployments/${id}/destroy-plan`, {
        method: 'POST',
      }),
    createEnvironmentDestroyPlan: (data: {
      projectId?: string;
      environmentId?: string;
      templateId?: string;
      configuration?: Record<string, any>;
    }) =>
      request<{ deployment: Deployment; message: string }>('/deployments/destroy-plan', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    confirmDestroy: (
      id: string,
      data: { confirmationKeyword: string; comment?: string }
    ) =>
      request<{ deployment: Deployment; message: string }>(`/deployments/${id}/confirm-destroy`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  resources: {
    list: (filters?: { projectId?: string; deploymentId?: string }) => {
      const params = new URLSearchParams();
      if (filters?.projectId) params.set('projectId', filters.projectId);
      if (filters?.deploymentId) params.set('deploymentId', filters.deploymentId);
      const query = params.toString();
      return request<{ resources: Resource[] }>(`/resources${query ? `?${query}` : ''}`);
    },
    get: (id: string) => request<{ resource: Resource }>(`/resources/${id}`),
  },

  auditLogs: {
    list: (filters?: { action?: string; status?: string; projectId?: string; limit?: number }) => {
      const params = new URLSearchParams();
      if (filters?.action) params.set('action', filters.action);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.projectId) params.set('projectId', filters.projectId);
      if (filters?.limit) params.set('limit', filters.limit.toString());
      const query = params.toString();
      return request<{ auditLogs: AuditLog[] }>(`/audit-logs${query ? `?${query}` : ''}`);
    },
  },

  costs: {
    estimate: (data: { templateName: string; provider: 'AWS' | 'AZURE' | 'GCP'; configuration?: Record<string, any>; region?: string | null }) =>
      request<{ estimate: CostEstimate }>('/costs/estimate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    summary: (projectId?: string) =>
      request<CostSummary>(`/costs/summary${projectId ? `?projectId=${projectId}` : ''}`),
    optimizations: (projectId?: string) =>
      request<CostOptimizations>(`/costs/optimizations${projectId ? `?projectId=${projectId}` : ''}`),
    compare: (workload?: string) =>
      request<MultiCloudComparison>(`/costs/compare${workload ? `?workload=${workload}` : ''}`),
    scaling: (provider?: string, workload?: string) => {
      const params = new URLSearchParams();
      if (provider) params.set('provider', provider);
      if (workload) params.set('workload', workload);
      const q = params.toString();
      return request<ScalingAnalysis>(`/costs/scaling${q ? `?${q}` : ''}`);
    },
    trends: (provider?: string, baseMonthly?: number, growthRate?: number) => {
      const params = new URLSearchParams();
      if (provider) params.set('provider', provider);
      if (baseMonthly !== undefined) params.set('baseMonthly', String(baseMonthly));
      if (growthRate !== undefined) params.set('growthRate', String(growthRate));
      const q = params.toString();
      return request<CostTrendProjection>(`/costs/trends${q ? `?${q}` : ''}`);
    },
    rightsizing: (provider?: string, workload?: string) => {
      const params = new URLSearchParams();
      if (provider) params.set('provider', provider);
      if (workload) params.set('workload', workload);
      const q = params.toString();
      return request<RightsizingReport>(`/costs/rightsizing${q ? `?${q}` : ''}`);
    },
    tips: (provider?: string) =>
      request<{ tips: OptimizationTip[] }>(`/costs/tips${provider ? `?provider=${provider}` : ''}`),
    workloadProfiles: () =>
      request<{ profiles: WorkloadProfile[] }>('/costs/workload-profiles'),
    savingsPlans: (provider?: string) =>
      request<{ provider: string; plans: SavingsPlan[] }>(`/costs/savings-plans${provider ? `?provider=${provider}` : ''}`),
  },

  topology: {
    get: (projectId?: string) =>
      request<{ graph: TopologyGraph; note: string }>(`/topology${projectId ? `?projectId=${projectId}` : ''}`),
  },

  designs: {
    list: () => request<{ designs: DesignSummary[] }>('/designs'),
    get: (id: string) => request<{ design: ArchitectureDesign }>(`/designs/${id}`),
    create: (data: { name: string; description?: string; cloudProvider?: string; nodes?: CanvasNode[]; edges?: CanvasEdge[] }) =>
      request<{ design: ArchitectureDesign }>('/designs', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<{ name: string; description: string; cloudProvider: string; nodes: CanvasNode[]; edges: CanvasEdge[] }>) =>
      request<{ design: ArchitectureDesign }>(`/designs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<{ success: boolean }>(`/designs/${id}`, { method: 'DELETE' }),
    deploy: (
      id: string,
      data: {
        projectId: string;
        environmentId: string;
        configuration?: Record<string, unknown>;
        name?: string;
        description?: string;
        cloudProvider?: string;
        nodes?: CanvasNode[];
        edges?: CanvasEdge[];
      },
    ) =>
      request<{ deployment: Deployment; template: Template; message: string }>(`/designs/${id}/deploy`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  ai: {
    generateArchitecture: (data: { prompt: string; cloudProvider?: 'AWS' | 'AZURE' | 'GCP' | 'MULTI' }) =>
      request<{ architecture: GeneratedArchitecture }>('/ai/generate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  users: {
    list: () => request<{ users: UserWithCounts[] }>('/users'),
    get: (id: string) => request<{ user: UserWithCounts }>(`/users/${id}`),
    getActivity: (id: string) =>
      request<{
        user: User;
        activity: {
          projects: Project[];
          deployments: Deployment[];
          designs: ArchitectureDesign[];
          cloudAccounts: CloudAccount[];
          auditLogs: AuditLog[];
        };
      }>(`/users/${id}/activity`),
    updateRole: (id: string, role: 'DEVELOPER') =>
      request<{ user: User; message: string }>(`/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/users/${id}`, {
        method: 'DELETE',
      }),
  },
};

// ==========================================
// Visual Designer Types (Brainboard-style canvas)
// ==========================================

export interface CostLineItem {
  resourceType: string;
  label: string;
  quantity: number;
  unit: string;
  unitMonthlyUsd: number;
  monthlyUsd: number;
  basis: string;
}

export interface CostEstimate {
  scope: 'template' | 'deployment';
  scopeId: string;
  provider: 'AWS' | 'AZURE' | 'GCP' | null;
  region: string | null;
  currency: 'USD';
  monthlyTotalUsd: number;
  lineItems: CostLineItem[];
  assumptions: { label: string; value: string }[];
  source: string;
  computedAt: string;
}

export interface CostSummaryProject {
  projectId: string;
  projectName: string;
  monthlyTotalUsd: number;
  deployments: {
    deploymentId: string;
    environmentName: string | null;
    estimate: CostEstimate;
  }[];
}

export interface CostSummary {
  currency: 'USD';
  source: string;
  label: string;
  monthlyTotalUsd: number;
  projects: CostSummaryProject[];
  computedAt: string;
}

export interface CostRecommendation {
  id: string;
  deploymentId: string | null;
  projectName: string | null;
  environmentName: string | null;
  rule: string;
  severity: 'info' | 'warning' | 'opportunity';
  title: string;
  detail: string;
  steps: string[];
  estimatedMonthlySavingsUsd: number;
}

export interface CostOptimizations {
  currency: 'USD';
  currentMonthlyUsd: number;
  projectedMonthlyUsd: number;
  totalEstimatedMonthlySavingsUsd: number;
  savingsPct: number;
  recommendations: CostRecommendation[];
  source: string;
  label: string;
  computedAt: string;
}

// ==========================================
// Cost Optimization Center Types
// ==========================================

export interface CloudCostBreakdown {
  provider: 'AWS' | 'AZURE' | 'GCP';
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
  cheapestProvider: 'AWS' | 'AZURE' | 'GCP';
  mostExpensiveProvider: 'AWS' | 'AZURE' | 'GCP';
  maxSavingsUsd: number;
  maxSavingsPct: number;
  recommendation: string;
  computedAt: string;
}

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
  provider: 'AWS' | 'AZURE' | 'GCP';
  baselineCost: number;
  scenarios: ScalingScenario[];
  scalingStrategy: string;
  autoScalingTips: string[];
  computedAt: string;
}

export interface CostTrendPoint {
  month: string;
  monthIndex: number;
  onDemand: number;
  reserved: number;
  optimized: number;
}

export interface CostTrendProjection {
  provider: 'AWS' | 'AZURE' | 'GCP';
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
  provider: 'AWS' | 'AZURE' | 'GCP';
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

export interface OptimizationTip {
  id: string;
  provider: 'AWS' | 'AZURE' | 'GCP' | 'ALL';
  category: 'compute' | 'database' | 'storage' | 'network' | 'architecture' | 'billing';
  title: string;
  description: string;
  estimatedSavingsPct: number;
  effort: 'low' | 'medium' | 'high';
}

export interface WorkloadProfile {
  id: string;
  label: string;
  description: string;
}

export interface SavingsPlan {
  plan: string;
  description: string;
  discountPct: number;
  commitment: string;
  risk: 'none' | 'low' | 'medium' | 'high';
}

export type TopologyNodeKind = 'network' | 'compute' | 'database' | 'storage' | 'loadbalancer' | 'cluster' | 'other';

export interface TopologyNode {
  id: string;
  label: string;
  kind: TopologyNodeKind;
  provider: 'AWS' | 'AZURE' | 'GCP';
  resourceType: string;
  status: string;
  providerResourceId: string | null;
  deploymentId: string;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  kind: 'declared' | 'inferred';
}

export interface TopologyGraph {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  unlinkedCount: number;
}

export interface DesignSummary {
  id: string;
  name: string;
  description?: string | null;
  cloudProvider: string;
  nodeCount: number;
  edgeCount: number;
  updatedAt?: string;
}

export interface ArchitectureDesign {
  id: string;
  name: string;
  description?: string | null;
  cloudProvider: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CanvasNode {
  id: string;
  kind:
    | 'network'
    | 'compute'
    | 'database'
    | 'storage'
    | 'serverless'
    | 'nosql'
    | 'queue'
    | 'loadbalancer'
    | 'kubernetes';
  position: { x: number; y: number };
  data: {
    kind: CanvasNode['kind'];
    label: string;
    provider: 'AWS' | 'AZURE' | 'GCP';
    templateRef: string;
    config: Record<string, any>;
    monthlyCost?: number;
    notes?: string;
  };
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface GeneratedArchitecture {
  name: string;
  description: string;
  cloudProvider: 'AWS' | 'AZURE' | 'GCP';
  rationale: string;
  estimatedCostMonthlyUsd: number;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  terraformCode: string;
}
