'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BellRing, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../../../../components/cerebro/app-shell';
import { ConfirmDialog, EmptyState, Panel, SeverityBadge, StatusBadge, Timeline, useToast } from '../../../../components/cerebro/ui-kit';
import { getAlert, timeAgo } from '../../../../lib/cerebro/mock-data';

export default function AlertDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { push } = useToast();
  const [resolveOpen, setResolveOpen] = React.useState(false);
  const a = getAlert(id);

  if (!a) {
    return (
      <div className="panel">
        <EmptyState
          icon={<BellRing size={18} />}
          title="Alert not found"
          body={`No alert matches “${id}”.`}
          action={<Link href="/dashboard/alerts" className="btn btn-sm">Back to alerts</Link>}
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
        <button className="icon-btn" onClick={() => router.push('/dashboard/alerts')} aria-label="Back to alerts">
          <ArrowLeft size={15} />
        </button>
        <span className="sr-id mono text-sm font-semibold">{a.id}</span>
        <div className="flex items-center gap-2 flex-wrap">
          <SeverityBadge severity={a.severity} />
          <StatusBadge status={a.status} />
          <span className="chip">{a.channel}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {a.status === 'active' && (
            <button
              className="btn btn-sm"
              onClick={() => push({ title: 'Alert acknowledged', sub: `${a.id} assigned to you`, tone: 'success' })}
            >
              Acknowledge
            </button>
          )}
          {a.status !== 'resolved' && (
            <button className="btn btn-sm btn-primary" onClick={() => setResolveOpen(true)}>
              <CheckCircle2 size={13} /> Resolve
            </button>
          )}
        </div>
      </div>

      <PageHeader title={a.title} sub={`Fired ${timeAgo(a.createdAt)} via ${a.source} · routed to ${a.channel}${a.assignee ? ` · assigned to ${a.assignee}` : ''}`} />

      <div className="grid-2 mb-4">
        <div className="stack-gap">
          <Panel title="Message">
            <div className="p-4">
              <p className="text-sm" style={{ color: 'var(--ink)' }}>{a.message}</p>
              <div className="mt-3 p-3 rounded-[var(--r-md)]" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-faint)' }}>
                <p className="eyebrow mb-1">Trigger condition</p>
                <p className="mono text-xs" style={{ color: 'var(--ink-secondary)' }}>{a.triggerCondition}</p>
              </div>
            </div>
          </Panel>

          <Panel title="Routing">
            <div className="px-4 py-1">
              <div className="fact-row">
                <span className="fact-k">Source</span>
                <span className="fact-v chip">{a.source}</span>
              </div>
              <div className="fact-row">
                <span className="fact-k">Channel</span>
                <span className="fact-v chip">{a.channel}</span>
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
        </div>

        <div className="stack-gap">
          <Panel title="Related signals">
            <div className="px-4 py-1">
              {a.relatedAnomalyId && (
                <div className="fact-row">
                  <span className="fact-k">Anomaly</span>
                  <span className="fact-v">
                    <Link className="mono text-xs" style={{ color: 'var(--accent)' }} href={`/dashboard/anomalies/${a.relatedAnomalyId}`}>
                      {a.relatedAnomalyId} →
                    </Link>
                  </span>
                </div>
              )}
              {a.relatedDeploymentId && (
                <div className="fact-row">
                  <span className="fact-k">Deployment</span>
                  <span className="fact-v">
                    <Link className="mono text-xs" style={{ color: 'var(--accent)' }} href={`/dashboard/deployments/${a.relatedDeploymentId}`}>
                      {a.relatedDeploymentId} →
                    </Link>
                  </span>
                </div>
              )}
              {!a.relatedAnomalyId && !a.relatedDeploymentId && (
                <div className="fact-row">
                  <span className="fact-k">Links</span>
                  <span className="fact-v text-xs" style={{ color: 'var(--ink-muted)' }}>none recorded</span>
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Alert timeline">
            <div className="p-4">
              <Timeline events={a.timeline} />
            </div>
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={resolveOpen}
        onClose={() => setResolveOpen(false)}
        onConfirm={() => push({ title: 'Alert resolved', sub: `${a.id} closed`, tone: 'success' })}
        title={`Resolve ${a.id}?`}
        body="Resolving closes the incident trail. If the underlying condition fires again, a new alert is raised with a fresh timeline."
        confirmLabel="Resolve alert"
      />
    </div>
  );
}
