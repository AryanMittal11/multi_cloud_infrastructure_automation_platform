'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../../../components/cerebro/app-shell';
import { ConfirmDialog, EmptyState, Panel, StatusBadge, Timeline, useToast } from '../../../../components/cerebro/ui-kit';
import { getDeployment, formatDuration, timeAgo } from '../../../../lib/cerebro/mock-data';
import type { HealthCheck } from '../../../../lib/cerebro/types';

function CheckRow({ c }: { c: HealthCheck }) {
  const tone = c.status === 'pass' ? 'var(--success)' : c.status === 'fail' ? 'var(--fail)' : c.status === 'warn' ? 'var(--warn)' : 'var(--ink-muted)';
  return (
    <div className="fact-row">
      <span className="fact-k" style={{ color: tone }}>● {c.name}</span>
      <span className="fact-v text-xs" style={{ color: 'var(--ink-muted)' }}>
        {c.detail} <span className="mono" style={{ color: 'var(--ink-faint)' }}>· {(c.durationMs / 1000).toFixed(0)}s</span>
      </span>
    </div>
  );
}

export default function DeploymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { push } = useToast();
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const dep = getDeployment(id);

  if (!dep) {
    return (
      <div className="panel">
        <EmptyState
          icon={<ShieldCheck size={18} />}
          title="Deployment not found"
          body={`No deployment matches “${id}”.`}
          action={<Link href="/dashboard/deployments" className="btn btn-sm">Back to deployments</Link>}
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
        <button className="icon-btn" onClick={() => router.push('/dashboard/deployments')} aria-label="Back to deployments">
          <ArrowLeft size={15} />
        </button>
        <span className="sr-id mono text-sm font-semibold">{dep.id}</span>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={dep.status} />
          <span className="chip">{dep.env}</span>
          <span className="chip">{dep.version}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {dep.status === 'successful' && (
            <button className="btn btn-sm" onClick={() => setRollbackOpen(true)}>
              <RotateCcw size={12} /> Roll back
            </button>
          )}
          <Link className="btn btn-sm btn-ghost" href={`/dashboard/pipelines/${dep.pipelineRunId}`}>
            View run →
          </Link>
        </div>
      </div>

      <PageHeader
        title={dep.version}
        sub={`${dep.commitMessage} · ${dep.commit} · by ${dep.author}, ${timeAgo(dep.startedAt)} (${formatDuration(dep.durationSec)})`}
      />

      <div className="grid-2 mb-4">
        <Panel title="Deployment timeline" subtitle="every gate, recorded">
          <div className="p-4">
            <Timeline events={dep.timeline} />
          </div>
        </Panel>

        <div className="stack-gap">
          <Panel title="Build & commit">
            <div className="px-4 py-1">
              <div className="fact-row">
                <span className="fact-k">Pipeline run</span>
                <span className="fact-v">
                  <Link className="mono text-xs" style={{ color: 'var(--accent)' }} href={`/dashboard/pipelines/${dep.pipelineRunId}`}>
                    {dep.pipelineRunId}
                  </Link>
                </span>
              </div>
              <div className="fact-row">
                <span className="fact-k">Commit</span>
                <span className="fact-v row-commit">{dep.commit}</span>
              </div>
              <div className="fact-row">
                <span className="fact-k">Author</span>
                <span className="fact-v mono text-xs">{dep.author}</span>
              </div>
              <div className="fact-row">
                <span className="fact-k">Environment</span>
                <span className="fact-v chip">{dep.env}</span>
              </div>
              <div className="fact-row">
                <span className="fact-k">Duration</span>
                <span className="fact-v num">{formatDuration(dep.durationSec)}</span>
              </div>
            </div>
          </Panel>

          <Panel title="Services in this release">
            <div className="px-4 py-1">
              {dep.services.map((s) => (
                <div className="fact-row" key={s.name}>
                  <span className="fact-k">{s.name}</span>
                  <span className="fact-v gap-2">
                    <span className="chip">{s.kind}</span>
                    <StatusBadge status={s.status} />
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <Panel title="Health checks" subtitle="post-deploy verification gates" className="mb-4">
        <div className="px-4 py-1">
          {dep.healthChecks.map((c) => (
            <CheckRow key={c.name} c={c} />
          ))}
        </div>
      </Panel>

      <Panel title="Deployment log" actions={<span className="chip">worker: terraform-apply</span>}>
        <div className="log-viewer" style={{ border: 'none', borderRadius: 0 }}>
          <div className="log-body" style={{ maxHeight: 340 }}>
            {dep.logLines.map((l) => (
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

      <ConfirmDialog
        open={rollbackOpen}
        onClose={() => setRollbackOpen(false)}
        onConfirm={() => push({ title: 'Rollback queued', sub: `${dep.id} → previous release`, tone: 'warn' })}
        title={`Roll back ${dep.id}?`}
        body="The recorded Terraform plan will be re-applied in reverse. Running traffic stays on the current version until the rollback passes health checks. Demo only — nothing is executed."
        confirmLabel="Queue rollback"
        danger
      />
    </div>
  );
}
