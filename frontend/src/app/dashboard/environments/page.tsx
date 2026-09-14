'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Lock, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../../components/cerebro/app-shell';
import { StatusBadge, useToast } from '../../../components/cerebro/ui-kit';
import { environments, timeAgo } from '../../../lib/cerebro/mock-data';

export default function EnvironmentsPage() {
  const { push } = useToast();

  return (
    <div>
      <PageHeader
        title="Environments"
        sub="Long-lived deployment targets with their own credentials, approval gates, and health posture."
        actions={
          <button className="btn btn-sm btn-primary" onClick={() => push({ title: 'Environment editor', sub: 'available in the full workspace', tone: 'info' })}>
            New environment…
          </button>
        }
      />

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
        {environments.map((e) => (
          <article key={e.id} className="env-card" style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', background: 'var(--surface)', overflow: 'hidden' }}>
            <div className="env-head flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--border-faint)' }}>
              <span
                className={`dot ${e.health === 'healthy' ? 'dot-success' : e.health === 'degraded' ? 'dot-warn' : 'dot-fail'}`}
                style={{ width: 10, height: 10 }}
              />
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>{e.name}</h3>
                <p className="mono text-xs" style={{ color: 'var(--ink-muted)' }}>{e.provider} · {e.region} · {e.cloudAccount}</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                {e.locked && <span className="chip"><Lock size={10} /> locked</span>}
                {e.approvalRequired && <span className="chip"><ShieldCheck size={10} /> approval</span>}
              </div>
            </div>

            <div className="p-4">
              <div className="fact-row">
                <span className="fact-k">Health</span>
                <span className="fact-v"><StatusBadge status={e.health} /></span>
              </div>
              <div className="fact-row">
                <span className="fact-k">Current version</span>
                <span className="fact-v mono text-xs">{e.currentVersion}</span>
              </div>
              <div className="fact-row">
                <span className="fact-k">Last deploy</span>
                <span className="fact-v text-xs" style={{ color: 'var(--ink-muted)' }}>{timeAgo(e.lastDeployAt)} · <Link className="mono" style={{ color: 'var(--accent)' }} href={`/dashboard/deployments/${e.currentDeploymentId}`}>{e.currentDeploymentId}</Link></span>
              </div>
              <div className="fact-row">
                <span className="fact-k">Services</span>
                <span className="fact-v text-xs num">
                  {e.services.length} total · {e.services.filter((s) => s.status === 'healthy').length} healthy
                </span>
              </div>
              <div className="fact-row">
                <span className="fact-k">Uptime (30d)</span>
                <span className="fact-v num" style={{ color: e.uptimePct > 99.9 ? 'var(--success)' : 'var(--warn)' }}>{e.uptimePct}%</span>
              </div>
            </div>

            <div className="px-4 pb-4">
              <Link href={`/dashboard/environments/${e.id}`} className="btn btn-sm w-full">
                Inspect environment <ArrowRight size={12} />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
