'use client';

import React from 'react';
import Link from 'next/link';
import {
  Workflow, GitBranch, ShieldCheck, Coins, Radar, Boxes, Eye, Lock,
  FileCode2, ArrowRight, CheckCircle2, Clock, Globe,
} from 'lucide-react';
import { Reveal, Eyebrow, Section } from './Reveal';
import { ProviderIcon } from '../../lib/provider-icon';

/* ============================================
   Capabilities bento grid
   ============================================ */
const BENTO = [
  {
    icon: Workflow,
    title: 'Visual designer, real Terraform',
    desc: 'Drag resources onto an infinite canvas. Every placement, wire, and parameter writes valid, module-based Terraform in real time — no syntax to memorize.',
    span: 'lg:col-span-2',
    accent: 'from-indigo-500/15',
    visual: (
      <div className="mt-5 flex items-center gap-3 font-mono text-[11px]">
        <span className="px-2.5 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/25 text-sky-300">VPC</span>
        <span className="text-slate-600">→</span>
        <span className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300">EC2</span>
        <span className="text-slate-600">→</span>
        <span className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-300">RDS</span>
        <span className="ml-2 text-slate-500">=</span>
        <span className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-semibold">main.tf</span>
      </div>
    ),
  },
  {
    icon: GitBranch,
    title: 'GitOps-ready output',
    desc: 'Every design exports clean main.tf, variables, and tfvars — drop them straight into your repo and pipeline of choice.',
    span: '',
    accent: 'from-sky-500/15',
  },
  {
    icon: ShieldCheck,
    title: 'Guardrails from day one',
    desc: 'SSH locked behind CIDR allowlists, storage encrypted by default, databases private-until-authorized. The safe path is the default path.',
    span: '',
    accent: 'from-emerald-500/15',
  },
  {
    icon: Coins,
    title: 'Cost-aware sizing',
    desc: 'Abstract tiers (small → large) translate to the right SKU per cloud, so you compare apples to apples before you spend.',
    span: '',
    accent: 'from-amber-500/15',
  },
  {
    icon: Radar,
    title: 'Drift radar',
    desc: 'Console changes get caught. Scheduled scans diff live state against your source of truth and flag what moved.',
    span: '',
    accent: 'from-violet-500/15',
  },
  {
    icon: Boxes,
    title: 'Module catalog as the source of truth',
    desc: 'Private, hardened, versioned modules per provider — your teams compose from the catalog, never from raw internet snippets.',
    span: 'lg:col-span-2',
    accent: 'from-cyan-500/15',
    visual: (
      <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-mono">
        {['aws_vpc', 'aws_ec2_web', 'aws_rds_postgres', 'azure_vnet', 'azure_vm_web', 'gcp_vpc', 'gcp_cloud_sql', 'gcp_storage'].map((m) => (
          <span key={m} className="px-2 py-1 rounded-md bg-white/[0.04] border border-white/10 text-slate-300">{m}</span>
        ))}
      </div>
    ),
  },
];

export function Features() {
  return (
    <Section id="platform">
      <Reveal className="max-w-2xl">
        <Eyebrow><Boxes className="w-3.5 h-3.5" /> The platform</Eyebrow>
        <h2 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-[-0.02em] text-white leading-[1.1]">
          Everything infrastructure teams need,
          <span className="text-gradient-accent"> natively in one flow</span>
        </h2>
        <p className="mt-5 text-lg text-slate-400 leading-relaxed">
          No glue code, no context switching. Design, generate, gate, and ship — with the
          controls your security team actually asks about.
        </p>
      </Reveal>

      <div className="mt-14 grid lg:grid-cols-3 gap-4">
        {BENTO.map((f, i) => {
          const Icon = f.icon;
          return (
            <Reveal key={f.title} delay={i * 70} className={`${f.span} glass-card rounded-2xl p-7 bg-gradient-to-br ${f.accent} to-transparent`}>
              <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center mb-5">
                <Icon className="w-5 h-5 text-white/80" />
              </div>
              <h3 className="text-lg font-bold text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              {f.visual}
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

/* ============================================
   Designer showcase (product visual)
   ============================================ */
export function DesignerShowcase() {
  return (
    <Section id="designer" className="overflow-hidden">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <Reveal variant="left">
          <Eyebrow><FileCode2 className="w-3.5 h-3.5" /> Terraform-as-Diagram</Eyebrow>
          <h2 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-[-0.02em] text-white leading-[1.1]">
            Draw it once.
            <br />
            Ship it <span className="text-gradient-accent">anywhere</span>.
          </h2>
          <p className="mt-5 text-lg text-slate-400 leading-relaxed">
            The same visual architecture provisions on AWS today, Azure tomorrow, and GCP when
            the contract says so. Switch providers and your canvas re-maps to native modules
            instantly.
          </p>
          <ul className="mt-8 space-y-3.5">
            {[
              'Infinite canvas with dependency wiring',
              'Schema-driven parameter forms per module',
              'Live code panel with copy & download',
              'One-click handoff to the deployment pipeline',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard"
            className="mt-9 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#05070d] text-sm font-semibold hover:bg-indigo-50 transition-all shadow-lg shadow-white/10 group"
          >
            Try the designer
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Reveal>

        {/* Stylized canvas mock */}
        <Reveal variant="right" className="relative">
          <div className="absolute -inset-8 glow-orb bg-indigo-600/15" />
          <div className="relative rounded-2xl border border-white/10 bg-[#070b14]/90 backdrop-blur-xl p-5 shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between px-1 pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                <span className="ml-3 text-[11px] font-medium text-slate-400">prod-web-stack — visual designer</span>
              </div>
              <div className="flex gap-1 text-[10px] font-bold">
                <span className="px-2 py-0.5 rounded bg-white/[0.06] text-slate-300">AWS</span>
                <span className="px-2 py-0.5 rounded text-slate-500">AZURE</span>
                <span className="px-2 py-0.5 rounded text-slate-500">GCP</span>
              </div>
            </div>

            {/* Node graph */}
            <div className="relative py-8 h-[280px]">
              <svg className="absolute inset-0 w-full h-full" aria-hidden>
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" opacity="0.7" />
                  </marker>
                </defs>
                {/* VPC -> web */}
                <path d="M 150 78 C 150 130, 105 130, 105 158" stroke="#6366f1" strokeWidth="1.5" fill="none" opacity="0.55" markerEnd="url(#arrow)" strokeDasharray="4 3" />
                {/* VPC -> db */}
                <path d="M 150 78 C 150 130, 285 130, 285 158" stroke="#6366f1" strokeWidth="1.5" fill="none" opacity="0.55" markerEnd="url(#arrow)" strokeDasharray="4 3" />
                {/* web -> storage */}
                <path d="M 105 214 C 105 250, 190 246, 192 252" stroke="#6366f1" strokeWidth="1.5" fill="none" opacity="0.4" markerEnd="url(#arrow)" strokeDasharray="4 3" />
              </svg>

              {[
                { x: 88, y: 40, w: 124, kind: 'NETWORK', label: 'prod-vpc', ref: 'aws_vpc', cls: 'border-sky-500/40 text-sky-300', iconCls: 'text-sky-300' },
                { x: 48, y: 158, w: 116, kind: 'COMPUTE', label: 'web-01', ref: 'aws_ec2_web', cls: 'border-amber-500/40 text-amber-300' },
                { x: 224, y: 158, w: 122, kind: 'DATABASE', label: 'app-db', ref: 'aws_rds', cls: 'border-indigo-500/40 text-indigo-300' },
                { x: 132, y: 252, w: 120, kind: 'STORAGE', label: 'assets', ref: 'aws_s3', cls: 'border-emerald-500/40 text-emerald-300' },
              ].map((n) => (
                <div
                  key={n.label}
                  className={`absolute rounded-xl border bg-white/[0.03] backdrop-blur px-3 py-2.5 ${n.cls}`}
                  style={{ left: `${(n.x / 442) * 100}%`, top: n.y }}
                >
                  <div className="text-[9px] font-bold tracking-widest opacity-80">{n.kind}</div>
                  <div className="text-[13px] font-bold text-white">{n.label}</div>
                  <div className="text-[9px] font-mono text-slate-500">{n.ref}</div>
                </div>
              ))}
            </div>

            <div className="mt-2 flex items-center justify-between px-1 pt-3 border-t border-white/[0.06] text-[10px]">
              <span className="font-mono text-slate-500">4 resources · 3 dependencies</span>
              <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
                Terraform synced
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

/* ============================================
   GitOps pipeline with animated beam
   ============================================ */
const PIPELINE = [
  { icon: FileCode2, label: 'Design', sub: 'canvas state' },
  { icon: Eye, label: 'Plan', sub: 'terraform plan' },
  { icon: ShieldCheck, label: 'Policy gate', sub: 'security rules' },
  { icon: CheckCircle2, label: 'Approval', sub: 'explicit sign-off' },
  { icon: Boxes, label: 'Apply', sub: 'isolated worker' },
  { icon: Globe, label: 'Live', sub: 'state tracked' },
];

export function Pipeline() {
  return (
    <Section className="overflow-hidden">
      <div className="absolute inset-0 dot-bg opacity-60" />
      <Reveal className="relative text-center max-w-2xl mx-auto">
        <Eyebrow><GitBranch className="w-3.5 h-3.5" /> Governed by default</Eyebrow>
        <h2 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-[-0.02em] text-white leading-[1.1]">
          From canvas to cloud,
          <span className="text-gradient-accent"> with receipts</span>
        </h2>
        <p className="mt-5 text-lg text-slate-400 leading-relaxed">
          Nothing touches your account without a reviewed plan and an explicit approval.
          Every step lands in an immutable audit trail.
        </p>
      </Reveal>

      <div className="relative mt-16">
        {/* Animated beam */}
        <div className="absolute top-[52px] left-[8%] right-[8%] h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent overflow-visible">
          <div className="animate-beam absolute top-1/2 -translate-y-1/2 w-16 h-[3px] rounded-full bg-gradient-to-r from-transparent via-indigo-300 to-transparent shadow-[0_0_16px_rgba(129,140,248,0.9)]" />
        </div>

        <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          {PIPELINE.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.label} delay={i * 90} className="text-center">
                <div className="relative mx-auto w-[104px]">
                  <div className="w-[104px] h-[104px] rounded-2xl glass-card flex items-center justify-center">
                    <Icon className="w-7 h-7 text-indigo-300" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#0a0e1a] border border-white/15 text-[10px] font-bold text-slate-300 flex items-center justify-center font-mono">
                    {i + 1}
                  </span>
                </div>
                <div className="mt-4 text-sm font-bold text-white">{step.label}</div>
                <div className="text-[11px] font-mono text-slate-500">{step.sub}</div>
              </Reveal>
            );
          })}
        </div>
      </div>

      {/* Cron / drift card row */}
      <div className="mt-20 grid md:grid-cols-2 gap-4">
        <Reveal variant="left" className="glass-card rounded-2xl p-7">
          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            <Clock className="w-3.5 h-3.5" /> Scheduled assurance
          </div>
          <h3 className="mt-3 text-lg font-bold text-white">Drift scans on your schedule</h3>
          <div className="mt-5 rounded-xl bg-black/40 border border-white/[0.08] p-4 font-mono text-[12px]">
            <div className="flex items-center gap-3">
              <span className="text-indigo-300">30 6</span>
              <span className="text-slate-400">* *</span>
              <span className="text-emerald-300">1-5</span>
              <span className="ml-auto text-[11px] text-slate-500">UTC</span>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] text-[11px] text-slate-400">
              Scans every weekday at 06:30 — diffs live state against source of truth and
              flags out-of-band changes.
            </div>
          </div>
        </Reveal>

        <Reveal variant="right" delay={100} className="glass-card rounded-2xl p-7">
          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            <Lock className="w-3.5 h-3.5" /> Zero secret leakage
          </div>
          <h3 className="mt-3 text-lg font-bold text-white">Credentials never leave the vault</h3>
          <div className="mt-5 space-y-2.5 font-mono text-[12px]">
            {[
              { k: 'onboard', v: 'validated live → AES-256-GCM', c: 'text-emerald-300' },
              { k: 'at rest', v: 'encrypted in PostgreSQL', c: 'text-emerald-300' },
              { k: 'worker', v: 'injected as env, never HCL', c: 'text-emerald-300' },
              { k: 'logs', v: 'regex-masked on capture', c: 'text-emerald-300' },
            ].map((row) => (
              <div key={row.k} className="flex items-center justify-between rounded-lg bg-black/30 border border-white/[0.06] px-3.5 py-2.5">
                <span className="text-slate-500">{row.k}</span>
                <span className={row.c}>{row.v}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

/* ============================================
   Integrations marquee
   ============================================ */
const INTEGRATIONS = [
  { name: 'Terraform', tag: 'HCL engine' },
  { name: 'OpenTofu', tag: 'open source' },
  { name: 'AWS', tag: 'provider' },
  { name: 'Azure', tag: 'provider' },
  { name: 'GCP', tag: 'provider' },
  { name: 'Infracost', tag: 'cost est.' },
  { name: 'Checkov', tag: 'policy' },
  { name: 'tfsec', tag: 'security' },
  { name: 'OPA', tag: 'policy' },
  { name: 'GitHub', tag: 'gitops' },
  { name: 'GitLab', tag: 'gitops' },
  { name: 'Slack', tag: 'alerts' },
  { name: 'PostgreSQL', tag: 'state' },
  { name: 'RabbitMQ', tag: 'queue' },
];

export function Integrations() {
  const doubled = [...INTEGRATIONS, ...INTEGRATIONS];
  return (
    <Section id="integrations" className="py-20">
      <Reveal className="text-center">
        <Eyebrow><Globe className="w-3.5 h-3.5" /> Integrations</Eyebrow>
        <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-white">
          Everything you care about,
          <span className="text-gradient-accent"> natively connected</span>
        </h2>
      </Reveal>

      <div className="mt-12 marquee-mask overflow-hidden">
        <div className="animate-marquee flex gap-4 w-max">
          {doubled.map((item, i) => (
            <div
              key={`${item.name}-${i}`}
              className="flex items-center gap-3 px-5 py-4 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:border-indigo-500/40 hover:bg-white/[0.05] transition-colors shrink-0"
            >
              {['AWS', 'AZURE', 'GCP'].includes(item.name.toUpperCase()) ? (
                <ProviderIcon provider={item.name.toUpperCase()} size={18} />
              ) : (
                <Boxes className="w-4 h-4 text-slate-400" />
              )}
              <div>
                <div className="text-sm font-semibold text-white leading-tight">{item.name}</div>
                <div className="text-[10px] text-slate-500">{item.tag}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
