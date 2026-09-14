'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../../../components/cerebro/app-shell';
import { ConfirmDialog, EmptyState, Panel, StatusBadge, Timeline, useToast } from '../../../../components/cerebro/ui-kit';
import { getEnvironment, timeAgo } from '../../../../lib/cerebro/mock-data';

export default function EnvironmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { push } = useToast();
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [freezeOpen, setFreezeOpen] = useState(false);
  const env = getEnvironment(id);

  if (!env) {
    return (
      <div className="panel">
        <EmptyState
          icon={<ShieldCheck size={18} />}
          title="Environment not found"
          body={`No environment matches “${id}”.`}
          action={<Link href="/dashboard/environments" className="btn btn-sm">Back to environments</Link>}
        />
      </div>
    );
  }

  const toggleReveal = (key: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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
        <button className="icon-btn" onClick={() => router.push('/dashboard/environments')} aria-label="Back to environments">
          <ArrowLeft size={15} />
        </button>
        <span className="sr-id text-sm font-semibold">{env.name}</span>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={env.health} />
          <span className="chip">{env.provider} · {env.region}</span>
          {env.approvalRequired && <span className="chip"><ShieldCheck size={10} /> approval required</span>}
        </div>
        <div className="ml-auto">
          <button className="btn btn-sm" onClick={() => setFreezeOpen(true)}>
            <Lock size={12} /> {env.locked ? 'Unfreeze' : 'Freeze deploys'}
          </button>
        </div>
      </div>

      <PageHeader
        title={env.name}
        sub={`${env.cloudAccount} · running ${env.currentVersion} · last deploy ${timeAgo(env.lastDeployAt)}`}
      />

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">Uptime (30d)</div>
          <div className="stat-value num">{env.uptimePct}%</div>
          <div className="stat-delta" style={{ color: env.uptimePct > 99.9 ? 'var(--success)' : 'var(--warn)' }}>
            SLO target 99.9%
          </div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Services</div>
          <div className="stat-value num">{env.services.length}</div>
          <div className="stat-delta" style={{ color: 'var(--ink-muted)' }}>
            {env.services.filter((s) => s.status === 'healthy').length} healthy
          </div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Current version</div>
          <div className="stat-value mono" style={{ fontSize: 22 }}>{env.currentVersion}</div>
          <div className="stat-delta" style={{ color: 'var(--ink-muted)' }}>
            <Link className="mono" style={{ color: 'var(--accent)' }} href={`/dashboard/deployments/${env.currentDeploymentId}`}>
              {env.currentDeploymentId} →
            </Link>
          </div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Deploy policy</div>
          <div className="stat-value" style={{ fontSize: 22 }}>{env.approvalRequired ? 'Gated' : 'Auto'}</div>
          <div className="stat-delta" style={{ color: 'var(--ink-muted)' }}>
            {env.locked ? 'deploys frozen' : 'deploys armed'}
          </div>
        </div>
      </div>

      <div className="grid-2 mb-4">
        <Panel title="Service health">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Kind</th>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Endpoint</th>
                </tr>
              </thead>
              <tbody>
                {env.services.map((s) => (
                  <tr key={s.name}>
                    <td className="mono text-xs" style={{ color: 'var(--ink)' }}>{s.name}</td>
                    <td><span className="chip">{s.kind}</span></td>
                    <td className="mono text-xs">{s.provider}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td className="mono text-xs" style={{ color: 'var(--ink-muted)' }}>{s.endpoint ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title="Configuration"
          subtitle="secrets stay masked — reveal is demo-only"
          actions={
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setRevealed(revealed.size ? new Set() : new Set(env.configSummary.map((c) => c.key)))}
            >
              {revealed.size ? <EyeOff size={12} /> : <Eye size={12} />} {revealed.size ? 'Mask all' : 'Reveal all'}
            </button>
          }
        >
          <div className="px-4 py-1">
            {env.configSummary.map((c) => (
              <div className="fact-row" key={c.key}>
                <span className="fact-k">{c.key}</span>
                <span className="fact-v mono text-xs">
                  {c.masked && !revealed.has(c.key) ? (
                    <span style={{ color: 'var(--ink-muted)' }}>{c.value}</span>
                  ) : c.masked ? (
                    <span style={{ color: 'var(--warn)' }}>{c.key.replace(/_/g, '-')}-revealed (demo)</span>
                  ) : (
                    c.value
                  )}
                  {c.masked && (
                    <button className="var-reveal icon-btn" style={{ width: 24, height: 24 }} onClick={() => toggleReveal(c.key)} aria-label={`Toggle reveal ${c.key}`}>
                      {revealed.has(c.key) ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Recent activity" subtitle="deployments, drift, and policy events">
        <div className="p-4">
          <Timeline events={env.activity} />
        </div>
      </Panel>

      <ConfirmDialog
        open={freezeOpen}
        onClose={() => setFreezeOpen(false)}
        onConfirm={() => push({ title: env.locked ? 'Deploys unfrozen' : 'Deploys frozen', sub: `${env.name} policy updated`, tone: 'warn' })}
        title={env.locked ? `Unfreeze ${env.name}?` : `Freeze deploys on ${env.name}?`}
        body={
          env.locked
            ? 'Pipeline promotions will resume targeting this environment immediately.'
            : 'All in-flight and queued promotions to this environment will pause at the approval gate until unfrozen. Rollbacks remain allowed.'
        }
        confirmLabel={env.locked ? 'Unfreeze' : 'Freeze deploys'}
        danger={!env.locked}
      />
    </div>
  );
}
