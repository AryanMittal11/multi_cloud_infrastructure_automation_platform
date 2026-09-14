import type {
  Pipeline,
  PipelineRun,
  Deployment,
  Anomaly,
  Alert,
  Environment,
  LogLine,
  NotificationItem,
  ActivityItem,
  StatMetric,
  SeriesPoint,
} from './types';

/* ============================================================
   Time helpers — timestamps stay relative to "now"
   ============================================================ */

const NOW = Date.now();
const min = 60_000;
const hr = 60 * min;
const day = 24 * hr;

export const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

export function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < min) return `${Math.max(1, Math.round(diff / 1000))}s ago`;
  if (diff < hr) return `${Math.round(diff / min)}m ago`;
  if (diff < day) return `${Math.round(diff / hr)}h ago`;
  return `${Math.round(diff / day)}d ago`;
}

export function clockTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function dateShort(ts: string): string {
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

/* ============================================================
   Pipelines
   ============================================================ */

const CI_STAGES = [
  { key: 'lint', label: 'Lint' },
  { key: 'build', label: 'Build' },
  { key: 'test', label: 'Test' },
  { key: 'scan', label: 'Scan' },
  { key: 'plan', label: 'Plan' },
  { key: 'apply', label: 'Apply' },
];

const SHORT_STAGES = [
  { key: 'build', label: 'Build' },
  { key: 'test', label: 'Test' },
  { key: 'plan', label: 'Plan' },
  { key: 'apply', label: 'Apply' },
];

export const pipelines: Pipeline[] = [
  {
    id: 'gateway-api',
    name: 'gateway-api',
    repo: 'cloudweave/gateway',
    provider: 'aws',
    defaultBranch: 'main',
    lastStatus: 'failed',
    lastRunId: 'run-1840',
    lastRunAt: iso(4.2 * hr),
    avgDurationSec: 142,
    successRate: 0.94,
    successRateTrend: -4,
    env: 'production',
    weeklyRuns: 68,
    stages: CI_STAGES,
  },
  {
    id: 'web-dashboard',
    name: 'web-dashboard',
    repo: 'cloudweave/web-dashboard',
    provider: 'aws',
    defaultBranch: 'main',
    lastStatus: 'running',
    lastRunId: 'run-1843',
    lastRunAt: iso(11 * min),
    avgDurationSec: 96,
    successRate: 0.97,
    successRateTrend: +2,
    env: 'staging',
    weeklyRuns: 54,
    stages: SHORT_STAGES,
  },
  {
    id: 'cerebro-core',
    name: 'cerebro-core',
    repo: 'cloudweave/core',
    provider: 'azure',
    defaultBranch: 'main',
    lastStatus: 'success',
    lastRunId: 'run-1842',
    lastRunAt: iso(1.1 * hr),
    avgDurationSec: 174,
    successRate: 0.98,
    successRateTrend: +1,
    env: 'production',
    weeklyRuns: 41,
    stages: CI_STAGES,
  },
  {
    id: 'worker-fleet',
    name: 'worker-fleet',
    repo: 'cloudweave/worker-fleet',
    provider: 'gcp',
    defaultBranch: 'main',
    lastStatus: 'success',
    lastRunId: 'run-1841',
    lastRunAt: iso(2.6 * hr),
    avgDurationSec: 121,
    successRate: 0.91,
    successRateTrend: +6,
    env: 'staging',
    weeklyRuns: 37,
    stages: CI_STAGES,
  },
  {
    id: 'edge-proxy',
    name: 'edge-proxy',
    repo: 'cloudweave/edge-proxy',
    provider: 'aws',
    defaultBranch: 'main',
    lastStatus: 'cancelled',
    lastRunId: 'run-1839',
    lastRunAt: iso(7.8 * hr),
    avgDurationSec: 88,
    successRate: 0.89,
    successRateTrend: -1,
    env: 'production',
    weeklyRuns: 22,
    stages: SHORT_STAGES,
  },
  {
    id: 'infra-baseline',
    name: 'infra-baseline',
    repo: 'cloudweave/infra',
    provider: 'gcp',
    defaultBranch: 'main',
    lastStatus: 'success',
    lastRunId: 'run-1838',
    lastRunAt: iso(9.5 * hr),
    avgDurationSec: 203,
    successRate: 0.99,
    successRateTrend: 0,
    env: 'production',
    weeklyRuns: 12,
    stages: SHORT_STAGES,
  },
];

/* ============================================================
   Pipeline runs
   ============================================================ */

export const pipelineRuns: PipelineRun[] = [
  {
    id: 'run-1843',
    pipelineId: 'web-dashboard',
    pipelineName: 'web-dashboard',
    status: 'running',
    env: 'staging',
    branch: 'pr-127',
    commit: 'b21a6c8',
    commitMessage: 'perf: batch metric inserts',
    author: 'devon',
    trigger: 'push',
    startedAt: iso(11 * min),
    durationSec: 660,
    stages: [
      { key: 'build', label: 'Build', status: 'success', durationSec: 118, seq: 0 },
      { key: 'test', label: 'Test', status: 'success', durationSec: 204, seq: 1 },
      { key: 'plan', label: 'Plan', status: 'running', durationSec: 62, seq: 2 },
      { key: 'apply', label: 'Apply', status: 'queued', durationSec: 0, seq: 3 },
    ],
  },
  {
    id: 'run-1842',
    pipelineId: 'cerebro-core',
    pipelineName: 'cerebro-core',
    status: 'success',
    env: 'production',
    branch: 'main',
    commit: '7d2f9a1',
    commitMessage: 'fix: backpressure on webhook ingress',
    author: 'maya',
    trigger: 'push',
    startedAt: iso(1.1 * hr),
    durationSec: 168,
    stages: [
      { key: 'lint', label: 'Lint', status: 'success', durationSec: 14, seq: 0 },
      { key: 'build', label: 'Build', status: 'success', durationSec: 52, seq: 1 },
      { key: 'test', label: 'Test', status: 'success', durationSec: 61, seq: 2 },
      { key: 'scan', label: 'Scan', status: 'success', durationSec: 18, seq: 3 },
      { key: 'plan', label: 'Plan', status: 'success', durationSec: 9, seq: 4 },
      { key: 'apply', label: 'Apply', status: 'success', durationSec: 14, seq: 5 },
    ],
  },
  {
    id: 'run-1841',
    pipelineId: 'worker-fleet',
    pipelineName: 'worker-fleet',
    status: 'success',
    env: 'staging',
    branch: 'main',
    commit: '9c41be2',
    commitMessage: 'feat: forecast-residual detection v2',
    author: 'devon',
    trigger: 'push',
    startedAt: iso(2.6 * hr),
    durationSec: 134,
    stages: [
      { key: 'lint', label: 'Lint', status: 'success', durationSec: 11, seq: 0 },
      { key: 'build', label: 'Build', status: 'success', durationSec: 44, seq: 1 },
      { key: 'test', label: 'Test', status: 'success', durationSec: 49, seq: 2 },
      { key: 'scan', label: 'Scan', status: 'success', durationSec: 12, seq: 3 },
      { key: 'plan', label: 'Plan', status: 'success', durationSec: 8, seq: 4 },
      { key: 'apply', label: 'Apply', status: 'success', durationSec: 10, seq: 5 },
    ],
  },
  {
    id: 'run-1840',
    pipelineId: 'gateway-api',
    pipelineName: 'gateway-api',
    status: 'failed',
    env: 'production',
    branch: 'main',
    commit: '3a08f77',
    commitMessage: 'chore: pin trivy-action to 0.35.0',
    author: 'alex',
    trigger: 'push',
    startedAt: iso(4.2 * hr),
    durationSec: 212,
    stages: [
      { key: 'lint', label: 'Lint', status: 'success', durationSec: 16, seq: 0 },
      { key: 'build', label: 'Build', status: 'success', durationSec: 61, seq: 1 },
      { key: 'test', label: 'Test', status: 'failed', durationSec: 104, seq: 2 },
      { key: 'scan', label: 'Scan', status: 'cancelled', durationSec: 0, seq: 3 },
      { key: 'plan', label: 'Plan', status: 'cancelled', durationSec: 0, seq: 4 },
      { key: 'apply', label: 'Apply', status: 'cancelled', durationSec: 0, seq: 5 },
    ],
  },
  {
    id: 'run-1839',
    pipelineId: 'edge-proxy',
    pipelineName: 'edge-proxy',
    status: 'cancelled',
    env: 'production',
    branch: 'main',
    commit: 'e5d90b4',
    commitMessage: 'feat: deploy-correlated root cause',
    author: 'maya',
    trigger: 'manual',
    startedAt: iso(7.8 * hr),
    durationSec: 47,
    stages: [
      { key: 'build', label: 'Build', status: 'success', durationSec: 38, seq: 0 },
      { key: 'test', label: 'Test', status: 'cancelled', durationSec: 9, seq: 1 },
      { key: 'plan', label: 'Plan', status: 'cancelled', durationSec: 0, seq: 2 },
      { key: 'apply', label: 'Apply', status: 'cancelled', durationSec: 0, seq: 3 },
    ],
  },
  {
    id: 'run-1838',
    pipelineId: 'infra-baseline',
    pipelineName: 'infra-baseline',
    status: 'success',
    env: 'production',
    branch: 'main',
    commit: 'c77e0d2',
    commitMessage: 'chore: bump provider pins for Q3 baseline',
    author: 'priya',
    trigger: 'schedule',
    startedAt: iso(9.5 * hr),
    durationSec: 196,
    stages: [
      { key: 'build', label: 'Build', status: 'success', durationSec: 41, seq: 0 },
      { key: 'test', label: 'Test', status: 'success', durationSec: 58, seq: 1 },
      { key: 'plan', label: 'Plan', status: 'success', durationSec: 74, seq: 2 },
      { key: 'apply', label: 'Apply', status: 'success', durationSec: 23, seq: 3 },
    ],
  },
  {
    id: 'run-1837',
    pipelineId: 'web-dashboard',
    pipelineName: 'web-dashboard',
    status: 'success',
    env: 'staging',
    branch: 'main',
    commit: '0f4b8aa',
    commitMessage: 'feat: anomaly contribution bars',
    author: 'priya',
    trigger: 'push',
    startedAt: iso(13 * hr),
    durationSec: 101,
    stages: [
      { key: 'build', label: 'Build', status: 'success', durationSec: 33, seq: 0 },
      { key: 'test', label: 'Test', status: 'success', durationSec: 41, seq: 1 },
      { key: 'plan', label: 'Plan', status: 'success', durationSec: 14, seq: 2 },
      { key: 'apply', label: 'Apply', status: 'success', durationSec: 13, seq: 3 },
    ],
  },
  {
    id: 'run-1836',
    pipelineId: 'gateway-api',
    pipelineName: 'gateway-api',
    status: 'success',
    env: 'production',
    branch: 'main',
    commit: '3a08f77',
    commitMessage: 'chore: pin trivy-action to 0.35.0',
    author: 'alex',
    trigger: 'push',
    startedAt: iso(15.2 * hr),
    durationSec: 148,
    stages: [
      { key: 'lint', label: 'Lint', status: 'success', durationSec: 15, seq: 0 },
      { key: 'build', label: 'Build', status: 'success', durationSec: 55, seq: 1 },
      { key: 'test', label: 'Test', status: 'success', durationSec: 48, seq: 2 },
      { key: 'scan', label: 'Scan', status: 'success', durationSec: 12, seq: 3 },
      { key: 'plan', label: 'Plan', status: 'success', durationSec: 8, seq: 4 },
      { key: 'apply', label: 'Apply', status: 'success', durationSec: 10, seq: 5 },
    ],
  },
];

export function runsForPipeline(pipelineId: string): PipelineRun[] {
  return pipelineRuns.filter((r) => r.pipelineId === pipelineId);
}

export function getRun(id: string): PipelineRun | undefined {
  return pipelineRuns.find((r) => r.id === id);
}

export function getPipeline(id: string): Pipeline | undefined {
  return pipelines.find((p) => p.id === id);
}

/* ============================================================
   Deployments
   ============================================================ */

const SVC_GATEWAY = [
  { name: 'gateway-api', kind: 'compute' as const, provider: 'aws' as const, status: 'healthy' as const, endpoint: 'https://api.cloudweave.io' },
  { name: 'rds-postgres-14', kind: 'database' as const, provider: 'aws' as const, status: 'healthy' as const },
  { name: 'edge-cdn', kind: 'network' as const, provider: 'aws' as const, status: 'healthy' as const },
];

const SVC_DASH = [
  { name: 'web-dashboard', kind: 'compute' as const, provider: 'aws' as const, status: 'healthy' as const, endpoint: 'https://app.cloudweave.io' },
  { name: 's3-assets', kind: 'storage' as const, provider: 'aws' as const, status: 'healthy' as const },
];

export const deployments: Deployment[] = [
  {
    id: 'dep-9308',
    version: 'v2.14.3',
    env: 'production',
    status: 'successful',
    pipelineRunId: 'run-1842',
    pipelineName: 'cerebro-core',
    commit: '7d2f9a1',
    commitMessage: 'fix: backpressure on webhook ingress',
    author: 'maya',
    startedAt: iso(0.8 * hr),
    durationSec: 294,
    services: SVC_GATEWAY,
    healthChecks: [
      { name: 'p95 latency < 250ms', status: 'pass', detail: 'p95 = 143ms after 10m window', durationMs: 600_000 },
      { name: 'error rate < 1%', status: 'pass', detail: '0.4% over canary cohort', durationMs: 600_000 },
      { name: 'synthetic login journey', status: 'pass', detail: '6/6 regions OK', durationMs: 42_000 },
      { name: 'postgres connection pool', status: 'warn', detail: 'pool at 78% — watch', durationMs: 5_000 },
    ],
    timeline: [
      { label: 'Queued', detail: 'auto-approved (low-risk change)', at: iso(0.85 * hr), state: 'success', actor: 'pipeline' },
      { label: 'Terraform plan', detail: '3 to add, 0 to change, 0 to destroy', at: iso(0.84 * hr), state: 'success', actor: 'worker' },
      { label: 'Canary 10%', detail: 'api.cloudweave.io cohort c-2', at: iso(0.8 * hr), state: 'success', actor: 'deployer' },
      { label: 'Canary 100%', detail: 'rolled to all targets', at: iso(0.55 * hr), state: 'success', actor: 'deployer' },
      { label: 'Health checks', detail: '4 checks, 3 pass · 1 warn', at: iso(0.4 * hr), state: 'success', actor: 'watchdog' },
    ],
    logLines: [
      { ln: 1, ts: clockTime(iso(0.85 * hr)), level: 'info', msg: 'deployment dep-9308 accepted (env=production, version=v2.14.3)' },
      { ln: 2, ts: clockTime(iso(0.84 * hr)), level: 'info', msg: 'terraform init: hashicorp/azurerm v3.113.0 cached' },
      { ln: 3, ts: clockTime(iso(0.83 * hr)), level: 'ok', msg: 'plan: 3 to add, 0 to change, 0 to destroy' },
      { ln: 4, ts: clockTime(iso(0.8 * hr)), level: 'info', msg: 'canary cohort c-2: 10% traffic shift' },
      { ln: 5, ts: clockTime(iso(0.7 * hr)), level: 'ok', msg: 'canary healthy: p95=138ms err=0.3%' },
      { ln: 6, ts: clockTime(iso(0.55 * hr)), level: 'info', msg: 'shifting 100% traffic' },
      { ln: 7, ts: clockTime(iso(0.4 * hr)), level: 'warn', msg: 'postgres pool utilization 78% (threshold 85%)' },
      { ln: 8, ts: clockTime(iso(0.39 * hr)), level: 'ok', msg: 'deployment marked successful' },
    ],
  },
  {
    id: 'dep-9307',
    version: 'v2.14.2',
    env: 'production',
    status: 'rolled-back',
    pipelineRunId: 'run-1836',
    pipelineName: 'gateway-api',
    commit: '3a08f77',
    commitMessage: 'chore: pin trivy-action to 0.35.0',
    author: 'alex',
    startedAt: iso(15 * hr),
    durationSec: 1108,
    services: SVC_GATEWAY,
    healthChecks: [
      { name: 'p95 latency < 250ms', status: 'fail', detail: 'p95 = 412ms on cohort c-1', durationMs: 420_000 },
      { name: 'error rate < 1%', status: 'fail', detail: '2.9% — regression vs 0.4% baseline', durationMs: 420_000 },
      { name: 'synthetic login journey', status: 'pass', detail: '6/6 regions OK', durationMs: 41_000 },
      { name: 'rollback drill', status: 'pass', detail: 'auto-triggered by SLO fast-burn', durationMs: 118_000 },
    ],
    timeline: [
      { label: 'Queued', detail: 'approved by maya', at: iso(15.1 * hr), state: 'success', actor: 'maya' },
      { label: 'Terraform plan', detail: '1 to change (gateway image tag)', at: iso(15.05 * hr), state: 'success', actor: 'worker' },
      { label: 'Canary 10%', detail: 'cohort c-1 shifted', at: iso(15 * hr), state: 'success', actor: 'deployer' },
      { label: 'Health checks', detail: 'error budget burning 18.2x', at: iso(14.8 * hr), state: 'failed', actor: 'watchdog' },
      { label: 'Auto-rollback', detail: 'reverted to v2.14.1 (dep-9305)', at: iso(14.6 * hr), state: 'success', actor: 'watchdog' },
      { label: 'Incident linked', detail: 'anom-1 / alg-3 correlation recorded', at: iso(14.5 * hr), state: 'running', actor: 'detector' },
    ],
    logLines: [
      { ln: 1, ts: clockTime(iso(15 * hr)), level: 'info', msg: 'deployment dep-9307 accepted (env=production, version=v2.14.2)' },
      { ln: 2, ts: clockTime(iso(14.9 * hr)), level: 'ok', msg: 'canary cohort c-1: 10% traffic shift' },
      { ln: 3, ts: clockTime(iso(14.8 * hr)), level: 'warn', msg: 'p95 latency 412ms (threshold 250ms)' },
      { ln: 4, ts: clockTime(iso(14.79 * hr)), level: 'error', msg: 'error rate 2.9% — fast-burn threshold breached' },
      { ln: 5, ts: clockTime(iso(14.7 * hr)), level: 'warn', msg: 'auto-rollback armed: slope continuing 90s' },
      { ln: 6, ts: clockTime(iso(14.6 * hr)), level: 'ok', msg: 'rollback to v2.14.1 complete in 118s' },
      { ln: 7, ts: clockTime(iso(14.5 * hr)), level: 'info', msg: 'postmortem links: anom-1, alg-3, run-1840' },
    ],
  },
  {
    id: 'dep-9306',
    version: 'v1.9.0-rc4',
    env: 'staging',
    status: 'in-progress',
    pipelineRunId: 'run-1843',
    pipelineName: 'web-dashboard',
    commit: 'b21a6c8',
    commitMessage: 'perf: batch metric inserts',
    author: 'devon',
    startedAt: iso(6 * min),
    durationSec: 360,
    services: SVC_DASH,
    healthChecks: [
      { name: 'p95 latency < 400ms', status: 'pass', detail: 'p95 = 187ms', durationMs: 120_000 },
      { name: 'asset bundle integrity', status: 'pass', detail: 'sha256 verified', durationMs: 8_000 },
      { name: 'lighthouse performance', status: 'warn', detail: 'score 91 (target 95)', durationMs: 35_000 },
    ],
    timeline: [
      { label: 'Queued', detail: 'auto-approve on staging', at: iso(6 * min), state: 'success', actor: 'pipeline' },
      { label: 'Build artifacts', detail: 'docker push sha b21a6c8', at: iso(5 * min), state: 'success', actor: 'worker' },
      { label: 'Terraform apply', detail: 'applying…', at: iso(3 * min), state: 'running', actor: 'worker' },
      { label: 'Health checks', detail: 'pending', at: '', state: 'pending', actor: 'watchdog' },
    ],
    logLines: [
      { ln: 1, ts: clockTime(iso(6 * min)), level: 'info', msg: 'deployment dep-9306 accepted (env=staging, version=v1.9.0-rc4)' },
      { ln: 2, ts: clockTime(iso(5 * min)), level: 'ok', msg: 'docker push: sha256:b21a6c8 uploaded' },
      { ln: 3, ts: clockTime(iso(3 * min)), level: 'info', msg: 'terraform apply in progress (module.web_dashboard)' },
      { ln: 4, ts: clockTime(iso(1 * min)), level: 'info', msg: 'aws_s3_object.assets[27]: still creating...' },
    ],
  },
  {
    id: 'dep-9305',
    version: 'v2.14.1',
    env: 'production',
    status: 'successful',
    pipelineRunId: 'run-1835',
    pipelineName: 'gateway-api',
    commit: 'd94c1e0',
    commitMessage: 'feat: graceful drain on connection pool',
    author: 'maya',
    startedAt: iso(26 * hr),
    durationSec: 262,
    services: SVC_GATEWAY,
    healthChecks: [
      { name: 'p95 latency < 250ms', status: 'pass', detail: 'p95 = 151ms', durationMs: 600_000 },
      { name: 'error rate < 1%', status: 'pass', detail: '0.4%', durationMs: 600_000 },
    ],
    timeline: [
      { label: 'Queued', detail: 'approved by maya', at: iso(26.1 * hr), state: 'success', actor: 'maya' },
      { label: 'Canary 100%', detail: 'steady roll, no anomalies', at: iso(26 * hr), state: 'success', actor: 'deployer' },
      { label: 'Health checks', detail: 'all pass', at: iso(25.8 * hr), state: 'success', actor: 'watchdog' },
    ],
    logLines: [
      { ln: 1, ts: clockTime(iso(26 * hr)), level: 'info', msg: 'deployment dep-9305 accepted (env=production)' },
      { ln: 2, ts: clockTime(iso(25.9 * hr)), level: 'ok', msg: 'roll complete: 12 targets updated' },
      { ln: 3, ts: clockTime(iso(25.8 * hr)), level: 'ok', msg: 'health checks: 2/2 pass' },
    ],
  },
  {
    id: 'dep-9304',
    version: 'v2.13.9',
    env: 'staging',
    status: 'failed',
    pipelineRunId: 'run-1831',
    pipelineName: 'worker-fleet',
    commit: 'aa71f02',
    commitMessage: 'fix: redis backoff jitter',
    author: 'devon',
    startedAt: iso(30 * hr),
    durationSec: 189,
    services: SVC_DASH,
    healthChecks: [
      { name: 'worker heartbeat', status: 'fail', detail: '3/8 workers missed 3 heartbeats', durationMs: 90_000 },
      { name: 'redis reachable', status: 'pass', detail: 'ok', durationMs: 2_000 },
    ],
    timeline: [
      { label: 'Queued', detail: 'auto-approve on staging', at: iso(30.1 * hr), state: 'success', actor: 'pipeline' },
      { label: 'Terraform apply', detail: 'worker count 8', at: iso(30 * hr), state: 'success', actor: 'worker' },
      { label: 'Health checks', detail: 'heartbeat failures detected', at: iso(29.9 * hr), state: 'failed', actor: 'watchdog' },
    ],
    logLines: [
      { ln: 1, ts: clockTime(iso(30 * hr)), level: 'info', msg: 'deployment dep-9304 accepted (env=staging)' },
      { ln: 2, ts: clockTime(iso(29.95 * hr)), level: 'warn', msg: 'worker-3 heartbeat missing (retry 1/3)' },
      { ln: 3, ts: clockTime(iso(29.9 * hr)), level: 'error', msg: 'deployment marked failed: heartbeat quorum lost' },
    ],
  },
];

export function getDeployment(id: string): Deployment | undefined {
  return deployments.find((d) => d.id === id);
}

/* ============================================================
   Anomalies
   ============================================================ */

function anomalySeries(base: number, spike: number, points = 48): { t: string; observed: number; expected: number }[] {
  const out: { t: string; observed: number; expected: number }[] = [];
  for (let i = 0; i < points; i++) {
    const hourAgo = points - i;
    const t = `${String((24 - (hourAgo % 24) + 11) % 24).padStart(2, '0')}:00`;
    // gentle sine baseline with noise
    const expected = base + Math.sin(i / 6) * (base * 0.06) + (i % 3) * 0.4;
    const inSpike = i > points - 7;
    const observed = inSpike ? expected * spike * (0.92 + (i % 3) * 0.05) : expected * (0.98 + ((i * 7) % 5) * 0.008);
    out.push({ t, observed: Number(observed.toFixed(2)), expected: Number(expected.toFixed(2)) });
  }
  return out;
}

export const anomalies: Anomaly[] = [
  {
    id: 'anom-1',
    title: 'API latency spike — gateway-api',
    service: 'gateway-api',
    metric: 'http.request.duration.p95',
    env: 'production',
    detectedAt: iso(2.2 * hr),
    state: 'investigating',
    severity: 'page',
    confidence: 0.96,
    method: 'forecast-residual',
    observed: '412ms',
    expected: '148ms',
    deviation: 4.6,
    contributions: [
      { metric: 'p95 latency', pct: 58.2 },
      { metric: 'error rate', pct: 31.4 },
      { metric: 'cpu saturation', pct: 7.1 },
      { metric: 'other', pct: 3.3 },
    ],
    relatedRunId: 'run-1840',
    relatedPipeline: 'gateway-api',
    relatedDeployment: 'dep-9307',
    recommendedAction: 'Keep v2.14.1 rollback; re-run gateway load test before re-promoting v2.14.2',
    rootCause: 'Deploy-correlated: dep-9307 (v2.14.2 @3a08f77) preceded the anomaly by 14 minutes. Connection-pool contention in gateway image correlates with 4.6σ residual.',
    series: anomalySeries(148, 2.9),
    timeline: [
      { label: 'Detected', detail: 'forecast-residual flagged 3 consecutive points (p95)', at: iso(2.2 * hr), state: 'failed', actor: 'detector' },
      { label: 'Deploy correlation', detail: 'dep-9307 14m before onset', at: iso(2.1 * hr), state: 'pending', actor: 'detector' },
      { label: 'Paged', detail: 'on-call: maya via pagerduty', at: iso(2.15 * hr), state: 'pending', actor: 'router' },
      { label: 'Investigating', detail: 'rollback verified healthy; monitoring residuals', at: iso(1.2 * hr), state: 'running', actor: 'maya' },
    ],
  },
  {
    id: 'anom-2',
    title: 'CPU profile deviating from weekly baseline',
    service: 'worker-fleet',
    metric: 'system.cpu.usage',
    env: 'staging',
    detectedAt: iso(5.5 * hr),
    state: 'detected',
    severity: 'ticket',
    confidence: 0.81,
    method: 'isolation-forest',
    observed: '71.4%',
    expected: '52.0%',
    deviation: 2.1,
    contributions: [
      { metric: 'cpu usage', pct: 64.0 },
      { metric: 'queue depth', pct: 22.5 },
      { metric: 'other', pct: 13.5 },
    ],
    relatedPipeline: 'worker-fleet',
    relatedDeployment: 'dep-9304',
    recommendedAction: 'Right-size worker pool or raise autoscaling ceiling before 09:00 batch window',
    series: anomalySeries(52, 1.37),
    timeline: [
      { label: 'Detected', detail: 'isolation-forest score 0.81 (threshold 0.78)', at: iso(5.5 * hr), state: 'pending', actor: 'detector' },
      { label: 'Ticketed', detail: 'JIRA infra-2841 created', at: iso(5.4 * hr), state: 'success', actor: 'router' },
    ],
  },
  {
    id: 'anom-3',
    title: 'Memory drift on edge-proxy fleet',
    service: 'edge-proxy',
    metric: 'system.memory.used_pct',
    env: 'production',
    detectedAt: iso(9 * hr),
    state: 'resolved',
    severity: 'ticket',
    confidence: 0.77,
    method: 'ewma-baseline',
    observed: '83.2%',
    expected: '61.5%',
    deviation: 2.8,
    contributions: [
      { metric: 'memory used', pct: 71.3 },
      { metric: 'cache pressure', pct: 18.9 },
      { metric: 'other', pct: 9.8 },
    ],
    relatedPipeline: 'edge-proxy',
    recommendedAction: 'Resolved by cache-eviction patch in v2.13.9 (dep-9305 predecessor)',
    rootCause: 'Slow leak in session cache; eviction patch shipped in v2.13.9 resolved residuals within 40 minutes.',
    series: anomalySeries(61, 1.35),
    timeline: [
      { label: 'Detected', detail: 'EWMA drift beyond 2.5σ for 20m', at: iso(9 * hr), state: 'pending', actor: 'detector' },
      { label: 'Mitigated', detail: 'cache-eviction patch promoted', at: iso(8.4 * hr), state: 'success', actor: 'devon' },
      { label: 'Resolved', detail: 'residuals back to baseline', at: iso(8.2 * hr), state: 'success', actor: 'watchdog' },
    ],
  },
];

export function getAnomaly(id: string): Anomaly | undefined {
  return anomalies.find((a) => a.id === id);
}

/* ============================================================
   Alerts
   ============================================================ */

export const alerts: Alert[] = [
  {
    id: 'alg-3',
    title: 'API latency spike — p95 regression',
    message: 'forecast-residual flagged 3 consecutive points on http.request.duration.p95 (412ms vs 148ms expected). Auto-rollback completed for dep-9307.',
    severity: 'page',
    status: 'acknowledged',
    source: 'anomaly-detector',
    channel: 'pagerduty',
    service: 'gateway-api',
    env: 'production',
    createdAt: iso(2.2 * hr),
    updatedAt: iso(1.1 * hr),
    assignee: 'maya',
    relatedAnomalyId: 'anom-1',
    relatedDeploymentId: 'dep-9307',
    triggerCondition: 'p95 > 2.5σ residual for 3 consecutive 1m windows',
    timeline: [
      { label: 'Fired', detail: 'condition met on production gateway cohort', at: iso(2.2 * hr), state: 'failed', actor: 'detector' },
      { label: 'Routed', detail: 'pagerduty → on-call primary (maya)', at: iso(2.19 * hr), state: 'pending', actor: 'router' },
      { label: 'Acknowledged', detail: 'ack within 4m — rollback in progress', at: iso(2.1 * hr), state: 'running', actor: 'maya' },
      { label: 'Linked', detail: 'dep-9307 auto-rollback attached to incident', at: iso(2.05 * hr), state: 'pending', actor: 'watchdog' },
    ],
  },
  {
    id: 'alg-2',
    title: 'Error budget fast-burn — gateway-api',
    message: 'SLO burn rate 18.2x over the last hour; 30-day budget at 61% consumption. Burn alert paired with latency regression.',
    severity: 'page',
    status: 'active',
    source: 'slo-burn',
    channel: 'opsgenie',
    service: 'gateway-api',
    env: 'production',
    createdAt: iso(2.1 * hr),
    updatedAt: iso(2.1 * hr),
    relatedDeploymentId: 'dep-9307',
    triggerCondition: 'burn_rate(1h) > 14.4 AND burn_rate(5m) > 14.4',
    timeline: [
      { label: 'Fired', detail: 'multi-window burn condition met', at: iso(2.1 * hr), state: 'failed', actor: 'slo-engine' },
      { label: 'Routed', detail: 'opsgenie → platform-oncall', at: iso(2.1 * hr), state: 'pending', actor: 'router' },
    ],
  },
  {
    id: 'alg-5',
    title: 'CPU deviating from weekly profile',
    message: 'isolation-forest score 0.81 on worker-fleet cpu.usage. Queue depth rising ahead of batch window.',
    severity: 'ticket',
    status: 'active',
    source: 'anomaly-detector',
    channel: 'slack',
    service: 'worker-fleet',
    env: 'staging',
    createdAt: iso(5.5 * hr),
    updatedAt: iso(5.5 * hr),
    relatedAnomalyId: 'anom-2',
    triggerCondition: 'isolation score > 0.78 sustained 15m',
    timeline: [
      { label: 'Fired', detail: 'ticket routed to #infra-alerts', at: iso(5.5 * hr), state: 'pending', actor: 'router' },
    ],
  },
  {
    id: 'alg-4',
    title: 'Terraform drift detected — edge-proxy',
    message: 'Scheduled drift scan found out-of-band change: security group rule added outside pipeline (sg-0a12, port 9090).',
    severity: 'ticket',
    status: 'acknowledged',
    source: 'drift-scan',
    channel: 'slack',
    service: 'edge-proxy',
    env: 'production',
    createdAt: iso(11 * hr),
    updatedAt: iso(9.8 * hr),
    assignee: 'priya',
    triggerCondition: 'drift scan (cron */30 * * * *) non-empty diff',
    timeline: [
      { label: 'Fired', detail: 'drift scan diff: 1 change', at: iso(11 * hr), state: 'failed', actor: 'scanner' },
      { label: 'Acknowledged', detail: 'priya: change is from bastion tooling, reconciling', at: iso(9.8 * hr), state: 'running', actor: 'priya' },
    ],
  },
  {
    id: 'alg-1',
    title: 'Postgres connection pool saturation',
    message: 'Pool utilization exceeded 85% for 10 minutes on rds-postgres-14 during dep-9307 canary. Self-recovered after rollback.',
    severity: 'ticket',
    status: 'resolved',
    source: 'health-probe',
    channel: 'slack',
    service: 'rds-postgres-14',
    env: 'production',
    createdAt: iso(2.6 * hr),
    updatedAt: iso(1.9 * hr),
    assignee: 'maya',
    relatedDeploymentId: 'dep-9307',
    triggerCondition: 'pool_utilization > 85% for 10m',
    timeline: [
      { label: 'Fired', detail: 'probe threshold breached', at: iso(2.6 * hr), state: 'failed', actor: 'probe' },
      { label: 'Recovered', detail: 'utilization 54% post-rollback', at: iso(1.9 * hr), state: 'success', actor: 'probe' },
      { label: 'Resolved', detail: 'auto-resolved after 30m stable', at: iso(1.85 * hr), state: 'success', actor: 'watchdog' },
    ],
  },
  {
    id: 'alg-6',
    title: 'Staging heartbeat quorum lost',
    message: '3/8 worker-fleet pods missed heartbeats during dep-9304. Deployment marked failed; fleet self-healed.',
    severity: 'info',
    status: 'resolved',
    source: 'health-probe',
    channel: 'email',
    service: 'worker-fleet',
    env: 'staging',
    createdAt: iso(29.9 * hr),
    updatedAt: iso(29.2 * hr),
    assignee: 'devon',
    relatedDeploymentId: 'dep-9304',
    triggerCondition: 'heartbeat quorum < 6/8 for 3m',
    timeline: [
      { label: 'Fired', detail: 'quorum 5/8 at 29.9h', at: iso(29.9 * hr), state: 'failed', actor: 'probe' },
      { label: 'Resolved', detail: 'pods replaced by ASG', at: iso(29.2 * hr), state: 'success', actor: 'autoscaler' },
    ],
  },
];

export function getAlert(id: string): Alert | undefined {
  return alerts.find((a) => a.id === id);
}

export const activeAlertCount = alerts.filter((a) => a.status !== 'resolved').length;

/* ============================================================
   Environments
   ============================================================ */

export const environments: Environment[] = [
  {
    id: 'env-prod',
    name: 'Production',
    key: 'prod',
    provider: 'aws',
    region: 'us-east-1',
    cloudAccount: 'aws-main (9413…)',
    health: 'degraded',
    currentVersion: 'v2.14.1',
    currentDeploymentId: 'dep-9305',
    lastDeployAt: iso(26 * hr),
    uptimePct: 99.97,
    approvalRequired: true,
    locked: false,
    services: [
      { name: 'gateway-api', kind: 'compute', provider: 'aws', status: 'degraded', endpoint: 'https://api.cloudweave.io' },
      { name: 'rds-postgres-14', kind: 'database', provider: 'aws', status: 'healthy' },
      { name: 'edge-proxy', kind: 'network', provider: 'aws', status: 'healthy' },
      { name: 's3-assets', kind: 'storage', provider: 'aws', status: 'healthy' },
    ],
    configSummary: [
      { key: 'instance_type', value: 'm6i.large', masked: false },
      { key: 'min_instances', value: '3', masked: false },
      { key: 'max_instances', value: '12', masked: false },
      { key: 'db_instance_class', value: 'db.r6g.xlarge', masked: false },
      { key: 'database_password', value: '••••••••••••', masked: true },
      { key: 'stripe_api_key', value: '••••••••••••', masked: true },
    ],
    activity: [
      { label: 'v2.14.3 promoted', detail: 'dep-9308 — canary clean', at: iso(0.8 * hr), state: 'success', actor: 'maya' },
      { label: 'v2.14.2 auto-rolled-back', detail: 'dep-9307 — latency regression', at: iso(14.6 * hr), state: 'failed', actor: 'watchdog' },
      { label: 'v2.14.1 promoted', detail: 'dep-9305 — steady roll', at: iso(26 * hr), state: 'success', actor: 'maya' },
    ],
  },
  {
    id: 'env-staging',
    name: 'Staging',
    key: 'staging',
    provider: 'gcp',
    region: 'us-central1',
    cloudAccount: 'gcp-lab (cerebro-lab)',
    health: 'healthy',
    currentVersion: 'v1.9.0-rc4',
    currentDeploymentId: 'dep-9306',
    lastDeployAt: iso(6 * min),
    uptimePct: 99.82,
    approvalRequired: false,
    locked: false,
    services: [
      { name: 'web-dashboard', kind: 'compute', provider: 'aws', status: 'healthy', endpoint: 'https://staging.cloudweave.io' },
      { name: 'worker-fleet', kind: 'compute', provider: 'gcp', status: 'healthy' },
      { name: 'cloud-sql-15', kind: 'database', provider: 'gcp', status: 'healthy' },
      { name: 'gcs-artifacts', kind: 'storage', provider: 'gcp', status: 'healthy' },
    ],
    configSummary: [
      { key: 'instance_type', value: 'e2-medium', masked: false },
      { key: 'min_instances', value: '2', masked: false },
      { key: 'max_instances', value: '6', masked: false },
      { key: 'gcp_sa_key', value: '••••••••••••', masked: true },
    ],
    activity: [
      { label: 'v1.9.0-rc4 deploying', detail: 'dep-9306 — apply in progress', at: iso(6 * min), state: 'running', actor: 'pipeline' },
      { label: 'v1.9.0-rc3 promoted', detail: 'dep-9303 — clean', at: iso(20 * hr), state: 'success', actor: 'devon' },
      { label: 'worker-fleet failed deploy', detail: 'dep-9304 — heartbeat quorum', at: iso(29.9 * hr), state: 'failed', actor: 'watchdog' },
    ],
  },
  {
    id: 'env-dev',
    name: 'Development',
    key: 'dev',
    provider: 'azure',
    region: 'eastus',
    cloudAccount: 'azure-sandbox (sp-cerebro)',
    health: 'healthy',
    currentVersion: 'v1.9.0-rc2',
    currentDeploymentId: 'dep-9300',
    lastDeployAt: iso(40 * hr),
    uptimePct: 99.1,
    approvalRequired: false,
    locked: false,
    services: [
      { name: 'web-dashboard', kind: 'compute', provider: 'azure', status: 'healthy' },
      { name: 'flexible-pg-16', kind: 'database', provider: 'azure', status: 'healthy' },
      { name: 'blob-artifacts', kind: 'storage', provider: 'azure', status: 'healthy' },
    ],
    configSummary: [
      { key: 'instance_type', value: 'Standard_B2s', masked: false },
      { key: 'min_instances', value: '1', masked: false },
      { key: 'azure_client_secret', value: '••••••••••••', masked: true },
    ],
    activity: [
      { label: 'v1.9.0-rc2 promoted', detail: 'dep-9300 — nightly', at: iso(40 * hr), state: 'success', actor: 'pipeline' },
      { label: 'Drift reconciled', detail: '1 out-of-band tag change reverted', at: iso(52 * hr), state: 'success', actor: 'scanner' },
    ],
  },
];

export function getEnvironment(id: string): Environment | undefined {
  return environments.find((e) => e.id === id);
}

/* ============================================================
   Overview metrics, activity, charts, logs, notifications
   ============================================================ */

export const overviewMetrics: StatMetric[] = [
  {
    id: 'm-pipelines',
    label: 'Active pipelines',
    value: '6',
    delta: 0,
    deltaDirection: 'flat',
    tone: 'default',
    hint: '2 running in the last hour',
    spark: [3, 4, 4, 5, 4, 6, 5, 6],
  },
  {
    id: 'm-success',
    label: 'Successful runs (24h)',
    value: '31',
    delta: 6.2,
    deltaDirection: 'up',
    tone: 'success',
    hint: 'vs 29 yesterday',
    spark: [22, 26, 24, 28, 27, 30, 29, 31],
  },
  {
    id: 'm-failed',
    label: 'Failed runs (24h)',
    value: '2',
    delta: -18.4,
    deltaDirection: 'down',
    tone: 'fail',
    hint: 'gateway-api test stage, worker heartbeat',
    spark: [5, 4, 6, 3, 4, 3, 4, 2],
  },
  {
    id: 'm-deploys',
    label: 'Deployments (24h)',
    value: '9',
    delta: 12.5,
    deltaDirection: 'up',
    tone: 'accent',
    hint: '4 production · 5 non-prod',
    spark: [5, 7, 6, 8, 7, 8, 9, 9],
  },
  {
    id: 'm-alerts',
    label: 'Active alerts',
    value: '4',
    delta: 33.3,
    deltaDirection: 'up',
    tone: 'warn',
    hint: '1 paging · 3 ticketed',
    spark: [2, 3, 2, 3, 3, 4, 4, 4],
  },
  {
    id: 'm-anomalies',
    label: 'Open anomalies',
    value: '2',
    delta: -33.3,
    deltaDirection: 'down',
    tone: 'warn',
    hint: '1 investigating · 1 detected',
    spark: [4, 3, 3, 2, 3, 3, 2, 2],
  },
  {
    id: 'm-mttr',
    label: 'Mean time to recover',
    value: '21m',
    delta: -14.2,
    deltaDirection: 'down',
    tone: 'success',
    hint: 'rollback SLO: 30m',
    spark: [32, 30, 28, 26, 25, 23, 22, 21],
  },
  {
    id: 'm-error',
    label: 'Error rate',
    value: '0.9%',
    delta: -1.7,
    deltaDirection: 'down',
    tone: 'success',
    hint: 'recovering post-rollback',
    spark: [2.4, 2.1, 1.8, 1.6, 1.4, 1.1, 1.0, 0.9],
  },
];

export const activity: ActivityItem[] = [
  { id: 'a1', kind: 'pipeline', status: 'running', title: 'web-dashboard · run-1843', env: 'staging', at: iso(11 * min), duration: '11m', actor: 'devon', href: '/dashboard/pipelines/run-1843' },
  { id: 'a2', kind: 'deployment', status: 'successful', title: 'v2.14.3 → production', env: 'production', at: iso(0.8 * hr), duration: '4m 54s', actor: 'maya', href: '/dashboard/deployments/dep-9308' },
  { id: 'a3', kind: 'anomaly', status: 'page', title: 'p95 latency spike on gateway-api', env: 'production', at: iso(2.2 * hr), actor: 'detector', href: '/dashboard/anomalies/anom-1' },
  { id: 'a4', kind: 'alert', status: 'acknowledged', title: 'Latency regression — dep-9307 linked', env: 'production', at: iso(2.1 * hr), actor: 'maya', href: '/dashboard/alerts/alg-3' },
  { id: 'a5', kind: 'pipeline', status: 'failed', title: 'gateway-api · run-1840 (test)', env: 'production', at: iso(4.2 * hr), duration: '3m 32s', actor: 'alex', href: '/dashboard/pipelines/run-1840' },
  { id: 'a6', kind: 'deployment', status: 'rolled-back', title: 'v2.14.2 auto-rollback', env: 'production', at: iso(14.6 * hr), duration: '18m 28s', actor: 'watchdog', href: '/dashboard/deployments/dep-9307' },
  { id: 'a7', kind: 'anomaly', status: 'ticket', title: 'CPU profile drift on worker-fleet', env: 'staging', at: iso(5.5 * hr), actor: 'detector', href: '/dashboard/anomalies/anom-2' },
  { id: 'a8', kind: 'alert', status: 'active', title: 'Terraform drift — edge-proxy', env: 'production', at: iso(11 * hr), actor: 'scanner', href: '/dashboard/alerts/alg-4' },
];

/* 24h run throughput, hourly */
export const throughputSeries: SeriesPoint[] = Array.from({ length: 24 }, (_, i) => {
  const h = (new Date().getHours() - 23 + i + 24) % 24;
  const ok = 1 + ((i * 5 + 3) % 4) + (h >= 9 && h <= 18 ? 2 : 0);
  const fail = (i * 7 + 2) % 5 === 0 ? 1 : i > 20 ? 1 : 0;
  return { t: `${String(h).padStart(2, '0')}:00`, v: ok + fail, ok, fail };
});

export const deployFreqSeries: SeriesPoint[] = [
  { t: 'Mon', v: 6 }, { t: 'Tue', v: 9 }, { t: 'Wed', v: 7 },
  { t: 'Thu', v: 11 }, { t: 'Fri', v: 8 }, { t: 'Sat', v: 3 }, { t: 'Sun', v: 4 },
];

export const successRateSeries: SeriesPoint[] = [
  { t: 'W1', v: 88 }, { t: 'W2', v: 91 }, { t: 'W3', v: 89 },
  { t: 'W4', v: 93 }, { t: 'W5', v: 92 }, { t: 'W6', v: 95 }, { t: 'W7', v: 94 },
];

export const latencySeries: SeriesPoint[] = Array.from({ length: 48 }, (_, i) => {
  const spike = i > 41;
  const v = spike ? 180 + ((i - 41) * 46) : 140 + ((i * 13) % 22);
  return { t: `${Math.floor(i / 2)}:00`, v: Number(v.toFixed(0)) };
});

export const systemActivity: { cpu: number; memory: number; disk: number } = { cpu: 34.2, memory: 58.1, disk: 41.3 };

export const recentLogs: LogLine[] = [
  { ln: 1, ts: clockTime(iso(2 * min)), level: 'info', msg: 'Pipeline event recorded: run-1843 (web-dashboard) stage=plan' },
  { ln: 2, ts: clockTime(iso(6 * min)), level: 'info', msg: 'Monitor cycle complete: 0 new anomalies' },
  { ln: 3, ts: clockTime(iso(14 * min)), level: 'ok', msg: 'dep-9308 canary promoted to 100% traffic' },
  { ln: 4, ts: clockTime(iso(31 * min)), level: 'warn', msg: 'postgres pool utilization 78% (threshold 85%)' },
  { ln: 5, ts: clockTime(iso(58 * min)), level: 'info', msg: 'Pipeline event recorded: run-1842 success in 2m 48s' },
  { ln: 6, ts: clockTime(iso(2.2 * hr)), level: 'error', msg: 'Forecast-residual anomaly detected: http.request.duration.p95' },
  { ln: 7, ts: clockTime(iso(2.25 * hr)), level: 'warn', msg: 'PagerDuty incident INC-4412 opened for alg-3' },
  { ln: 8, ts: clockTime(iso(2.4 * hr)), level: 'info', msg: 'Drift scan scheduled: next run in 22m' },
];

export const notifications: NotificationItem[] = [
  { id: 'n1', title: 'dep-9308 promoted to 100%', sub: 'production · v2.14.3', at: iso(0.4 * hr), unread: true, tone: 'success' },
  { id: 'n2', title: 'Paged: latency regression on gateway-api', sub: 'alg-3 · assigned to you', at: iso(2.1 * hr), unread: true, tone: 'fail' },
  { id: 'n3', title: 'run-1840 failed at test stage', sub: 'gateway-api · 2m 10s in', at: iso(4.1 * hr), unread: true, tone: 'fail' },
  { id: 'n4', title: 'Drift scan found 1 change', sub: 'edge-proxy · sg-0a12 port 9090', at: iso(11 * hr), unread: false, tone: 'warn' },
];
