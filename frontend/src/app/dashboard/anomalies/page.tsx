'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Search, X } from 'lucide-react';
import { PageHeader } from '../../../components/cerebro/app-shell';
import { EmptyState, FilterBar, SearchInput, SeverityBadge, StatusBadge, useToast } from '../../../components/cerebro/ui-kit';
import { anomalies, timeAgo } from '../../../lib/cerebro/mock-data';

export default function AnomaliesPage() {
  const router = useRouter();
  const { push } = useToast();
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState('all');
  const [state, setState] = useState('all');

  const filtered = useMemo(
    () =>
      anomalies.filter((a) => {
        if (severity !== 'all' && a.severity !== severity) return false;
        if (state !== 'all' && a.state !== state) return false;
        if (query && !`${a.title} ${a.service} ${a.metric}`.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      }),
    [query, severity, state]
  );

  const hasFilters = query || severity !== 'all' || state !== 'all';

  return (
    <div>
      <PageHeader
        title="Anomalies"
        sub="Statistical deviations caught by the detection fleet — forecast-residual, isolation-forest, and EWMA baselines."
        actions={
          <button className="btn btn-sm" onClick={() => push({ title: 'Detector sweep queued', sub: 'all monitors re-scanning', tone: 'info' })}>
            <Activity size={13} /> Run sweep
          </button>
        }
      />

      <FilterBar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search anomalies…" />
        <select className="select" value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Filter by severity">
          <option value="all">All severities</option>
          <option value="page">Page</option>
          <option value="ticket">Ticket</option>
          <option value="info">Info</option>
        </select>
        <select className="select" value={state} onChange={(e) => setState(e.target.value)} aria-label="Filter by state">
          <option value="all">All states</option>
          <option value="detected">Detected</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
        </select>
        <span className="text-xs num ml-auto" style={{ color: 'var(--ink-muted)' }}>{filtered.length} of {anomalies.length}</span>
        {hasFilters && (
          <button className="icon-btn" aria-label="Clear filters" onClick={() => { setQuery(''); setSeverity('all'); setState('all'); }}>
            <X size={14} />
          </button>
        )}
      </FilterBar>

      {filtered.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<Search size={18} />}
            title="No anomalies match"
            body="Detection is quiet. Adjust filters or run a manual sweep across all monitors."
            action={<button className="btn btn-sm" onClick={() => { setQuery(''); setSeverity('all'); setState('all'); }}>Clear filters</button>}
          />
        </div>
      ) : (
        <div className="stack-gap">
          {filtered.map((a) => (
            <article
              key={a.id}
              className="anom-card cursor-pointer"
              onClick={() => router.push(`/dashboard/anomalies/${a.id}`)}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && router.push(`/dashboard/anomalies/${a.id}`)}
              style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', background: 'var(--surface)', padding: 'var(--sp-4)', transition: 'border-color var(--dur) var(--ease-out)' }}
            >
              <div className="anom-top flex items-center gap-3 flex-wrap">
                <SeverityBadge severity={a.severity} />
                <StatusBadge status={a.state} />
                <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>{a.title}</h3>
                <span className="mono text-xs ml-auto" style={{ color: 'var(--ink-muted)' }}>{timeAgo(a.detectedAt)}</span>
              </div>
              <div className="anom-body flex gap-6 flex-wrap">
                <div className="anom-metric" style={{ flex: 1, minWidth: 120 }}>
                  <p className="k mono text-xs" style={{ color: 'var(--ink-muted)' }}>metric</p>
                  <p className="v text-sm font-semibold num mt-0.5">{a.metric}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>{a.service} · {a.env}</p>
                </div>
                <div className="anom-metric" style={{ flex: 1, minWidth: 120 }}>
                  <p className="k mono text-xs" style={{ color: 'var(--ink-muted)' }}>observed / expected</p>
                  <p className="v text-sm font-semibold num mt-0.5">
                    <span style={{ color: 'var(--fail)' }}>{a.observed}</span>
                    <span style={{ color: 'var(--ink-faint)' }}> vs </span>
                    {a.expected}
                  </p>
                  <p className="text-xs mt-0.5 num" style={{ color: 'var(--ink-muted)' }}>{a.deviation}σ · {a.method}</p>
                </div>
                <div style={{ flex: 1.4, minWidth: 200 }}>
                  <p className="k mono text-xs mb-1" style={{ color: 'var(--ink-muted)' }}>top contributions · confidence {Math.round(a.confidence * 100)}%</p>
                  {a.contributions.slice(0, 3).map((c) => (
                    <div key={c.metric} className="mb-1.5">
                      <div className="flex justify-between text-[11px] num" style={{ color: 'var(--ink-secondary)' }}>
                        <span>{c.metric}</span>
                        <span style={{ color: 'var(--ink-faint)' }}>{c.pct}%</span>
                      </div>
                      <div className="z-bar"><i style={{ width: `${c.pct}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
