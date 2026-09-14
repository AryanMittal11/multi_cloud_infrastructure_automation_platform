'use client';

import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { PageHeader } from '../../../components/cerebro/app-shell';
import { Panel, Segmented, StatTile, useToast } from '../../../components/cerebro/ui-kit';
import { BarsChart, DonutChart, MetricLineChart, ThroughputChart } from '../../../components/cerebro/charts';
import { pipelines, throughputSeries, deployFreqSeries, successRateSeries, latencySeries } from '../../../lib/cerebro/mock-data';

const DORA = [
  { id: 'd1', label: 'Deployment frequency', value: '48 / week', delta: 9.1, direction: 'up' as const, hint: 'elite band', good: true },
  { id: 'd2', label: 'Lead time for changes', value: '42m', delta: -12.5, direction: 'down' as const, hint: 'commit → prod', good: true },
  { id: 'd3', label: 'Change failure rate', value: '8.4%', delta: -2.1, direction: 'down' as const, hint: 'target < 10%', good: true },
  { id: 'd4', label: 'Mean time to recover', value: '21m', delta: -14.2, direction: 'down' as const, hint: 'rollback SLO 30m', good: true },
];

export default function AnalyticsPage() {
  const { push } = useToast();
  const [range, setRange] = useState('7d');
  const [env, setEnv] = useState('all');
  const [pipeline, setPipeline] = useState('all');

  const donut = useMemo(
    () => [
      { name: 'successful', value: 94, color: 'var(--success)' },
      { name: 'failed', value: 4, color: 'var(--fail)' },
      { name: 'cancelled', value: 2, color: 'var(--ink-muted)' },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Analytics"
        sub="Delivery and reliability metrics over the selected window — DORA core four, throughput, and detector activity."
        actions={
          <>
            <button className="btn btn-sm" onClick={() => push({ title: 'Report export queued', sub: 'PDF lands in your inbox', tone: 'info' })}>
              <Download size={13} /> Export report
            </button>
          </>
        }
      />

      {/* filters */}
      <div className="filter-bar">
        <Segmented
          options={[
            { key: '24h', label: '24h' },
            { key: '7d', label: '7d' },
            { key: '30d', label: '30d' },
            { key: '90d', label: '90d' },
          ]}
          value={range}
          onChange={setRange}
        />
        <select className="select" value={env} onChange={(e) => setEnv(e.target.value)} aria-label="Environment filter">
          <option value="all">All environments</option>
          <option value="production">Production</option>
          <option value="staging">Staging</option>
        </select>
        <select className="select" value={pipeline} onChange={(e) => setPipeline(e.target.value)} aria-label="Pipeline filter">
          <option value="all">All pipelines</option>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <span className="text-xs ml-auto" style={{ color: 'var(--ink-muted)' }}>
          {range === '24h' ? 'Last 24 hours' : range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'Last quarter'} · demo dataset
        </span>
      </div>

      {/* DORA tiles */}
      <div className="stat-grid">
        {DORA.map((d) => (
          <div key={d.id} className="stat-tile">
            <div className="stat-label">{d.label}</div>
            <div className="stat-value num">{d.value}</div>
            <div className="stat-delta num" style={{ color: d.direction === 'down' ? 'var(--success)' : d.direction === 'up' ? 'var(--accent-strong)' : 'var(--ink-muted)' }}>
              {d.direction === 'up' ? '▲' : '▼'} {Math.abs(d.delta)}% <span style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-ui)' }}>{d.hint}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2 mb-4">
        <Panel title="Pipeline throughput" subtitle="successful vs failed runs per hour">
          <div className="p-3">
            <ThroughputChart data={throughputSeries} height={200} />
          </div>
        </Panel>
        <Panel title="Run outcome split" subtitle="share of run outcomes in window">
          <div className="p-3">
            <DonutChart data={donut} height={200} centerValue="94%" centerLabel="success rate" />
          </div>
        </Panel>
      </div>

      <div className="grid-2-even mb-4">
        <Panel title="Deployment frequency" subtitle="deploys per weekday">
          <div className="p-3">
            <BarsChart data={deployFreqSeries} height={190} />
          </div>
        </Panel>
        <Panel title="Mean deployment duration" subtitle="minutes per deploy, trending down">
          <div className="p-3">
            <MetricLineChart data={latencySeries.slice(0, 24).map((p, i) => ({ t: p.t, v: Math.max(3, 14 - i * 0.4 + (i % 3)) }))} height={190} color="var(--run)" name="minutes" unit="m" />
          </div>
        </Panel>
      </div>

      <div className="grid-2-even mb-4">
        <Panel title="Pipeline success rate" subtitle="% of runs passing all gates, weekly">
          <div className="p-3">
            <MetricLineChart data={successRateSeries} height={190} color="var(--success)" name="success %" unit="%" />
          </div>
        </Panel>
        <Panel title="Anomaly & alert frequency" subtitle="detections per day">
          <div className="p-3">
            <BarsChart
              data={[
                { t: 'Mon', v: 2 }, { t: 'Tue', v: 1 }, { t: 'Wed', v: 3 },
                { t: 'Thu', v: 2 }, { t: 'Fri', v: 4 }, { t: 'Sat', v: 1 }, { t: 'Sun', v: 0 },
              ]}
              height={190}
              color="var(--warn)"
            />
          </div>
        </Panel>
      </div>

      <Panel title="About these numbers" subtitle="how the demo computes reliability metrics">
        <div className="p-4 text-sm grid gap-3 md:grid-cols-3" style={{ color: 'var(--ink-secondary)' }}>
          <p><span className="font-semibold" style={{ color: 'var(--ink)' }}>Throughput</span> counts pipeline runs recorded by the ingest API per hour, split by outcome. Failed runs include cancelled stages.</p>
          <p><span className="font-semibold" style={{ color: 'var(--ink)' }}>Recovery</span> measures deploy-start → healthy-checks-pass for auto-rollback events. The 30m SLO gates paging escalation.</p>
          <p><span className="font-semibold" style={{ color: 'var(--ink)' }}>Detector activity</span> aggregates forecast-residual, isolation-forest, and EWMA detections before deduplication.</p>
        </div>
      </Panel>
    </div>
  );
}
