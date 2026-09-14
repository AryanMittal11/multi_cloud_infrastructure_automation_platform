'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, GitBranch, Play, Plus, Search, X } from 'lucide-react';
import { PageHeader } from '../../../components/cerebro/app-shell';
import { EmptyState, FilterBar, SearchInput, StatusBadge, useToast, Dropdown, MenuItem } from '../../../components/cerebro/ui-kit';
import { pipelines, runsForPipeline, formatDuration, timeAgo } from '../../../lib/cerebro/mock-data';
import type { Pipeline, PipelineStatus } from '../../../lib/cerebro/types';

/* mini stage rail for card previews */
function MiniRail({ pipeline }: { pipeline: Pipeline }) {
  const run = runsForPipeline(pipeline.id)[0];
  if (!run) return null;
  return (
    <div className="mini-rail relative z-[1] flex items-center w-full px-3.5">
      {run.stages.map((st, i) => {
        const nodeCls =
          st.status === 'success' ? 'passed' : st.status === 'failed' ? 'failed' : st.status === 'running' ? 'running' : 'pending';
        const connCls =
          i === 0 ? '' : run.stages[i - 1].status === 'success' ? 'done' : run.stages[i - 1].status === 'failed' ? 'fail' : run.stages[i - 1].status === 'running' ? 'run' : '';
        return (
          <React.Fragment key={st.key}>
            {i > 0 && <span className={`mr-conn flex-1 h-0.5 max-w-[46px] ${connCls}`} style={{ background: connCls ? undefined : 'var(--border)' }} />}
            <span className={`mr-node ${nodeCls}`}>{st.key.slice(0, 2).toUpperCase()}</span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function PipelinesPage() {
  const router = useRouter();
  const { push } = useToast();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [env, setEnv] = useState<string>('all');
  const [triggerOpen, setTriggerOpen] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      pipelines.filter((p) => {
        if (status !== 'all' && p.lastStatus !== status) return false;
        if (env !== 'all' && p.env !== env) return false;
        if (query && !`${p.name} ${p.repo}`.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      }),
    [query, status, env]
  );

  const envs = useMemo(() => [...new Set(pipelines.map((p) => p.env))], []);

  const hasFilters = query || status !== 'all' || env !== 'all';

  return (
    <div>
      <PageHeader
        title="Pipelines"
        sub="Continuous integration and delivery flows across the fleet."
        actions={
          <>
            <button className="btn btn-sm" onClick={() => push({ title: 'New pipeline', sub: 'editor opens in the full workspace', tone: 'info' })}>
              <Plus size={13} /> New pipeline
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                push({ title: 'Triggered gateway-api', sub: 'run queued on main', tone: 'success' });
              }}
            >
              <Play size={13} /> Run gateway-api
            </button>
          </>
        }
      />

      <FilterBar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search pipelines…" />
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="running">Running</option>
          <option value="success">Successful</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="select" value={env} onChange={(e) => setEnv(e.target.value)} aria-label="Filter by environment">
          <option value="all">All environments</option>
          {envs.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <span className="text-xs num ml-auto" style={{ color: 'var(--ink-muted)' }}>
          {filtered.length} of {pipelines.length} pipelines
        </span>
        {hasFilters && (
          <button
            className="icon-btn"
            aria-label="Clear filters"
            onClick={() => {
              setQuery('');
              setStatus('all');
              setEnv('all');
            }}
          >
            <X size={14} />
          </button>
        )}
      </FilterBar>

      {filtered.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<Search size={18} />}
            title="No pipelines match"
            body="Try a different search term or clear the active filters to see the full catalog."
            action={
              <button className="btn btn-sm" onClick={() => { setQuery(''); setStatus('all'); setEnv('all'); }}>
                Clear filters
              </button>
            }
          />
        </div>
      ) : (
        <div className="gallery grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {filtered.map((p) => (
            <article
              key={p.id}
              className="gcard cursor-pointer"
              onClick={() => router.push(`/dashboard/pipelines/${p.id}`)}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && router.push(`/dashboard/pipelines/${p.id}`)}
            >
              <div className="gcard-preview relative flex items-center justify-center overflow-hidden" style={{ height: 126, borderBottom: '1px solid var(--border-faint)' }}>
                <span aria-hidden className="absolute inset-0" style={{
                  background: 'radial-gradient(80% 130% at 50% -20%, var(--glow-accent), transparent 60%), linear-gradient(180deg, var(--bg-elevated), var(--surface))',
                }} />
                <span aria-hidden className="absolute inset-0" style={{
                  backgroundImage: 'linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)',
                  backgroundSize: '34px 34px',
                  maskImage: 'radial-gradient(120% 140% at 50% 20%, black 10%, transparent 75%)',
                  WebkitMaskImage: 'radial-gradient(120% 140% at 50% 20%, black 10%, transparent 75%)',
                }} />
                <div className="relative w-full"><MiniRail pipeline={p} /></div>
                <div className="gcard-pills absolute top-2.5 left-3 flex gap-1.5 flex-wrap">
                  <StatusBadge status={p.lastStatus} />
                  <span className="chip">{p.env}</span>
                </div>
                <span className="absolute top-2.5 right-3 mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{p.provider}</span>
              </div>
              <div className="p-3.5">
                <h3 className="text-sm font-bold tracking-tight leading-snug">{p.name}</h3>
                <p className="text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>{p.repo}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="chip">{p.lastRunId} · {timeAgo(p.lastRunAt)}</span>
                  <span className="text-xs font-bold inline-flex items-center gap-1 gcard-cta" style={{ color: 'var(--ink-muted)' }}>
                    Open <ArrowRight size={11} />
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
