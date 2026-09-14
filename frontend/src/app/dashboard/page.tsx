'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Cloud,
  DollarSign,
  Layers,
  Rocket,
  Server,
  ShieldCheck,
  Waypoints,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/auth-context';
import { timeAgo, formatUsd } from '../../lib/format';
import { PageHeader } from '../../components/cerebro/app-shell';
import { Panel, StatTile, StatusBadge, EmptyState, Skeleton } from '../../components/cerebro/ui-kit';

export default function DashboardPage() {
  const { user } = useAuth();

  const enabled = !!user;

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
    enabled,
  });

  const { data: deploymentsData, isLoading: deploymentsLoading } = useQuery({
    queryKey: ['deployments', 'overview'],
    queryFn: () => api.deployments.list(),
    enabled,
    refetchInterval: 15000,
  });

  const { data: resourcesData, isLoading: resourcesLoading } = useQuery({
    queryKey: ['resources', 'overview'],
    queryFn: () => api.resources.list(),
    enabled,
    refetchInterval: 30000,
  });

  const { data: accountsData } = useQuery({
    queryKey: ['cloud-accounts'],
    queryFn: () => api.cloudAccounts.list(),
    enabled,
  });

  const { data: costsData } = useQuery({
    queryKey: ['costs-summary'],
    queryFn: () => api.costs.summary(),
    enabled,
    refetchInterval: 60000,
  });

  const { data: auditData } = useQuery({
    queryKey: ['audit-logs', 'overview'],
    queryFn: () => api.auditLogs.list({ limit: 8 }),
    enabled,
  });

  const deployments = useMemo(() => deploymentsData?.deployments ?? [], [deploymentsData]);
  const resources = useMemo(
    () => (resourcesData?.resources ?? []).filter((r) => r.status !== 'DESTROYED'),
    [resourcesData]
  );

  const activeDeployments = deployments.filter((d) => d.status === 'RUNNING' || d.status === 'QUEUED' || d.status === 'PLANNING');
  const awaitingApproval = deployments.filter((d) => d.status === 'PLANNED');
  const succeeded = deployments.filter((d) => d.status === 'SUCCEEDED');
  const failed = deployments.filter((d) => d.status === 'FAILED');
  const providers = new Set((accountsData?.cloudAccounts ?? []).map((a) => a.provider));

  const recent = deployments
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const audit = auditData?.auditLogs ?? [];

  const quickLinks = [
    { href: '/templates', label: 'Template Catalog', sub: 'Browse verified modules', icon: Layers },
    { href: '/designer', label: 'Visual Designer', sub: 'Draw → generate → deploy', icon: Waypoints },
    { href: '/deployments/wizard', label: 'New Deployment', sub: 'Guided plan → approve → apply', icon: Rocket },
    { href: '/costs', label: 'Costs', sub: 'Estimated monthly spend', icon: DollarSign },
    { href: '/cloud-accounts', label: 'Cloud Accounts', sub: 'Connect AWS · Azure · GCP', icon: Cloud },
    { href: '/resources', label: 'Resources', sub: 'Provisioned infrastructure', icon: Server },
  ];

  const loading = projectsLoading || deploymentsLoading || resourcesLoading;

  return (
    <div>
      <PageHeader
        title="Overview"
        sub={
          user
            ? `Signed in as ${user.name} · ${user.role} — live data from the control plane.`
            : 'Sign in to manage multi-cloud infrastructure.'
        }
        actions={
          <Link href="/deployments/wizard" className="btn-primary">
            <Rocket size={14} /> New deployment
          </Link>
        }
      />

      {!user && (
        <Panel className="mb-5">
          <EmptyState
            icon={<ShieldCheck size={22} />}
            title="Authentication required"
            body="Open Projects and connect an operator persona to bring this dashboard live."
            action={
              <Link href="/projects" className="btn-primary">
                Go to Projects
              </Link>
            }
          />
        </Panel>
      )}

      {user && (
        <>
          {/* Stat strip — the pipeline posture at a glance */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {loading ? (
              [1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-[110px]" />)
            ) : (
              <>
                <StatTile label="Active runs" value={String(activeDeployments.length)} hint="queued · planning · running" />
                <StatTile label="Awaiting approval" value={String(awaitingApproval.length)} tone="accent" hint="plan ready for review" />
                <StatTile label="Succeeded" value={String(succeeded.length)} tone="success" hint="lifetime applies" />
                <StatTile
                  label="Failed"
                  value={String(failed.length)}
                  tone={failed.length ? 'fail' : 'default'}
                  hint="needs attention"
                />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left column: deployments + audit */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <Panel
                title="Recent deployments"
                subtitle="Live pipeline state across all projects"
                actions={
                  <Link href="/deployments" className="chip">
                    View all <ArrowRight size={11} className="inline ml-0.5" />
                  </Link>
                }
              >
                {recent.length === 0 ? (
                  <EmptyState
                    icon={<Rocket size={22} />}
                    title="No deployments yet"
                    body="Launch your first template from the catalog or the wizard — the gated pipeline (plan → review → approve → apply) records everything here."
                    action={
                      <Link href="/deployments/wizard" className="btn-primary">
                        New deployment
                      </Link>
                    }
                  />
                ) : (
                  <div className="divide-y" style={{ borderColor: 'var(--border-faint)' }}>
                    {recent.map((d) => (
                      <Link
                        key={d.id}
                        href={`/deployments/${d.id}`}
                        className="flex items-center gap-3 px-4 py-3 transition-colors"
                        style={{ borderColor: 'var(--border-faint)' }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                            {d.template?.name ?? 'deployment'} · {d.operationType.toLowerCase()}
                          </p>
                          <p className="text-xs truncate" style={{ color: 'var(--ink-muted)' }}>
                            {d.project?.name ?? '—'} / {d.environment?.name ?? '—'} · {timeAgo(d.createdAt)}
                          </p>
                        </div>
                        <StatusBadge status={d.status} />
                      </Link>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel
                title="Latest audit activity"
                subtitle="Who did what, and when — the compliance trail"
                actions={
                  <Link href="/audit-logs" className="chip">
                    Full trail <ArrowRight size={11} className="inline ml-0.5" />
                  </Link>
                }
              >
                {audit.length === 0 ? (
                  <EmptyState icon={<ShieldCheck size={22} />} title="No audit entries yet" body="Every gated action lands here." />
                ) : (
                  <div className="divide-y" style={{ borderColor: 'var(--border-faint)' }}>
                    {audit.slice(0, 6).map((a) => (
                      <div key={a.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderColor: 'var(--border-faint)' }}>
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-none"
                          style={{ background: a.status === 'SUCCESS' ? 'var(--success)' : a.status === 'FAILURE' ? 'var(--fail)' : 'var(--accent)' }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate mono" style={{ color: 'var(--ink)' }}>{a.action}</p>
                          <p className="text-[11px] truncate" style={{ color: 'var(--ink-muted)' }}>
                            {a.user?.name ?? 'system'} · {timeAgo(a.timestamp)}
                          </p>
                        </div>
                        {a.deploymentId && (
                          <Link href={`/deployments/${a.deploymentId}`} className="chip">open</Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>

            {/* Right column: posture + quick links */}
            <div className="flex flex-col gap-4">
              <Panel title="Platform posture" subtitle="Cross-cloud coverage">
                <div className="px-4 py-3 flex flex-col gap-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--ink-muted)' }}>Connected providers</span>
                    <span className="num" style={{ color: 'var(--ink)' }}>{providers.size} / 3</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--ink-muted)' }}>Projects</span>
                    <span className="num" style={{ color: 'var(--ink)' }}>{projectsData?.projects?.length ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--ink-muted)' }}>Active resources</span>
                    <span className="num" style={{ color: 'var(--ink)' }}>{resources.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--ink-muted)' }}>Est. monthly cost</span>
                    <Link href="/costs" className="num" style={{ color: 'var(--accent-strong)' }}>
                      {costsData ? formatUsd(costsData.monthlyTotalUsd) : '—'}
                    </Link>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--ink-muted)' }}>Pipeline gates</span>
                    <span className="chip">plan · policy · approval</span>
                  </div>
                </div>
              </Panel>

              <Panel title="Platform sections" subtitle="Everything routes through the gated pipeline">
                <div className="p-2 grid grid-cols-1 gap-1">
                  {quickLinks.map((q) => {
                    const Icon = q.icon;
                    return (
                      <Link
                        key={q.href}
                        href={q.href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--r-sm)] transition-colors"
                        style={{ color: 'inherit' }}
                      >
                        <span
                          className="w-7 h-7 rounded-[7px] flex items-center justify-center flex-none"
                          style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', color: 'var(--accent-strong)' }}
                        >
                          <Icon size={14} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium" style={{ color: 'var(--ink)' }}>{q.label}</span>
                          <span className="block text-[11px] truncate" style={{ color: 'var(--ink-muted)' }}>{q.sub}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
