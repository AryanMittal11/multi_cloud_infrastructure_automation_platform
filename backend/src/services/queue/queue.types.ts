import { OperationType, DeploymentStatus } from '@prisma/client';

export type JobAction = 'PLAN' | 'APPLY' | 'DESTROY';

export interface DeploymentJobMessage {
  /**
   * Authoritative Deployment ID in PostgreSQL
   */
  deploymentId: string;
  projectId: string;
  environmentId: string;
  templateId: string;
  userId: string;
  operationType: OperationType;
  action: JobAction;
  timestamp: string;
  attempt: number;
  correlationId?: string;
}

export type EventType =
  | 'STARTED'
  | 'LOG_CHUNK'
  | 'STATE_CHANGED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface DeploymentEventMessage {
  deploymentId: string;
  eventType: EventType;
  status: DeploymentStatus;
  timestamp: string;
  payload: {
    logChunk?: string;
    error?: string;
    outputs?: Record<string, any>;
    resourcesCount?: number;
    durationMs?: number;
    [key: string]: any;
  };
}

export interface QueueStatus {
  connected: boolean;
  jobsQueueCount: number;
  eventsQueueCount: number;
  mode: 'rabbitmq' | 'in-memory-fallback';
}
