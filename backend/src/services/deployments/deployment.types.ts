import { OperationType, DeploymentStatus, Provider, Role } from '@prisma/client';
import { JSONSchema } from '../templates/template.types';

export interface CreatePlanInput {
  projectId: string;
  environmentId: string;
  templateId: string;
  operationType?: OperationType;
  configuration: Record<string, any>;
}

export interface ApproveDeploymentInput {
  confirmationKeyword?: string;
  comment?: string;
}

export interface CancelDeploymentInput {
  reason?: string;
}

export interface CreateDestroyPlanInput {
  deploymentId?: string;
  projectId?: string;
  environmentId?: string;
  templateId?: string;
  configuration?: Record<string, any>;
}

export interface ConfirmDestroyInput {
  confirmationKeyword: string;
  comment?: string;
}

export interface ResourcePlanAction {
  address: string;
  type: string;
  name: string;
  action: 'create' | 'update' | 'destroy' | 'replace' | 'read';
  changeSymbol: '+' | '~' | '-' | '-/+' | '<=';
}

export interface PlanSummary {
  toAdd: number;
  toChange: number;
  toDestroy: number;
  resourceActions: ResourcePlanAction[];
  isDestructive: boolean;
}

export interface DeploymentResponse {
  id: string;
  projectId: string;
  environmentId: string;
  templateId: string;
  userId: string;
  operationType: OperationType;
  status: DeploymentStatus;
  configuration: Record<string, any>;
  planOutput: string | null;
  parsedPlanSummary?: PlanSummary | null;
  applyOutput: string | null;
  costEstimate: Record<string, any> | null;
  policyEvaluation: Record<string, any> | null;
  planTime: Date | null;
  applyTime: Date | null;
  createdAt: Date;
  updatedAt: Date;
  project?: { id: string; name: string };
  environment?: { id: string; name: string; cloudAccountId: string | null };
  template?: { id: string; name: string; provider: Provider | null; version: string };
  user?: { id: string; name: string; email: string; role: Role };
}
