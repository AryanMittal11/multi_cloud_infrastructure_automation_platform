import { z } from 'zod';

// ==========================================
// Canonical Enums & Domain Types
// ==========================================

export const UserRole = {
  ADMIN: 'ADMIN',
  DEVELOPER: 'DEVELOPER',
  VIEWER: 'VIEWER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const CloudProvider = {
  AWS: 'AWS',
  AZURE: 'AZURE',
  GCP: 'GCP',
} as const;
export type CloudProvider = (typeof CloudProvider)[keyof typeof CloudProvider];

export const EnvironmentType = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
} as const;
export type EnvironmentType = (typeof EnvironmentType)[keyof typeof EnvironmentType];

export const OperationType = {
  CREATE: 'CREATE',
  MODIFY: 'MODIFY',
  DESTROY: 'DESTROY',
} as const;
export type OperationType = (typeof OperationType)[keyof typeof OperationType];

export const DeploymentStatus = {
  DRAFT: 'DRAFT',
  PLANNING: 'PLANNING',
  PLANNED: 'PLANNED',
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;
export type DeploymentStatus = (typeof DeploymentStatus)[keyof typeof DeploymentStatus];

export const PolicyEvaluationResult = {
  ALLOW: 'ALLOW',
  WARN: 'WARN',
  REQUIRE_APPROVAL: 'REQUIRE_APPROVAL',
  BLOCK: 'BLOCK',
} as const;
export type PolicyEvaluationResult = (typeof PolicyEvaluationResult)[keyof typeof PolicyEvaluationResult];

// ==========================================
// Zod Schemas for Validation
// ==========================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.nativeEnum(UserRole).default(UserRole.DEVELOPER),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const createEnvironmentSchema = z.object({
  name: z.nativeEnum(EnvironmentType),
  cloudAccountId: z.string().uuid(),
});
export type CreateEnvironmentInput = z.infer<typeof createEnvironmentSchema>;

export const createDeploymentSchema = z.object({
  projectId: z.string().uuid(),
  environmentId: z.string().uuid(),
  templateId: z.string().uuid(),
  operationType: z.nativeEnum(OperationType).default(OperationType.CREATE),
  parameters: z.record(z.any()),
});
export type CreateDeploymentInput = z.infer<typeof createDeploymentSchema>;
