/**
 * RabbitMQ Exchanges, Queues, and Routing Key Constants
 */

export const QUEUE_EXCHANGES = {
  DEPLOYMENTS: 'multicloud.deployments',
  DEPLOYMENTS_DLX: 'multicloud.deployments.dlx',
} as const;

export const QUEUES = {
  DEPLOYMENT_JOBS: 'multicloud.deployment_jobs',
  DEPLOYMENT_JOBS_DLQ: 'multicloud.deployment_jobs.dlq',
  DEPLOYMENT_EVENTS: 'multicloud.deployment_events',
} as const;

export const ROUTING_KEYS = {
  // Job publishing keys
  JOB_PLAN: 'deployment.job.plan',
  JOB_APPLY: 'deployment.job.apply',
  JOB_DESTROY: 'deployment.job.destroy',
  JOB_ALL: 'deployment.job.#',

  // Worker event publishing keys
  EVENT_STARTED: 'deployment.event.started',
  EVENT_LOG: 'deployment.event.log',
  EVENT_STATE: 'deployment.event.state',
  EVENT_COMPLETED: 'deployment.event.completed',
  EVENT_FAILED: 'deployment.event.failed',
  EVENT_ALL: 'deployment.event.#',
} as const;
