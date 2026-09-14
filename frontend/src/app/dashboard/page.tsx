'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Play, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../components/cerebro/app-shell';
import { StatusBadge, Panel, StatTile, Segmented, Timeline, useToast } from '../../components/cerebro/ui-kit';
import { Sparkline, ThroughputChart, BarsChart } from '../../components/cerebro/charts';
import {
  overviewMetrics,
  pipelines,
  activity,
  throughputSeries,
  deployFreqSeries,
  recentLogs,
  timeAgo,
  formatDuration,
  getRun,
} from '../../lib/cerebro/mock-data';
import type { PipelineStatus } from '../../lib/cerebro/types';

const KIND_ICON: Record<string, string> = {
  pipeline: '⚙',
  deployment: '⬆',
  alert: '◆',
  anomaly: '◈',
};

function toneFor(status: string): 'success' | 'fail' | 'warn' | 'run' | 'muted' {
  if (['success', 'successful'].includes(status)) return 'success';
  if (['failed'].includes(status)) return 'fail';
  if (['page', 'active', 'detected', 'rolled-back'].includes(status)) return 'warn';
  if (['running', 'acknowledged', 'in-progress'].includes(status)) return 'run';
  return 'muted';
}

export default function OverviewPage() {
  const { push } = useToast();
  const [range, setRange] = useState<'24h' | '7d'>('24h');
  const running = pipelines.filter((p) => p.lastStatus === 'running');
  const rail = running[0] ?? pipelines[0];
  const railRun = getRun(rail.lastRunId)?.stages ?? rail.stages.map((s, i) => ({ ...s, status: i === 0 ? rail.lastStatus : 'queued', durationSec: 0, seq: i }));

  return (
    <div>
      <PageHeader
        title="Overview"
        sub="Fleet-wide pipeline, deployment, and reliability posture — refreshed live from the demo dataset."
        actions={
          <>
            <button
              className="btn btn-sm"
              onClick={() => push({ title: 'Snapshot refreshed', sub: 'demo dataset re-hydrated', tone: 'info' })}
            >
              <RefreshCw size={13} /> Refresh
            </button>
            <Link href="/dashboard/pipelines" className="btn btn-sm btn-primary">
              <Play size={13} /> Run pipeline
            </Link>
          </>
        }
      />

      {/* ---- stat grid ---- */}
      <div className="stat-grid">
        {overviewMetrics.map((m) => (
          <StatTile
            key={m.id}
            label={m.label}
            value={m.value}
            delta={m.delta}
            deltaDirection={m.deltaDirection}
            hint={m.hint}
            tone={m.tone}
            spark={<Sparkline data={m.spark} color={m.tone === 'fail' ? 'var(--fail)' : m.tone === 'warn' ? 'var(--warn)' : m.tone === 'success' ? 'var(--success)' : 'var(--accent)'} />}
          />
        ))}
      </div>

      <div className="grid-2 mb-4">
        {/* ---- live pipeline rail ---- */}
        <Panel
          title="Live pipeline"
          subtitle={`${rail.name} · ${rail.repo}`}
          actions={
            <span className="pill-live chip" style={{ color: 'var(--success)', borderColor: 'rgba(67,196,99,0.3)' }}>
              <span className="dot dot-run" /> {rail.lastRunId}
            </span>
          }
        >
          <div className="pg-rail">
            {railRun.map((st, i) => {
              const cls =
                st.status === 'success' ? 'pg-passed' : st.status === 'failed' ? 'pg-failed' : st.status === 'running' ? 'pg-running' : 'pg-pending';
              const conn =
                i === 0 ? '' : railRun[i - 1].status === 'success' ? 'done' : railRun[i - 1].status === 'failed' ? 'fail' : railRun[i - 1].status === 'running' ? 'active' : '';
              return (
                <React.Fragment key={st.key}>
                  {i > 0 && <div className={`pg-conn ${conn}`} />}
                  <div className={`pg-stage ${cls}`}>
                    <span className="pg-node">{st.key.slice(0, 2).toUpperCase()}</span>
                    <span className="pg-name">{st.label}</span>
                    <span className="pg-meta">{st.durationSec ? formatDuration(st.durationSec) : '—'}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <div className="px-4 pb-4 flex items-center gap-2 flex-wrap">
            <StatusBadge status={rail.lastStatus} />
            <span className="chip">{rail.env}</span>
            <span className="chip">branch: {running[0] ? 'pr-127' : rail.defaultBranch}</span>
            <Link href={`/dashboard/pipelines/${running[0] ? 'run-1843' : rail.lastRunId}`} className="btn btn-sm btn-ghost ml-auto">
              Inspect run →
            </Link>
          </div>
        </Panel>

        {/* ---- system pulse ---- */}
        <Panel title="Reliability" subtitle="rolling 30-day service posture">
          <div className="px-4 py-2">
            <div className="fact-row">
              <span className="fact-k">Uptime SLO</span>
              <span className="fact-v num" style={{ color: 'var(--success)' }}>99.97%</span>
            </div>
            <div className="fact-row">
              <span className="fact-k">Error budget</span>
              <span className="fact-v num">39% remaining</span>
            </div>
            <div className="fact-row">
              <span className="fact-k">MTTR (30d)</span>
              <span className="fact-v num">21m</span>
            </div>
            <div className="fact-row">
              <span className="fact-k">Change failure rate</span>
              <span className="fact-v num">8.4%</span>
            </div>
            <div className="fact-row">
              <span className="fact-k">Auto-rollback armed</span>
              <span className="fact-v"><span className="dot dot-success" /> production, staging</span>
            </div>
          </div>
        </Panel>
      </div>

      {/* ---- charts ---- */}
      <div className="grid-2 mb-4">
        <Panel
          title="Run throughput"
          subtitle="successful vs failed pipeline runs per hour"
          actions={<Segmented options={[{ key: '24h', label: '24h' }, { key: '7d', label: '7d' }]} value={range} onChange={(v) => setRange(v as '24h' | '7d')} size="sm" />}
        >
          <div className="p-3">
            <ThroughputChart data={throughputSeries} height={196} />
          </div>
        </Panel>
        <Panel title="Deployment frequency" subtitle="deploys per day, last 7 days">
          <div className="p-3">
            <BarsChart data={deployFreqSeries} height={196} />
          </div>
        </Panel>
      </div>

      <div className="grid-2 mb-4">
        {/* ---- activity ---- */}
        <Panel
          title="Recent activity"
          actions={<Link href="/dashboard/analytics" className="text-xs" style={{ color: 'var(--accent)' }}>View analytics →</Link>}
        >
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Event</th>
                  <th>Env</th>
                  <th>Time</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {activity.slice(0, 7).map((a) => (
                  <tr key={a.id} className="clickable" onClick={() => (window.location.href = a.href)}>
                    <td><StatusBadge status={a.status} /></td>
                    <td>
                      <span className="mr-1.5" style={{ color: 'var(--ink-muted)' }}>{KIND_ICON[a.kind]}</span>
                      {a.title}
                    </td>
                    <td><span className="chip">{a.env}</span></td>
                    <td className="mono text-xs" style={{ color: 'var(--ink-muted)' }}>{timeAgo(a.at)}</td>
                    <td className="mono text-xs" style={{ color: 'var(--ink-muted)' }}>{a.actor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* ---- incident timeline ---- */}
        <Panel title="Incident timeline" subtitle="dep-9307 rollback — resolved">
          <div className="p-4">
            <Timeline
              events={[
                { label: 'Canary regression detected', detail: 'p95 412ms · error rate 2.9% on cohort c-1', at: new Date(Date.now() - 14.8 * 3600e3).toISOString(), state: 'failed', actor: 'watchdog' },
                { label: 'Auto-rollback executed', detail: 'traffic reverted to v2.14.1 in 118s', at: new Date(Date.now() - 14.6 * 3600e3).toISOString(), state: 'success', actor: 'watchdog' },
                { label: 'Alert acked', detail: 'maya acked alg-3, postmortem opened', at: new Date(Date.now() - 14.5 * 3600e3).toISOString(), state: 'running', actor: 'maya' },
                { label: 'Monitoring residuals', detail: 'latency back to baseline; keeping incident open 24h', at: new Date(Date.now() - 1.2 * 3600e3).toISOString(), state: 'running', actor: 'detector' },
              ]}
            />
          </div>
        </Panel>
      </div>

      {/* ---- logs ---- */}
      <Panel
        title="Control-plane log"
        subtitle="last 8 events"
        actions={<span className="chip">tail -f cloudweave.log</span>}
      >
        <div className="log-viewer" style={{ border: 'none', borderRadius: 0 }}>
          <div className="log-body" style={{ maxHeight: 240 }}>
            {recentLogs.map((l) => (
              <div className="log-line" key={l.ln}>
                <span className="ln">{l.ln}</span>
                <span className="lt">{l.ts}</span>
                <span className={`ll ll-${l.level}`}>{l.level.toUpperCase()}</span>
                <span className="lm">{l.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}
