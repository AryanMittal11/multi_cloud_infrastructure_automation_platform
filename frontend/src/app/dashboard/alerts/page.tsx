'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellOff, CheckCheck, Search, X } from 'lucide-react';
import { PageHeader } from '../../../components/cerebro/app-shell';
import { ConfirmDialog, EmptyState, FilterBar, SearchInput, SeverityBadge, StatusBadge, Tabs, useToast } from '../../../components/cerebro/ui-kit';
import { alerts, timeAgo } from '../../../lib/cerebro/mock-data';

export default function AlertsPage() {
  const router = useRouter();
  const { push } = useToast();
  const [tab, setTab] = useState('open');
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState('all');
  const [ackTarget, setAckTarget] = useState<string | null>(null);
  const [resolveAllOpen, setResolveAllOpen] = useState(false);

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (tab === 'open' && a.status === 'resolved') return false;
      if (tab === 'acknowledged' && a.status !== 'acknowledged') return false;
      if (tab === 'resolved' && a.status !== 'resolved') return false;
      if (severity !== 'all' && a.severity !== severity) return false;
      if (query && !`${a.title} ${a.service} ${a.source}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [tab, severity, query]);

  const counts = {
    open: alerts.filter((a) => a.status !== 'resolved').length,
    acknowledged: alerts.filter((a) => a.status === 'acknowledged').length,
    resolved: alerts.filter((a) => a.status === 'resolved').length,
  };

  return (
    <div>
      <PageHeader
        title="Alerts"
        sub="Pages, tickets, and drift notices routed from detectors, SLOs, and health probes."
        actions={
          <>
            <button className="btn btn-sm" onClick={() => setResolveAllOpen(true)}>
              <CheckCheck size={13} /> Resolve all
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => push({ title: 'Routing rules', sub: 'managed in settings → notifications', tone: 'info' })}>
              Routing rules
            </button>
          </>
        }
      />

      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <Tabs
          tabs={[
            { key: 'open', label: 'Open', count: counts.open },
            { key: 'acknowledged', label: 'Acknowledged', count: counts.acknowledged },
            { key: 'resolved', label: 'Resolved', count: counts.resolved },
          ]}
          active={tab}
          onChange={setTab}
        />
        <FilterBar>
          <SearchInput value={query} onChange={setQuery} placeholder="Search alerts…" />
          <select className="select" value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Filter by severity">
            <option value="all">All severities</option>
            <option value="page">Page</option>
            <option value="ticket">Ticket</option>
            <option value="info">Info</option>
          </select>
          {query && (
            <button className="icon-btn" aria-label="Clear search" onClick={() => setQuery('')}>
              <X size={14} />
            </button>
          )}
        </FilterBar>
      </div>

      <div className="panel">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<BellOff size={18} />}
            title="Nothing here"
            body={tab === 'resolved' ? 'No resolved alerts in the demo window.' : 'All clear — no open alerts match the current filters.'}
          />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Alert</th>
                  <th>Source</th>
                  <th>Service</th>
                  <th>Assignee</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="clickable" onClick={() => router.push(`/dashboard/alerts/${a.id}`)}>
                    <td><SeverityBadge severity={a.severity} /></td>
                    <td><StatusBadge status={a.status} /></td>
                    <td>
                      <p className="font-medium" style={{ color: 'var(--ink)' }}>{a.title}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--ink-muted)', maxWidth: 320 }}>{a.message}</p>
                    </td>
                    <td><span className="chip">{a.source}</span></td>
                    <td className="mono text-xs">{a.service}</td>
                    <td className="mono text-xs">{a.assignee ?? '—'}</td>
                    <td className="mono text-xs" style={{ color: 'var(--ink-muted)' }}>{timeAgo(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={ackTarget !== null}
        onClose={() => setAckTarget(null)}
        onConfirm={() => push({ title: 'Alert acknowledged', sub: ackTarget ?? '', tone: 'success' })}
        title="Acknowledge alert"
        body="Acknowledging assigns the alert to you and stops escalation timers. It stays open until resolved."
        confirmLabel="Acknowledge"
      />

      <ConfirmDialog
        open={resolveAllOpen}
        onClose={() => setResolveAllOpen(false)}
        onConfirm={() => push({ title: 'All alerts resolved', sub: 'demo dataset updated', tone: 'success' })}
        title="Resolve all open alerts?"
        body="Every active and acknowledged alert will be marked resolved. Demo only — the dataset resets on reload."
        confirmLabel="Resolve all"
        danger
      />
    </div>
  );
}
