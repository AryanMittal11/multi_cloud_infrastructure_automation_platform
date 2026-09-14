'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Search } from 'lucide-react';
import { PageHeader } from '../../../../components/cerebro/app-shell';
import { EmptyState, Panel, SeverityBadge, StatusBadge, Timeline, useToast } from '../../../../components/cerebro/ui-kit';
import { ObservedVsExpectedChart } from '../../../../components/cerebro/charts';
import { getAnomaly, timeAgo } from '../../../../lib/cerebro/mock-data';

export default function AnomalyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { push } = useToast();
  const a = getAnomaly(id);

  if (!a) {
    return (
      <div className="panel">
        <EmptyState
          icon={<Search size={18} />}
          title="Anomaly not found"
          body={`No anomaly matches “${id}”.`}
          action={<Link href="/dashboard/anomalies" className="btn btn-sm">Back to anomalies</Link>}
        />
      </div>
    );
  }

  return (
    <div>
      <div
        className="sticky z-30 flex items-center gap-3 flex-wrap"
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
        <button className="icon-btn" onClick={() => router.push('/dashboard/anomalies')} aria-label="Back to anomalies">
          <ArrowLeft size={15} />
        </button>
        <span className="sr-id mono text-sm font-semibold">{a.id}</span>
        <div className="flex items-center gap-2 flex-wrap">
          <SeverityBadge severity={a.severity} />
          <StatusBadge status={a.state} />
          <span className="chip">{a.env}</span>
        </div>
        <div className="ml-auto">
          {a.state !== 'resolved' && (
            <button
              className="btn btn-sm btn-primary"
              onClick={() => push({ title: 'Marked investigating', sub: `${a.id} assigned to you`, tone: 'info' })}
            >
              <CheckCircle2 size={13} /> Acknowledge
            </button>
          )}
        </div>
      </div>

      <PageHeader title={a.title} sub={`Detected ${timeAgo(a.detectedAt)} · ${a.method} · ${a.deviation}σ deviation · confidence ${Math.round(a.confidence * 100)}%`} />

      <div className="grid-2 mb-4">
        <Panel title="Expected vs observed" subtitle={`${a.metric} — last 48h`}>
          <div className="p-3">
            <ObservedVsExpectedChart data={a.series} height={220} />
          </div>
        </Panel>

        <div className="stack-gap">
          <Panel title="Detection">
            <div className="px-4 py-1">
              <div className="fact-row">
                <span className="fact-k">Observed</span>
                <span className="fact-v num" style={{ color: 'var(--fail)' }}>{a.observed}</span>
              </div>
              <div className="fact-row">
                <span className="fact-k">Expected</span>
                <span className="fact-v num">{a.expected}</span>
              </div>
              <div className="fact-row">
                <span className="fact-k">Service</span>
                <span className="fact-v mono text-xs">{a.service}</span>
              </div>
              <div className="fact-row">
                <span className="fact-k">Environment</span>
                <span className="fact-v chip">{a.env}</span>
              </div>
            </div>
          </Panel>

          <Panel title="Related signals">
            <div className="px-4 py-1">
              {a.relatedRunId && (
                <div className="fact-row">
                  <span className="fact-k">Pipeline run</span>
                  <span className="fact-v">
                    <Link className="mono text-xs" style={{ color: 'var(--accent)' }} href={`/dashboard/pipelines/${a.relatedRunId}`}>{a.relatedRunId} →</Link>
                  </span>
                </div>
              )}
              {a.relatedDeployment && (
                <div className="fact-row">
                  <span className="fact-k">Deployment</span>
                  <span className="fact-v">
                    <Link className="mono text-xs" style={{ color: 'var(--accent)' }} href={`/dashboard/deployments/${a.relatedDeployment}`}>{a.relatedDeployment} →</Link>
                  </span>
                </div>
              )}
              {!a.relatedRunId && !a.relatedDeployment && (
                <div className="fact-row">
                  <span className="fact-k">Links</span>
                  <span className="fact-v text-xs" style={{ color: 'var(--ink-muted)' }}>no correlated deploys</span>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid-2 mb-4">
        <Panel title="Metric contributions" subtitle="share of residual variance">
          <div className="p-4">
            {a.contributions.map((c) => (
              <div key={c.metric} className="mb-3">
                <div className="flex justify-between text-xs num" style={{ color: 'var(--ink-secondary)' }}>
                  <span>{c.metric}</span>
                  <span style={{ color: 'var(--ink-faint)' }}>{c.pct}%</span>
                </div>
                <div className="z-bar"><i style={{ width: `${c.pct}%` }} /></div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Resolution" subtitle="recommended next step">
          <div className="p-4">
            <p className="text-sm" style={{ color: 'var(--ink)' }}>{a.recommendedAction}</p>
            {a.rootCause && (
              <div
                className="mt-3 p-3 rounded-[var(--r-md)] text-xs"
                style={{ background: 'var(--fail-soft)', border: '1px solid rgba(242,85,76,0.22)' }}
              >
                <p className="font-semibold" style={{ color: 'var(--fail)' }}>Root cause hypothesis</p>
                <p className="mt-1 mono" style={{ color: 'var(--ink-secondary)' }}>{a.rootCause}</p>
              </div>
            )}
          </div>
        </Panel>
      </div>

      <Panel title="Anomaly timeline">
        <div className="p-4">
          <Timeline events={a.timeline} />
        </div>
      </Panel>
    </div>
  );
}
