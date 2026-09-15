export interface CreateProjectInput {
  name: string;
  description?: string;
  createDefaultEnvironments?: boolean; // Default true: development, staging, production
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}

export interface CreateEnvironmentInput {
  name: string; // e.g. "development", "staging", "production"
  cloudAccountId?: string;
}

export interface EnvironmentResponse {
  id: string;
  name: string;
  projectId: string;
  cloudAccountId: string | null;
  cloudAccount?: {
    id: string;
    name: string;
    provider: string;
    maskedReference: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  owner?: { id: string; name: string; email: string } | null;
  environments: EnvironmentResponse[];
  cloudAccounts: Array<{
    id: string;
    name: string;
    provider: string;
    maskedReference: string;
  }>;
  deploymentsCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
