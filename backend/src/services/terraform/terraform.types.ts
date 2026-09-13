export interface TerraformExecutionOptions {
  workspaceDir: string;
  envVars?: Record<string, string>;
  onLogChunk?: (chunk: string) => void;
  timeoutMs?: number;
}

export interface TerraformCommandResult {
  command: string;
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface ParsedResourceItem {
  type: string;
  name: string;
  provider: string;
  providerResourceId?: string;
  status: 'ACTIVE' | 'FAILED' | 'DESTROYED';
  outputs: Record<string, any>;
  dependencies: string[];
}

export interface ParsedStateResult {
  resources: ParsedResourceItem[];
  outputs: Record<string, any>;
  formatVersion?: string;
}

export interface WorkspaceConfig {
  deploymentId: string;
  templateReference: string;
  configuration: Record<string, any>;
  cloudCredentials: Record<string, string>;
  region?: string;
}
