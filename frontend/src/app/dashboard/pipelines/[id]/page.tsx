'use client';

import React, { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, GitBranch, Play, RotateCw } from 'lucide-react';
import { PageHeader } from '../../../../components/cerebro/app-shell';
import { Panel, StatusBadge, Tabs, useToast, EmptyState } from '../../../../components/cerebro/ui-kit';
import { getPipeline, getRun, runsForPipeline, formatDuration, timeAgo, clockTime } from '../../../../lib/cerebro/mock-data';
import type { PipelineRun } from '../../../../lib/cerebro/types';

/* deterministic log generation per run+stage */
function logsFor(run: PipelineRun, stageKey?: string) {
  const base = run.startedAt;
  const stage = stageKey ? run.stages.find((s) => s.key === stageKey) : undefined;
  const name = stage ? stage.label : run.pipelineName;
  const lines: { ln: number; ts: string; level: 'info' | 'warn' | 'error' | 'ok' | 'debug'; msg: string }[] = [];
  const push = (offsetMin: number, level: typeof lines[0]['level'], msg: string) => {
    lines.push({ ln: lines.length + 1, ts: clockTime(new Date(new Date(base).getTime() + offsetMin * 60000).toISOString()), level, msg });
  };
  push(0, 'info', `[${run.id}] ${stage ? `stage ${stage.key} started` : 'pipeline triggered'} (${name})`);
  push(0.2, 'debug', 'agent: executor-7f3a attached, image digest sha256:9c41…');
  // when viewing "all" stages, narrate the run's overall outcome:
  // success -> green story, failed -> story ending at the first failed stage
  const focus = stage ?? (run.status === 'failed' ? run.stages.find((s) => s.status === 'failed') : undefined) ?? run.stages[run.stages.length - 1];
  if (focus.status === 'success' || run.status === 'success') {
    push(0.4, 'info', `checkout: ${run.branch}@${run.commit}`);
    push(1.1, 'ok', `${name}: all checks green`);
    push(1.2, 'info', `artifacts uploaded (${(2 + (run.durationSec % 7)).toFixed(0)} MB)`);
    push(1.3, 'ok', `${name}: completed`);
  } else if (focus.status === 'failed') {
    push(0.4, 'info', `checkout: ${run.branch}@${run.commit}`);
    push(0.9, 'info', 'running test matrix: 4 workers');
    push(1.4, 'warn', 'worker-3: retrying flaky suite (attempt 2/3)');
    push(1.8, 'error', 'FAIL src/webhooks/backpressure.test.ts — expected 200, received 503');
    push(1.85, 'error', 'quorum lost: 3 of 4 workers reporting failures');
    push(1.9, 'error', `${name}: FAILED — exit code 1`);
  } else if (focus.status === 'running') {
    push(0.4, 'info', `checkout: ${run.branch}@${run.commit}`);
    push(0.7, 'info', `${name}: executing (elapsed ${formatDuration(Math.round((Date.now() - new Date(base).getTime()) / 1000))})`);
    push(0.8, 'debug', 'stream: 1,204 lines/min');
  } else {
    push(0, 'debug', `${name}: waiting for upstream — nothing to report yet`);
  }
  return lines;
}

export default function PipelineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { push } = useToast();
  const { id } = use(params);

  const pipeline = useMemo(() => getPipeline(id) ?? undefined, [id]);
  const runs = useMemo(() => runsForPipeline(id), [id]);
  const run = useMemo(() => getRun(id), [id]);

  const [stageTab, setStageTab] = useState<string>('all');
  const [logSearch, setLogSearch] = useState('');

  if (!pipeline && !run) {
    return (
      <div className="panel">
        <EmptyState
          icon={<GitBranch size={18} />}
          title="Run not found"
          body={`No pipeline or run matches “${id}”. It may have been pruned from the demo dataset.`}
          action={<Link href="/dashboard/pipelines" className="btn btn-sm">Back to pipelines</Link>}
        />
      </div>
    );
  }

  // resolve display target: a run id or a pipeline id
  const activeRun: PipelineRun = run ?? runs[0];
  const meta = pipeline ?? {
    id: activeRun.pipelineId,
    name: activeRun.pipelineName,
    repo: `cerebrops/${activeRun.pipelineId}`,
    provider: 'aws' as const,
    defaultBranch: 'main',
    lastStatus: activeRun.status,
    lastRunId: activeRun.id,
    lastRunAt: activeRun.startedAt,
    avgDurationSec: activeRun.durationSec,
    successRate: 0.95,
    successRateTrend: 0,
    env: activeRun.env,
    weeklyRuns: 30,
    stages: activeRun.stages.map((s) => ({ key: s.key, label: s.label })),
  };

  const history = run ? [run, ...runs.filter((r) => r.id !== run.id)] : runs;
  const logs = logsFor(activeRun, stageTab === 'all' ? undefined : stageTab).filter((l) =>
    logSearch ? l.msg.toLowerCase().includes(logSearch.toLowerCase()) : true
  );

  const rerun = () => push({ title: `Re-run queued: ${activeRun.id}`, sub: 'queued at highest priority', tone: 'success' });
  const cancel = () => push({ title: `Run ${activeRun.id} cancelled`, sub: 'workers drained gracefully', tone: 'warn' });

  return (
    <div>
      {/* sticky run header */}
      <div
        className="sticky-run sticky z-30 flex items-center gap-3 flex-wrap"
        style={{
          top: -24,
          margin: '-24px -16px 20px',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'color-mix(in srgb, var(--bg) 84%, transparent)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
        }}
      >
        <button className="icon-btn" onClick={() => router.push('/dashboard/pipelines')} aria-label="Back to pipelines">
          <ArrowLeft size={15} />
        </button>
        <span className="sr-id mono text-sm font-semibold">{activeRun.id}</span>
        <div className="flex items-center gap-2 min-w-0 overflow-hidden flex-wrap">
          <StatusBadge status={activeRun.status} />
          <span className="chip">{activeRun.env}</span>
          <span className="chip hidden sm:inline-flex">{activeRun.branch}@{activeRun.commit}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {activeRun.status === 'running' && (
            <button className="btn btn-sm" onClick={cancel}>Cancel</button>
          )}
          <button className="btn btn-sm btn-primary" onClick={rerun}>
            <RotateCw size={12} /> Re-run
          </button>
        </div>
      </div>

      <PageHeader
        title={meta.name}
        sub={`${meta.repo} · ${meta.weeklyRuns} runs / week · avg ${formatDuration(meta.avgDurationSec)}`}
      />

      {/* stage rail */}
      <Panel title="Stages" subtitle={`${activeRun.trigger} trigger · started ${timeAgo(activeRun.startedAt)} by ${activeRun.author}`} className="mb-4">
        <div className="pg-rail">
          {activeRun.stages.map((st, i) => {
            const cls =
              st.status === 'success' ? 'pg-passed' : st.status === 'failed' ? 'pg-failed' : st.status === 'running' ? 'pg-running' : 'pg-pending';
            const conn =
              i === 0 ? '' : activeRun.stages[i - 1].status === 'success' ? 'done' : activeRun.stages[i - 1].status === 'failed' ? 'fail' : activeRun.stages[i - 1].status === 'running' ? 'active' : '';
            return (
              <React.Fragment key={st.key}>
                {i > 0 && <div className={`pg-conn ${conn}`} />}
                <button className={`pg-stage ${cls}`} onClick={() => setStageTab(st.key)} title={`View ${st.label} logs`}>
                  <span className="pg-node">{st.key.slice(0, 2).toUpperCase()}</span>
                  <span className="pg-name">{st.label}</span>
                  <span className="pg-meta">{st.durationSec ? formatDuration(st.durationSec) : '—'}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <div className="px-4 pb-4 flex flex-wrap gap-x-6 gap-y-1 text-xs" style={{ color: 'var(--ink-muted)' }}>
          <span>commit: <span className="mono" style={{ color: 'var(--ink-secondary)' }}>{activeRun.commitMessage}</span></span>
          <span>author: <span className="mono">{activeRun.author}</span></span>
        </div>
      </Panel>

      <div className="grid-2 mb-4">
        {/* run facts */}
        <Panel title="Run facts">
          <div className="px-4 py-1">
            <div className="fact-row">
              <span className="fact-k">Duration</span>
              <span className="fact-v num">{activeRun.status === 'running' ? `${formatDuration(Math.round((Date.now() - new Date(activeRun.startedAt).getTime()) / 1000))} (elapsed)` : formatDuration(activeRun.durationSec)}</span>
            </div>
            <div className="fact-row">
              <span className="fact-k">Trigger</span>
              <span className="fact-v chip">{activeRun.trigger}</span>
            </div>
            <div className="fact-row">
              <span className="fact-k">Environment</span>
              <span className="fact-v chip">{activeRun.env}</span>
            </div>
            <div className="fact-row">
              <span className="fact-k">Branch</span>
              <span className="fact-v mono text-xs">{activeRun.branch}</span>
            </div>
            <div className="fact-row">
              <span className="fact-k">Commit</span>
              <span className="fact-v row-commit">{activeRun.commit}</span>
            </div>
            <div className="fact-row">
              <span className="fact-k">Success rate (30d)</span>
              <span className="fact-v num">{Math.round((pipeline?.successRate ?? 0.95) * 100)}%</span>
            </div>
          </div>
        </Panel>

        {/* run history */}
        <Panel title="Run history" subtitle="most recent first" bodyClass="">
          <div className="table-wrap" style={{ maxHeight: 260, overflowY: 'auto' }}>
            <table className="data">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr
                    key={r.id}
                    className={`clickable ${r.id === activeRun.id ? 'selected-row' : ''}`}
                    onClick={() => router.push(`/dashboard/pipelines/${r.id}`)}
                    style={r.id === activeRun.id ? { background: 'var(--accent-soft)' } : undefined}
                  >
                    <td className="mono text-xs">{r.id}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="num text-xs">{formatDuration(r.durationSec)}</td>
                    <td className="mono text-xs" style={{ color: 'var(--ink-muted)' }}>{timeAgo(r.startedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* logs */}
      <Panel
        title="Logs"
        actions={
          <div className="flex items-center gap-2">
            <input
              className="input mono"
              style={{ height: 26, width: 170, fontSize: 11 }}
              placeholder="filter logs…"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              aria-label="Filter log lines"
            />
            <div className="w-40 hidden md:block">
              <Tabs
                tabs={[{ key: 'all', label: 'All' }, ...activeRun.stages.map((s) => ({ key: s.key, label: s.label }))]}
                active={stageTab}
                onChange={setStageTab}
              />
            </div>
          </div>
        }
      >
        <div className="log-viewer" style={{ border: 'none', borderRadius: 0 }}>
          <div className="log-body" style={{ maxHeight: 380 }}>
            {logs.length === 0 ? (
              <div className="log-empty">No log lines match “{logSearch}”</div>
            ) : (
              logs.map((l) => (
                <div className="log-line" key={l.ln}>
                  <span className="ln">{l.ln}</span>
                  <span className="lt">{l.ts}</span>
                  <span className={`ll ll-${l.level}`}>{l.level.toUpperCase()}</span>
                  <span className="lm">{l.msg}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
