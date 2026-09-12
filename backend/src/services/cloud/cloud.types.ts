import { Provider } from '@prisma/client';

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  defaultRegion?: string;
}

export interface AzureCredentials {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  subscriptionId: string;
}

export interface GcpCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export type CloudCredentials = AwsCredentials | AzureCredentials | GcpCredentials;

export interface CreateCloudAccountInput {
  name: string;
  provider: Provider;
  credentials: CloudCredentials;
  accountReference?: string;
  projectId?: string;
  skipValidation?: boolean; // Useful for tests and offline/sandbox environments
}

export interface CloudAccountResponse {
  id: string;
  name: string;
  provider: Provider;
  accountReference: string;
  maskedAccountReference: string;
  ownerId: string;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CallerIdentityResult {
  account: string;
  arn: string;
  userId: string;
}
