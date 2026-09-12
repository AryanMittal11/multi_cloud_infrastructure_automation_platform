'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { env } from '../config/env';
import { ShieldCheck, Cloud, Server, Database, GitPullRequest, ArrowRight, Activity, Terminal } from 'lucide-react';

interface HealthResponse {
  status: string;
  timestamp: string;
  service: string;
  environment: string;
  version: string;
}

export default function Home() {
  const { data: health, isLoading, error } = useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch(`${env.API_URL}/health`);
      if (!res.ok) throw new Error('Control plane offline');
      return res.json();
    },
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 backdrop-blur-md bg-slate-950/70 sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-white">MultiCloud Orchestrator</h1>
            <p className="text-xs text-slate-400">Controlled Multi-Cloud Infrastructure Automation</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900/60">
            <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse' : error ? 'bg-rose-500' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'}`} />
            <span className="text-slate-300">
              Control Plane: {isLoading ? 'Connecting...' : error ? 'Offline' : `${health?.status} (${health?.version})`}
            </span>
          </div>
          <span className="text-xs font-mono text-indigo-400 px-2.5 py-1 rounded bg-indigo-950/60 border border-indigo-800/40">
            v0.1.0-alpha
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center flex flex-col items-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-6">
          <ShieldCheck className="w-4 h-4" />
          <span>Strict Plan &rarr; Approval &rarr; Worker Execution Lifecycle</span>
        </div>

        <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 max-w-4xl">
          Unified Multi-Cloud Infrastructure Automation
        </h2>

        <p className="mt-6 text-lg text-slate-400 max-w-2xl leading-relaxed">
          Orchestrate, preview, policy-check, and safely deploy cloud infrastructure across <span className="text-amber-400 font-semibold">AWS</span>, <span className="text-sky-400 font-semibold">Azure</span>, and <span className="text-emerald-400 font-semibold">GCP</span> through a single authoritative control plane.
        </p>

        {/* Action CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium text-sm text-white flex items-center space-x-2 shadow-lg shadow-indigo-600/25 transition-all">
            <span>Open Deployment Catalog</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href="/api/health"
            target="_blank"
            rel="noreferrer"
            className="px-6 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 font-medium text-sm text-slate-300 flex items-center space-x-2 transition-all"
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Health Endpoint</span>
          </a>
        </div>

        {/* Cloud Provider Support Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full max-w-4xl text-left">
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-amber-500/40 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Phase 1 Target</span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            </div>
            <h3 className="text-lg font-semibold text-white group-hover:text-amber-300">Amazon Web Services</h3>
            <p className="text-sm text-slate-400 mt-2">VPC, EC2 web servers, RDS PostgreSQL, and S3 secure storage modules.</p>
          </div>

          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-sky-500/40 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">Phase 2 Target</span>
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            </div>
            <h3 className="text-lg font-semibold text-white group-hover:text-sky-300">Microsoft Azure</h3>
            <p className="text-sm text-slate-400 mt-2">VNets, Linux VMs, Flexible Postgres Servers, and Blob storage containers.</p>
          </div>

          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-emerald-500/40 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Phase 2 Target</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            </div>
            <h3 className="text-lg font-semibold text-white group-hover:text-emerald-300">Google Cloud Platform</h3>
            <p className="text-sm text-slate-400 mt-2">Custom VPCs, Compute Engine instances, Cloud SQL, and GCS buckets.</p>
          </div>
        </div>

        {/* Architectural Highlights */}
        <div className="mt-16 w-full max-w-4xl p-6 rounded-2xl border border-slate-800/80 bg-slate-900/20 text-left">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-400 mb-4 flex items-center space-x-2">
            <Terminal className="w-4 h-4" />
            <span>Core Architectural Invariants</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/50">
              <span className="font-semibold text-slate-100">Separation of Plan & Apply:</span> Dry-run preview with policy checks and cost estimation prior to execution.
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/50">
              <span className="font-semibold text-slate-100">Isolated Asynchronous Worker:</span> RabbitMQ-buffered Terraform worker prevents API thread blocking.
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/50">
              <span className="font-semibold text-slate-100">AES-256 Encrypted Secrets:</span> Zero credential leakage in logs, databases, or client payloads.
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/50">
              <span className="font-semibold text-slate-100">Explicit Destruction Guard:</span> Mandatory two-step confirmation prevents accidental resource deletion.
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-6 text-center text-xs text-slate-500">
        Multi-Cloud Infrastructure Automation Platform &bull; Capstone Project &bull; Express + Next.js + Prisma + RabbitMQ + Terraform
      </footer>
    </main>
  );
}
