'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, RotateCcw, Search, X } from 'lucide-react';
import { PageHeader } from '../../../components/cerebro/app-shell';
import { ConfirmDialog, EmptyState, FilterBar, SearchInput, StatusBadge, useToast } from '../../../components/cerebro/ui-kit';
import { deployments, formatDuration, timeAgo } from '../../../lib/cerebro/mock-data';

export default function DeploymentsPage() {
  const router = useRouter();
  const { push } = useToast();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [env, setEnv] = useState('all');
  const [rollbackTarget, setRollbackTarget] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      deployments.filter((d) => {
        if (status !== 'all' && d.status !== status) return false;
        if (env !== 'all' && d.env !== env) return false;
        if (query && !`${d.id} ${d.version} ${d.commit} ${d.pipelineName} ${d.author}`.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      }),
    [query, status, env]
  );

  const envs = useMemo(() => [...new Set(deployments.map((d) => d.env))], []);
  const hasFilters = query || status !== 'all' || env !== 'all';

  return (
    <div>
      <PageHeader
        title="Deployments"
        sub="Immutable, versioned releases promoted through governed pipelines."
        actions={
          <>
            <button className="btn btn-sm" onClick={() => push({ title: 'Export queued', sub: 'CSV lands in your inbox', tone: 'info' })}>
              <Download size={13} /> Export
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => router.push('/dashboard/pipelines')}>
              New deployment…
            </button>
          </>
        }
      />

      <FilterBar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search deployments…" />
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="successful">Successful</option>
          <option value="failed">Failed</option>
          <option value="in-progress">In progress</option>
          <option value="rolled-back">Rolled back</option>
        </select>
        <select className="select" value={env} onChange={(e) => setEnv(e.target.value)} aria-label="Filter by environment">
          <option value="all">All environments</option>
          {envs.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <span className="text-xs num ml-auto" style={{ color: 'var(--ink-muted)' }}>
          {filtered.length} of {deployments.length}
        </span>
        {hasFilters && (
          <button className="icon-btn" aria-label="Clear filters" onClick={() => { setQuery(''); setStatus('all'); setEnv('all'); }}>
            <X size={14} />
          </button>
        )}
      </FilterBar>

      <div className="panel">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Search size={18} />}
            title="No deployments match"
            body="Adjust the filters to see history for other environments or statuses."
            action={<button className="btn btn-sm" onClick={() => { setQuery(''); setStatus('all'); setEnv('all'); }}>Clear filters</button>}
          />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Environment</th>
                  <th>Status</th>
                  <th>Commit</th>
                  <th>Author</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="clickable" onClick={() => router.push(`/dashboard/deployments/${d.id}`)}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="mono font-semibold" style={{ color: 'var(--ink)' }}>{d.version}</span>
                        <span className="mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{d.id}</span>
                      </div>
                      <p className="text-xs truncate" style={{ color: 'var(--ink-muted)', maxWidth: 260 }}>{d.commitMessage}</p>
                    </td>
                    <td><span className="chip">{d.env}</span></td>
                    <td><StatusBadge status={d.status} /></td>
                    <td><span className="row-commit">{d.commit}</span></td>
                    <td className="mono text-xs">{d.author}</td>
                    <td className="mono text-xs" style={{ color: 'var(--ink-muted)' }}>{timeAgo(d.startedAt)}</td>
                    <td className="num text-xs">{formatDuration(d.durationSec)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {d.status === 'successful' && (
                        <button
                          className="btn btn-sm btn-ghost"
                          title="Roll back to this version"
                          onClick={() => setRollbackTarget(d.id)}
                        >
                          <RotateCcw size={12} /> Rollback
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={rollbackTarget !== null}
        onClose={() => setRollbackTarget(null)}
        onConfirm={() => push({ title: 'Rollback queued', sub: `${rollbackTarget} will be re-promoted`, tone: 'warn' })}
        title="Roll back deployment"
        body={`This will re-promote ${rollbackTarget} to its environment and mark the current release as superseded. Terraform state is reverted to the recorded plan. In the demo, nothing is actually executed.`}
        confirmLabel="Queue rollback"
        danger
      />
    </div>
  );
}
