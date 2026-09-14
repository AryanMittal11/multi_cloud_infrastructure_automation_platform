/* ============================================================
   CerebrOps domain types
   ============================================================ */

export type Provider = 'aws' | 'azure' | 'gcp';

export type PipelineStatus = 'success' | 'failed' | 'running' | 'queued' | 'cancelled';
export type DeploymentStatus = 'successful' | 'failed' | 'in-progress' | 'rolled-back';
export type Severity = 'page' | 'ticket' | 'info';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
export type AnomalyState = 'detected' | 'investigating' | 'resolved';
export type EnvHealth = 'healthy' | 'degraded' | 'down';

export interface Pipeline {
  id: string;
  name: string;
  repo: string;
  provider: Provider;
  defaultBranch: string;
  lastStatus: PipelineStatus;
  lastRunId: string;
  lastRunAt: string;
  avgDurationSec: number;
  successRate: number; // 0..1
  successRateTrend: number; // percentage-point delta, e.g. +4
  env: string;
  weeklyRuns: number;
  stages: StageDef[];
}

export interface StageDef {
  key: string;
  label: string;
}

export interface PipelineRun {
  id: string;
  pipelineId: string;
  pipelineName: string;
  status: PipelineStatus;
  env: string;
  branch: string;
  commit: string;
  commitMessage: string;
  author: string;
  trigger: 'push' | 'manual' | 'schedule' | 'api';
  startedAt: string;
  durationSec: number;
  stages: StageRun[];
}

export interface StageRun {
  key: string;
  label: string;
  status: PipelineStatus;
  durationSec: number;
  /** index into stage order; -1 = not started */
  seq: number;
}

export interface Deployment {
  id: string;
  version: string;
  env: string;
  status: DeploymentStatus;
  pipelineRunId: string;
  pipelineName: string;
  commit: string;
  commitMessage: string;
  author: string;
  startedAt: string;
  durationSec: number;
  services: DeployedService[];
  healthChecks: HealthCheck[];
  timeline: TimelineEvent[];
  logLines: LogLine[];
}

export interface DeployedService {
  name: string;
  kind: 'compute' | 'database' | 'storage' | 'network' | 'kubernetes';
  provider: Provider;
  status: 'healthy' | 'degraded' | 'down' | 'pending';
  endpoint?: string;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'skipped';
  detail: string;
  durationMs: number;
}

export interface TimelineEvent {
  label: string;
  detail: string;
  at: string;
  state: 'success' | 'failed' | 'running' | 'pending';
  actor: string;
}

export type LogLine = {
  ln: number;
  ts: string;
  level: 'info' | 'warn' | 'error' | 'ok' | 'debug';
  msg: string;
};

export interface Anomaly {
  id: string;
  title: string;
  service: string;
  metric: string;
  env: string;
  detectedAt: string;
  state: AnomalyState;
  severity: Severity;
  confidence: number; // 0..1
  method: 'forecast-residual' | 'isolation-forest' | 'ewma-baseline';
  observed: string;
  expected: string;
  deviation: number; // e.g. 3.4 sigma
  contributions: { metric: string; pct: number }[];
  relatedRunId?: string;
  relatedPipeline?: string;
  relatedDeployment?: string;
  recommendedAction: string;
  rootCause?: string;
  series: { t: string; observed: number; expected: number }[];
  timeline: TimelineEvent[];
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: Severity;
  status: AlertStatus;
  source: 'anomaly-detector' | 'slo-burn' | 'health-probe' | 'budget-guard' | 'drift-scan';
  channel: 'slack' | 'opsgenie' | 'pagerduty' | 'email';
  service: string;
  env: string;
  createdAt: string;
  updatedAt: string;
  assignee?: string;
  relatedAnomalyId?: string;
  relatedDeploymentId?: string;
  triggerCondition: string;
  timeline: TimelineEvent[];
}

export interface Environment {
  id: string;
  name: string;
  key: 'dev' | 'staging' | 'prod';
  provider: Provider;
  region: string;
  cloudAccount: string;
  health: EnvHealth;
  currentVersion: string;
  currentDeploymentId: string;
  lastDeployAt: string;
  uptimePct: number;
  services: DeployedService[];
  configSummary: { key: string; value: string; masked: boolean }[];
  activity: TimelineEvent[];
  approvalRequired: boolean;
  locked: boolean;
}

export interface StatMetric {
  id: string;
  label: string;
  value: string;
  delta: number; // signed percent
  deltaDirection: 'up' | 'down' | 'flat';
  tone: 'default' | 'success' | 'fail' | 'warn' | 'accent';
  hint: string;
  spark: number[];
}

export interface ActivityItem {
  id: string;
  kind: 'pipeline' | 'deployment' | 'alert' | 'anomaly';
  status: string;
  title: string;
  env: string;
  at: string;
  duration?: string;
  actor: string;
  href: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  sub: string;
  at: string;
  unread: boolean;
  tone: 'accent' | 'success' | 'fail' | 'warn';
}

/* ---- chart data ---- */

export interface SeriesPoint {
  t: string; // label e.g. "Mon 06"
  v: number;
  ok?: number;
  fail?: number;
  dur?: number;
}
