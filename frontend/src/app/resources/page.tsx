'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Server } from 'lucide-react';
import { api, Resource, Project } from '../../lib/api';
import { useAuth } from '../../context/auth-context';
import { timeAgo } from '../../lib/format';
import { PageHeader } from '../../components/cerebro/app-shell';
import { Panel, StatusBadge, EmptyState, Skeleton, SearchInput, Segmented } from '../../components/cerebro/ui-kit';

export default function ResourcesPage() {
  const { user } = useAuth();
  const [projectFilter, setProjectFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['resources', 'page'],
    queryFn: () => api.resources.list(),
    enabled: !!user,
    refetchInterval: 20000,
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
    enabled: !!user,
  });

  const resources = useMemo(() => {
    let list: Resource[] = data?.resources ?? [];
    if (projectFilter !== 'all') list = list.filter((r) => (r as any).deployment?.projectId === projectFilter);
    if (providerFilter !== 'all') list = list.filter((r) => r.provider === providerFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.resourceType.toLowerCase().includes(q) ||
          r.providerResourceId?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, projectFilter, providerFilter, search]);

  const projects: Project[] = projectsData?.projects ?? [];
  const projectName = (id?: string) => projects.find((p) => p.id === id)?.name ?? '—';

  if (!user) {
    return (
      <div>
        <PageHeader title="Resources" sub="Sign in to view provisioned infrastructure." />
        <Panel>
          <EmptyState
            icon={<Server size={22} />}
            title="Authentication required"
            body="Connect an operator persona from the Projects page to browse the resource inventory."
          />
        </Panel>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Resources"
        sub="Unified inventory of provisioned infrastructure across projects and providers"
        actions={
          <button className="btn-ghost" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-2.5 flex-wrap mb-4">
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="h-[32px] px-2.5 rounded-[var(--r-sm)] text-xs"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
          aria-label="Filter by project"
        >
          <option value="all">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <Segmented
          value={providerFilter}
          onChange={(v) => setProviderFilter(v)}
          options={[
            { key: 'all', label: 'All providers' },
            { key: 'AWS', label: 'AWS' },
            { key: 'AZURE', label: 'Azure' },
            { key: 'GCP', label: 'GCP' },
          ]}
        />

        <div className="ml-auto w-full sm:w-[240px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Filter by name or type…" />
        </div>
      </div>

      <Panel bodyClass="">
        {isLoading ? (
          <div className="p-4 flex flex-col gap-2">
            {[1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-10" />)}
          </div>
        ) : resources.length === 0 ? (
          <EmptyState
            icon={<Server size={22} />}
            title="No resources found"
            body="Resources appear here after a deployment's apply succeeds — recorded straight from Terraform state."
            action={
              <a href="/deployments/wizard" className="btn-primary">Run a deployment</a>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: 'var(--ink-muted)', borderBottom: '1px solid var(--border)' }}>
                  <th className="px-4 py-2.5 font-medium text-xs">Resource</th>
                  <th className="px-4 py-2.5 font-medium text-xs">Type</th>
                  <th className="px-4 py-2.5 font-medium text-xs">Provider</th>
                  <th className="px-4 py-2.5 font-medium text-xs">Project</th>
                  <th className="px-4 py-2.5 font-medium text-xs">Status</th>
                  <th className="px-4 py-2.5 font-medium text-xs">Recorded</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((r) => (
                  <tr
                    key={r.id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--border-faint)' }}
                  >
                    <td className="px-4 py-2.5">
                      <p className="font-medium" style={{ color: 'var(--ink)' }}>{r.name ?? '—'}</p>
                      {r.providerResourceId && (
                        <p className="mono text-[10.5px] truncate max-w-[260px]" style={{ color: 'var(--ink-faint)' }}>
                          {r.providerResourceId}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 mono text-xs" style={{ color: 'var(--ink-muted)' }}>{r.resourceType}</td>
                    <td className="px-4 py-2.5"><span className="chip">{r.provider}</span></td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--ink-muted)' }}>
                      {projectName((r as any).deployment?.projectId)}
                    </td>
                    <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--ink-muted)' }}>{timeAgo(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
