'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../context/auth-context';
import {
  FolderGit2,
  Cloud,
  Layers,
  PlayCircle,
  ScrollText,
  ShieldCheck,
  ArrowRight,
  Plus,
  Cpu,
  Lock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, quickLogin } = useAuth();

  // Queries for live metrics
  const { data: healthData } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.health.get(),
  });

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
    enabled: !!user,
  });

  const { data: cloudAccountsData, isLoading: accountsLoading } = useQuery({
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

  const { data: auditData } = useQuery({
    queryKey: ['audit-logs-recent'],
    queryFn: () => api.auditLogs.list({ limit: 5 }),
    enabled: !!user,
  });

  const stats = [
    {
      title: 'Projects',
      value: projectsLoading ? '...' : projectsData?.projects?.length ?? 0,
      href: '/projects',
      icon: FolderGit2,
      color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400',
      description: 'Active project workspaces',
    },
    {
      title: 'Cloud Accounts',
      value: accountsLoading ? '...' : cloudAccountsData?.accounts?.length ?? 0,
      href: '/cloud-accounts',
      icon: Cloud,
      color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400',
      description: 'Onboarded cloud providers',
    },
    {
      title: 'IaC Templates',
      value: templatesLoading ? '...' : templatesData?.templates?.length ?? 0,
      href: '/templates',
      icon: Layers,
      color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
      description: 'Catalog modules available',
    },
    {
      title: 'Deployments',
      value: deploymentsLoading ? '...' : deploymentsData?.deployments?.length ?? 0,
      href: '/deployments',
      icon: PlayCircle,
      color: 'from-violet-500/20 to-purple-500/20 border-violet-500/30 text-violet-400',
      description: 'Total execution runs',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner / Welcome */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Phase 1 Core AWS Architecture</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Control Plane Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-400 max-w-xl">
              Centralized orchestration and policy enforcement across Amazon Web Services, Microsoft Azure, and Google Cloud Platform.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!user && (
              <button
                onClick={() => quickLogin('DEVELOPER')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all"
              >
                <span>Connect with Developer Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <Link
              href="/projects"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center space-x-2 border border-slate-700/60 transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>New Project</span>
            </Link>
            <Link
              href="/templates"
              className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-medium text-xs flex items-center space-x-2 border border-indigo-500/30 transition-all"
            >
              <span>Explore Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Ambient background glow */}
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
              className={`p-5 rounded-2xl border bg-slate-900/40 hover:bg-slate-900/70 transition-all hover:scale-[1.02] flex flex-col justify-between group ${item.color}`}
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

      {/* Two Column Grid: Platform Health / Invariants & Recent Audit Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Architectural Invariants & Providers */}
        <div className="lg:col-span-2 space-y-6">
          {/* Target Cloud Providers */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center space-x-2">
              <Cloud className="w-4 h-4 text-indigo-400" />
              <span>Target Cloud Providers Status</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Phase 1 Production
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                </div>
                <h3 className="text-sm font-bold text-white">AWS (Amazon)</h3>
                <p className="text-xs text-slate-400 mt-1">
                  VPC, EC2 web instances, RDS PostgreSQL, and encrypted S3 buckets.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-400">
                    Phase 2 Queued
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                </div>
                <h3 className="text-sm font-bold text-white">Azure (Microsoft)</h3>
                <p className="text-xs text-slate-400 mt-1">
                  VNets, Linux VMs, Flexible Postgres, and Blob containers.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                    Phase 2 Queued
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                </div>
                <h3 className="text-sm font-bold text-white">GCP (Google)</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Custom VPCs, Compute Engine, Cloud SQL, and GCS buckets.
                </p>
              </div>
            </div>
          </div>

          {/* System Invariants Matrix */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Enforced Platform Invariants</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="font-semibold text-white flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Authoritative Backend</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Express middleware strictly verifies RBAC, roles, and locks before queuing jobs.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="font-semibold text-white flex items-center space-x-2">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Asynchronous Execution</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  RabbitMQ queues isolate Terraform runs so HTTP request threads never block.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="font-semibold text-white flex items-center space-x-2">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Zero Secret Leakage</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  AES-256-GCM encrypted credentials at rest with regex masking on worker logs.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="font-semibold text-white flex items-center space-x-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Safe Destruction Guard</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Teardown requires explicit preview review, admin validation, and keyword confirmation.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Control Plane Telemetry & Recent Audit Logs */}
        <div className="space-y-6">
          {/* Health Card */}
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
                <span className="text-indigo-300 font-bold uppercase">{user?.role ?? 'UNAUTHENTICATED'}</span>
              </div>
            </div>
          </div>

          {/* Recent Audit Activity Preview */}
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
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-indigo-300 text-[11px]">
                        {log.action}
                      </span>
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
