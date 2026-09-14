'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../context/auth-context';
import { ProviderIcon } from '../../lib/provider-icon';
import {
  DraftingCompass,
  Workflow,
  FolderGit2,
  Cloud,
  Layers,
  PlayCircle,
  ScrollText,
  ShieldCheck,
  ArrowRight,
  Cpu,
  Lock,
  Activity,
  AlertTriangle,
  Clock,
  Sparkles,
  Wand2,
} from 'lucide-react';

export default function DashboardContent() {
  const { user, quickLogin } = useAuth();

  const { data: healthData } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.health.get(),
  });

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
    enabled: !!user,
  });

  const { data: accountsData } = useQuery({
    queryKey: ['cloud-accounts'],
    queryFn: () => api.cloudAccounts.list(),
    enabled: !!user,
  });

  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.templates.list(),
    enabled: !!user,
  });

  const { data: deploymentsData, isLoading: deploymentsLoading } = useQuery({
    queryKey: ['deployments'],
    queryFn: () => api.deployments.list(),
    enabled: !!user,
  });

  const { data: designsData, isLoading: designsLoading } = useQuery({
    queryKey: ['designs'],
    queryFn: () => api.designs.list(),
    enabled: !!user,
  });

  const { data: auditData } = useQuery({
    queryKey: ['audit-logs-recent'],
    queryFn: () => api.auditLogs.list({ limit: 5 }),
    enabled: !!user,
  });

  const stats = [
    {
      title: 'Architectures',
      value: designsLoading ? '...' : designsData?.designs?.length ?? 0,
      href: '/architectures',
      icon: Workflow,
      color: 'from-violet-500/20 to-purple-500/20 border-violet-500/30 text-violet-400',
      description: 'Saved visual designs',
    },
    {
      title: 'Projects',
      value: projectsLoading ? '...' : projectsData?.projects?.length ?? 0,
      href: '/projects',
      icon: FolderGit2,
      color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400',
      description: 'Active workspaces',
    },
    {
      title: 'IaC Templates',
      value: templatesLoading ? '...' : templatesData?.templates?.length ?? 0,
      href: '/templates',
      icon: Layers,
      color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
      description: 'AWS · Azure · GCP modules',
    },
    {
      title: 'Deployments',
      value: deploymentsLoading ? '...' : deploymentsData?.deployments?.length ?? 0,
      href: '/deployments',
      icon: PlayCircle,
      color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400',
      description: 'Plan / apply / destroy runs',
    },
  ];

  const providers = [
    {
      name: 'AWS (Amazon)',
      desc: 'VPC, EC2, RDS PostgreSQL, S3 — fully supported with STS-validated onboarding.',
      accent: 'border-amber-500/30 bg-amber-500/5',
      dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
      status: 'Supported',
      statusColor: 'text-amber-400',
    },
    {
      name: 'Azure (Microsoft)',
      desc: 'VNet, Linux VMs, PostgreSQL Flexible, Blob — ARM-validated Service Principal.',
      accent: 'border-sky-500/30 bg-sky-500/5',
      dot: 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]',
      status: 'Supported',
      statusColor: 'text-sky-400',
    },
    {
      name: 'GCP (Google)',
      desc: 'VPC, Compute Engine, Cloud SQL, GCS — Resource Manager-validated keys.',
      accent: 'border-emerald-500/30 bg-emerald-500/5',
      dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
      status: 'Supported',
      statusColor: 'text-emerald-400',
    },
  ];

  const invariants = [
    {
      icon: ShieldCheck,
      color: 'text-indigo-400',
      title: 'Authoritative Backend',
      desc: 'RBAC, role gates, and lock checks enforced server-side before queueing.',
    },
    {
      icon: Cpu,
      color: 'text-cyan-400',
      title: 'Asynchronous Execution',
      desc: 'RabbitMQ queues isolate Terraform runs from HTTP threads.',
    },
    {
      icon: Lock,
      color: 'text-amber-400',
      title: 'Zero Secret Leakage',
      desc: 'AES-256-GCM credential encryption with regex masking on all logs.',
    },
    {
      icon: AlertTriangle,
      color: 'text-rose-400',
      title: 'Confirmed Destruction',
      desc: 'Teardown requires preview review, admin role, and typed keyword.',
    },
  ];

  const quickActions = [
    {
      title: 'Design an architecture',
      desc: 'Visual canvas → instant Terraform',
      href: '/designer',
      icon: DraftingCompass,
      accent: 'from-indigo-600/20 to-blue-600/10 border-indigo-500/30 text-indigo-300',
    },
    {
      title: 'Onboard a cloud account',
      desc: `${accountsData?.cloudAccounts?.length ?? 0} connected`,
      href: '/cloud-accounts',
      icon: Cloud,
      accent: 'from-amber-600/20 to-orange-600/10 border-amber-500/30 text-amber-300',
    },
    {
      title: 'Browse the catalog',
      desc: '12+ production-grade modules',
      href: '/templates',
      icon: Layers,
      accent: 'from-emerald-600/20 to-teal-600/10 border-emerald-500/30 text-emerald-300',
    },
    {
      title: 'Run a deployment',
      desc: 'Plan → approve → apply',
      href: '/deployments/wizard',
      icon: PlayCircle,
      accent: 'from-violet-600/20 to-purple-600/10 border-violet-500/30 text-violet-300',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900 via-indigo-950/50 to-slate-900 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>The cloud is your canvas</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Design, deploy and manage your cloud infrastructure
              <span className="bg-gradient-to-r from-indigo-400 to-cyan-300 bg-clip-text text-transparent"> end-to-end</span>
            </h1>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              A multi-cloud collaborative designer that generates Terraform instantly as you design —
              with security, cost, and scaling built in from day one.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href="/designer"
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all"
              >
                <DraftingCompass className="w-4 h-4" />
                <span>Open Visual Designer</span>
              </Link>
              <Link
                href="/architectures"
                className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-medium text-xs flex items-center space-x-2 border border-slate-700/60 transition-all"
              >
                <Workflow className="w-4 h-4 text-violet-400" />
                <span>My Architectures</span>
              </Link>
              {!user && (
                <button
                  onClick={() => quickLogin('DEVELOPER')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-medium text-xs flex items-center space-x-2 border border-slate-700/60"
                >
                  <span>Connect to explore</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              href={item.href}
              className={`p-5 rounded-2xl border bg-gradient-to-br hover:bg-slate-900/70 transition-all hover:scale-[1.02] flex flex-col justify-between group ${item.color}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {item.title}
                </span>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300 group-hover:text-white transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold text-white tracking-tight">{item.value}</div>
                <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                  <span>{item.description}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 group-hover:text-slate-300 transition-all" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center space-x-2">
          <Wand2 className="w-4 h-4 text-indigo-400" />
          <span>Quick Start</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className={`p-4 rounded-2xl border bg-gradient-to-br to-transparent hover:scale-[1.02] transition-all group ${action.accent}`}
              >
                <Icon className="w-5 h-5 mb-3" />
                <div className="text-xs font-bold text-white">{action.title}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
                  <span>{action.desc}</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Provider Status */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center space-x-2">
              <Cloud className="w-4 h-4 text-indigo-400" />
              <span>Multi-Cloud by Design</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {providers.map((p) => (
                <div key={p.name} className={`p-4 rounded-xl border ${p.accent}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${p.statusColor}`}>
                      {p.status}
                    </span>
                    <span className={`w-2.5 h-2.5 rounded-full ${p.dot}`} />
                  </div>
                  <h3 className="text-sm font-bold text-white">{p.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Invariants */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Enforced Platform Invariants</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
              {invariants.map((inv) => {
                const Icon = inv.icon;
                return (
                  <div key={inv.title} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="font-semibold text-white flex items-center space-x-2">
                      <Icon className={`w-3.5 h-3.5 ${inv.color}`} />
                      <span>{inv.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{inv.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Health */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Control Plane Status</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {healthData?.status ?? 'Connecting'}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-400">
                <span>Service</span>
                <span className="text-slate-200 font-mono">{healthData?.service ?? 'backend'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-400">
                <span>Environment</span>
                <span className="text-slate-200 font-mono">{healthData?.environment ?? 'development'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-400">
                <span>API Version</span>
                <span className="text-slate-200 font-mono">{healthData?.version ?? '0.1.0'}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-400">
                <span>Active Persona</span>
                <span className="text-indigo-300 font-bold uppercase">{user?.role ?? 'GUEST'}</span>
              </div>
            </div>
          </div>

          {/* Recent audit */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                <ScrollText className="w-4 h-4 text-indigo-400" />
                <span>Recent Audit Trail</span>
              </span>
              <Link href="/audit-logs" className="text-xs text-indigo-400 hover:text-indigo-300">
                View all &rarr;
              </Link>
            </div>
            {auditData?.auditLogs && auditData.auditLogs.length > 0 ? (
              <div className="space-y-3">
                {auditData.auditLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-indigo-300 text-[11px]">{log.action}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] truncate">{log.message}</p>
                    <div className="text-[10px] text-slate-500 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                {user ? 'No audit events recorded yet' : 'Connect an account to view audit events'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
