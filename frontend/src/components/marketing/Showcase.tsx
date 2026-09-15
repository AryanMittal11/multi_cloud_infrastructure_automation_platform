'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Cloud,
  DollarSign,
  Eye,
  FileCode2,
  FolderGit2,
  Layers,
  Library,
  PenTool,
  Rocket,
  ScrollText,
  ShieldCheck,
  Waypoints,
} from 'lucide-react';
import { Eyebrow, Section, Reveal } from './Reveal';
import { DashboardMock } from './DashboardMock';

/* ============================================================
   Deliver — the sticky pipeline narrative. Mirrors the real
   sidebar's Deliver group: Projects → Template Catalog →
   Visual Designer → Deployments.
   ============================================================ */

const STEPS = [
  {
    id: 'projects',
    icon: FolderGit2,
    nav: 'Projects',
    step: '01',
    title: 'Group infrastructure into projects and environments',
    body: 'Every workspace carries dev, staging, and production environments — each bound to its own cloud account. Your team gets paved roads, not shared credentials.',
    chip: 'projects & environments',
    mock: 'overview',
  },
  {
    id: 'catalog',
    icon: Library,
    nav: 'Template Catalog',
    step: '02',
    title: 'Start from hardened modules, not a blank page',
    body: 'A curated catalog of 20+ production-grade Terraform modules for AWS, Azure, and GCP — private-by-default databases, CIDR-gated access, encrypted storage — each with schema-driven parameters.',
    chip: 'terraform module catalog',
    mock: 'catalog',
  },
  {
    id: 'design',
    icon: PenTool,
    nav: 'Visual Designer',
    step: '03',
    title: 'Design the architecture on a live canvas',
    body: 'Place network, compute, database, and storage. Every wire you draw is a real Terraform dependency — the diagram and the generated main.tf never diverge.',
    chip: 'canvas → main.tf',
    mock: 'design',
  },
  {
    id: 'plan',
    icon: Eye,
    nav: 'Deployments',
    step: '04',
    title: 'Plan, gated by policy',
    body: 'Terraform plan runs in an isolated worker. Security policies check encryption, exposure, and CIDR allowlists before a human ever sees the diff.',
    chip: 'terraform plan',
    mock: 'plan',
  },
  {
    id: 'approved',
    icon: ShieldCheck,
    nav: 'Deployments',
    step: '05',
    title: 'Approve with receipts, apply with confidence',
    body: 'A named approver signs off on exactly what will change. Destructive operations require typed confirmation — then the worker applies and health lands on the dashboard.',
    chip: 'approval recorded → live',
    mock: 'approved',
  },
];

/* miniature catalog visual for step 02 */
function CatalogMock() {
  const modules = [
    { name: 'aws_vpc', kind: 'network' },
    { name: 'aws_ec2_web', kind: 'compute' },
    { name: 'aws_rds_postgres', kind: 'database' },
    { name: 'azure_vnet', kind: 'network' },
    { name: 'gcp_compute_web', kind: 'compute' },
    { name: 'aws_s3_bucket', kind: 'storage' },
  ];
  return (
    <div className="h-full w-full dash-mock p-5" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Boxes size={13} style={{ color: 'var(--ink-muted)' }} />
          <span className="text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>Template Catalog</span>
        </div>
        <span className="mono text-[9px]" style={{ color: 'var(--ink-faint)' }}>20+ modules · 3 providers</span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {modules.map((m) => (
          <div
            key={m.name}
            className="rounded-[10px] p-3 text-left"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="w-6 h-6 rounded-[7px] flex items-center justify-center mb-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <FileCode2 size={11} style={{ color: 'var(--ink-secondary)' }} />
            </div>
            <div className="mono text-[10px] font-semibold" style={{ color: 'var(--ink)' }}>{m.name}</div>
            <div className="mono text-[8.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{m.kind}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className="mono text-[9px] px-2 py-1 rounded-[6px]" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
          guardrails inside every module
        </span>
        <span className="mono text-[9px] px-2 py-1 rounded-[6px]" style={{ background: 'var(--surface-2)', color: 'var(--ink-muted)' }}>
          schema-validated parameters
        </span>
      </div>
    </div>
  );
}

export function Showcase() {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(total, 1)));
      const idx = Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length * 0.999));
      setActive(idx);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const step = STEPS[active];

  return (
    <section id="showcase" ref={sectionRef} className="relative" style={{ minHeight: `${STEPS.length * 72}vh` }}>
      <div className="sticky top-0 flex min-h-screen items-center">
        <div className="container-wide w-full">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-20 items-center">
            {/* narrative column */}
            <div>
              <Eyebrow>The Deliver pipeline</Eyebrow>

              {/* step markers */}
              <div className="mt-8 flex items-center gap-2.5">
                {STEPS.map((s, i) => (
                  <span
                    key={s.id}
                    className="h-1 rounded-full transition-all duration-500"
                    style={{
                      width: i === active ? 34 : 16,
                      background: i <= active ? '#ffffff' : 'var(--surface-3)',
                    }}
                  />
                ))}
                <span className="mono text-[10px] ml-2" style={{ color: 'var(--ink-faint)' }}>
                  {step.step} / 0{STEPS.length}
                </span>
              </div>

              <div key={step.id} className="showcase-step mt-6">
                <div className="flex items-center gap-2.5 text-xs font-semibold" style={{ color: 'var(--ink)' }}>
                  <step.icon size={14} />
                  <span className="mono tracking-widest uppercase" style={{ color: 'var(--ink-muted)' }}>{step.chip}</span>
                </div>
                <h3 className="display-lg mt-4" style={{ color: 'var(--ink)' }}>{step.title}</h3>
                <p className="mt-4 text-base leading-relaxed max-w-md" style={{ color: 'var(--ink-muted)' }}>
                  {step.body}
                </p>
              </div>
            </div>

            {/* product column */}
            <div className="relative">
              <div className="browser-frame">
                <div className="browser-bar">
                  <span className="browser-dot" />
                  <span className="browser-dot" />
                  <span className="browser-dot" />
                  <span className="browser-url">cloudweave.app/{step.nav.toLowerCase().replace(' ', '-')}</span>
                  <span className="w-[46px]" />
                </div>
                <div style={{ height: 'clamp(300px, 36vw, 470px)' }} className="relative">
                  {step.mock === 'catalog' && <CatalogMock />}
                  {step.mock !== 'catalog' && (
                    <>
                      {(['overview', 'design', 'plan', 'approved'] as const).map((s) => (
                        <div
                          key={s}
                          className="absolute inset-0 transition-all duration-500"
                          style={{
                            opacity: step.mock === s ? 1 : 0,
                            transform: step.mock === s ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.99)',
                            pointerEvents: 'none',
                          }}
                          aria-hidden={step.mock !== s}
                        >
                          <DashboardMock state={s} />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* step footnotes */}
              {step.id === 'projects' && (
                <div
                  className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-[8px] text-xs font-semibold"
                  style={{ background: 'var(--surface-3)', border: '1px solid var(--border-strong)', color: 'var(--ink-secondary)' }}
                >
                  <FolderGit2 size={13} /> dev · staging · prod — one account each
                </div>
              )}
              {step.id === 'catalog' && (
                <div
                  className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-[8px] text-xs font-semibold"
                  style={{ background: 'var(--surface-3)', border: '1px solid var(--border-strong)', color: 'var(--success)' }}
                >
                  <Library size={13} /> template → instant designer draft
                </div>
              )}
              {step.id === 'plan' && (
                <div
                  className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-[8px] text-xs font-semibold"
                  style={{ background: 'var(--surface-3)', border: '1px solid var(--border-strong)', color: 'var(--warn)' }}
                >
                  <Eye size={13} /> 3 to add · 0 to destroy · policy: pass
                </div>
              )}
              {step.id === 'approved' && (
                <div
                  className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-[8px] text-xs font-semibold"
                  style={{ background: 'var(--surface-3)', border: '1px solid var(--border-strong)', color: 'var(--success)' }}
                >
                  <CheckCircle2 size={13} /> Approved by maya · recorded in audit trail
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Operate — mirrors the Operate group: Resources, Topology, Costs
   ============================================================ */

const OPERATE_CARDS = [
  {
    icon: Layers,
    title: 'Resources',
    desc: 'Every provisioned resource, recorded at apply time — grouped by kind, linked to its deployment, searchable across all three clouds.',
    visual: 'resources' as const,
  },
  {
    icon: Waypoints,
    title: 'Topology',
    desc: 'A live dependency graph of your fleet. Network feeds compute, compute feeds databases — see blast radius before you change anything.',
    visual: 'topology' as const,
  },
  {
    icon: DollarSign,
    title: 'Costs',
    desc: 'Estimated monthly spend per project and resource, mapped from instance SKUs at plan time — before the bill, not after.',
    visual: 'costs' as const,
  },
];

function ResourceRowsVisual() {
  const rows = [
    ['aws_vpc.main', 'network', 'us-east-1'],
    ['aws_ec2_web.web-a', 'compute', 'us-east-1'],
    ['aws_rds_postgres.db', 'database', 'us-east-1'],
    ['azure_vnet.core', 'network', 'eastus'],
  ];
  return (
    <div className="w-full space-y-1.5">
      {rows.map(([name, kind, region], i) => (
        <div
          key={name}
          className="flex items-center gap-2.5 rounded-[8px] px-3 py-2"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', opacity: 1 - i * 0.14 }}
        >
          <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: i === 0 ? 'var(--success)' : 'var(--ink-faint)' }} />
          <span className="mono text-[10px]" style={{ color: 'var(--ink)' }}>{name}</span>
          <span className="mono text-[9px] ml-auto" style={{ color: 'var(--ink-faint)' }}>{kind} · {region}</span>
        </div>
      ))}
    </div>
  );
}

function TopologyVisual() {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ minHeight: 130 }}>
      <svg viewBox="0 0 260 130" className="w-full" style={{ maxHeight: 130 }}>
        {[
          ['M60 32 L60 72', false],
          ['M60 72 L130 98', true],
          ['M130 98 L200 98', false],
        ].map(([d], i) => (
          <path key={i} d={d as string} stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" fill="none" strokeDasharray={i === 1 ? '3 3' : undefined} />
        ))}
        {[
          { x: 60, y: 32, label: 'network' },
          { x: 60, y: 72, label: 'compute' },
          { x: 130, y: 98, label: 'database' },
          { x: 200, y: 98, label: 'storage' },
        ].map((n) => (
          <g key={n.label}>
            <rect x={n.x - 30} y={n.y - 11} width="60" height="22" rx="6" fill="#161616" stroke="rgba(255,255,255,0.24)" />
            <text x={n.x} y={n.y + 3.5} textAnchor="middle" fill="#c4c4c4" fontSize="8.5" fontFamily="monospace">{n.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function CostsVisual() {
  const bars = [
    ['web-platform', 86, '$56/mo'],
    ['data-pipeline', 54, '$35/mo'],
    ['sandbox', 18, '$12/mo'],
  ] as const;
  return (
    <div className="w-full space-y-3">
      {bars.map(([name, pct, amount]) => (
        <div key={name}>
          <div className="flex items-center justify-between mb-1">
            <span className="mono text-[10px]" style={{ color: 'var(--ink)' }}>{name}</span>
            <span className="mono text-[10px]" style={{ color: 'var(--ink-muted)' }}>{amount}</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: 'var(--surface-3)' }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#ffffff' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Operate() {
  return (
    <Section id="operate">
      <Reveal className="max-w-2xl">
        <Eyebrow>The Operate surface</Eyebrow>
        <h2 className="display-lg mt-5" style={{ color: 'var(--ink)' }}>
          After the apply, the real work starts.
        </h2>
        <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
          Provisioning is one command; operating is a discipline. cloudweave keeps the full
          inventory, its dependency graph, and the running cost estimate one click deep.
        </p>
      </Reveal>

      <div className="mt-12 grid md:grid-cols-3 gap-3.5">
        {OPERATE_CARDS.map((card, i) => {
          const Icon = card.icon;
          return (
            <Reveal key={card.title} delay={i * 70} className="quiet-card p-6 flex flex-col">
              <div className="w-9 h-9 rounded-[9px] flex items-center justify-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <Icon size={15} style={{ color: 'var(--ink)' }} />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--ink-muted)' }}>{card.desc}</p>
              <div className="mt-5 pt-5 flex-1 flex items-center" style={{ borderTop: '1px solid var(--border-faint)' }}>
                {card.visual === 'resources' && <ResourceRowsVisual />}
                {card.visual === 'topology' && <TopologyVisual />}
                {card.visual === 'costs' && <CostsVisual />}
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

/* ============================================================
   Trust — mirrors the Trust group: Cloud Accounts, Audit Logs
   ============================================================ */

const AUDIT_ROWS = [
  ['09:41:07', 'maya', 'APPROVE', 'deployment #41 · create'],
  ['09:40:52', 'policy', 'PASS', 'guardrails · 6 checks'],
  ['09:39:18', 'arjun', 'PLAN', 'web-platform · staging'],
  ['09:12:03', 'maya', 'DELETE_ACCOUNT', 'blocked · typed confirm required'],
];

export function Trust() {
  return (
    <Section id="trust">
      <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
        <Reveal variant="left">
          <Eyebrow>The Trust layer</Eyebrow>
          <h2 className="display-lg mt-5" style={{ color: 'var(--ink)' }}>
            Credentials sealed. Actions attributable.
          </h2>
          <p className="mt-5 text-base leading-relaxed max-w-lg" style={{ color: 'var(--ink-muted)' }}>
            Cloud credentials are encrypted with AES-256-GCM, validated live at onboarding, and
            injected only into the ephemeral worker — the UI never sees them, the API never
            returns them. Every meaningful action lands in an append-only audit log with actor,
            verb, and target.
          </p>
          <ul className="mt-7 space-y-3">
            {[
              'AES-256-GCM at rest · live validation via STS / ARM / Resource Manager',
              'Admin-only teardown of bound accounts, gated by typed confirmation',
              'Immutable audit trail: who did what, to which deployment, and when',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--ink-secondary)' }}>
                <CheckCircle2 size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--ink)' }} />
                {item}
              </li>
            ))}
          </ul>
          <Link href="/login" className="btn btn-primary mt-8 group">
            Open the dashboard
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </Reveal>

        <Reveal variant="right">
          <div className="quiet-card overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <ScrollText size={13} style={{ color: 'var(--ink-muted)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>audit log</span>
              <span className="mono text-[9px] ml-auto" style={{ color: 'var(--ink-faint)' }}>append-only</span>
            </div>
            <div className="p-3 space-y-1.5">
              {AUDIT_ROWS.map(([time, actor, verb, target], i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-[8px] px-3 py-2.5"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border-faint)' }}
                >
                  <span className="mono text-[9.5px] flex-none" style={{ color: 'var(--ink-faint)' }}>{time}</span>
                  <span
                    className="mono text-[9px] px-1.5 py-0.5 rounded-[5px] flex-none font-semibold"
                    style={{
                      background: verb === 'PASS' ? 'var(--success-soft)' : verb === 'DELETE_ACCOUNT' ? 'var(--fail-soft)' : 'var(--surface-3)',
                      color: verb === 'PASS' ? 'var(--success)' : verb === 'DELETE_ACCOUNT' ? 'var(--fail)' : 'var(--ink-secondary)',
                    }}
                  >
                    {verb}
                  </span>
                  <span className="mono text-[10px] truncate" style={{ color: 'var(--ink)' }}>{actor}</span>
                  <span className="mono text-[9.5px] ml-auto truncate hidden sm:block" style={{ color: 'var(--ink-faint)' }}>{target}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 px-5 py-3" style={{ borderTop: '1px solid var(--border-faint)' }}>
              <Cloud size={12} style={{ color: 'var(--ink-muted)' }} />
              <span className="mono text-[9.5px]" style={{ color: 'var(--ink-muted)' }}>
                aws · azure · gcp credentials sealed at onboarding
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
