import { env } from '../config/env';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'DEVELOPER' | 'VIEWER';
  createdAt?: string;
  updatedAt?: string;
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

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
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
      setStoredUser(res.user);
      return res;
    },

    register: async (name: string, email: string, password: string, role: string = 'DEVELOPER') => {
      const res = await request<{ user: User; accessToken: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      });
      setStoredToken(res.accessToken);
      setStoredUser(res.user);
      return res;
    },

    me: () => request<{ user: User }>('/auth/me'),

    logout: () => {
      setStoredToken(null);
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
      request<{ cloudAccount: CloudAccount }>('/cloud-accounts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/cloud-accounts/${id}`, {
        method: 'DELETE',
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
    approve: (id: string) =>
      request<{ deployment: Deployment; message: string }>(`/deployments/${id}/approve`, {
        method: 'POST',
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
  },
};

// ==========================================
// Visual Designer Types (Brainboard-style canvas)
// ==========================================

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
  kind: 'network' | 'compute' | 'database' | 'storage' | 'kubernetes';
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
