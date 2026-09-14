'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, ChevronDown, Cloud, GraduationCap, Server } from 'lucide-react';
import { Reveal, Eyebrow, Section } from './Reveal';
import { ProviderIcon } from '../../lib/provider-icon';

/* ============================================================
   Who it's for — honest credibility (replaces fake testimonials)
   ============================================================ */

const AUDIENCES = [
  {
    icon: Building2,
    title: 'Platform teams',
    body: 'Give developers a governed path to production. The catalog is the paved road — guardrails ship inside the modules, not in a wiki page.',
  },
  {
    icon: Server,
    title: 'Solo operators',
    body: 'Reach for it when the Terraform you copied two years ago has outlived its author. Draw the target architecture, diff it against reality, migrate deliberately.',
  },
  {
    icon: GraduationCap,
    title: 'Teams learning Terraform',
    body: 'Every canvas action shows the HCL it produces. Start visual, read the generated code, graduate to writing it — the training wheels are transparent.',
  },
];

const PRINCIPLES = [
  'Deterministic generation — no AI in the deploy path',
  'Human approval on every production change',
  'Standard Terraform in, standard Terraform out',
  'Credentials sealed from UI to worker',
];

export function ForTeams() {
  return (
    <Section id="whofor">
      <Reveal className="text-center max-w-2xl mx-auto">
        <Eyebrow>Who builds here</Eyebrow>
        <h2 className="display-lg mt-5" style={{ color: 'var(--ink)' }}>
          A control plane for teams that answer for their infrastructure.
        </h2>
      </Reveal>

      <div className="mt-12 grid md:grid-cols-3 gap-3.5">
        {AUDIENCES.map((a, i) => {
          const Icon = a.icon;
          return (
            <Reveal key={a.title} delay={i * 70} className="quiet-card p-7">
              <Icon size={18} style={{ color: 'var(--accent-strong)' }} />
              <h3 className="mt-4 text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>{a.title}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--ink-muted)' }}>{a.body}</p>
            </Reveal>
          );
        })}
      </div>

      {/* principles strip */}
      <Reveal delay={120} className="mt-6 quiet-card px-7 py-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRINCIPLES.map((p) => (
            <div key={p} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--ink-secondary)' }}>
              <span className="w-1.5 h-1.5 rounded-full mt-[7px] flex-none" style={{ background: 'var(--accent)' }} />
              {p}
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}

/* ============================================================
   FAQ — centered, Brainboard-style
   ============================================================ */

const FAQS = [
  {
    q: 'What exactly does the platform generate?',
    a: 'Production-ready, module-based Terraform. Each canvas node maps to a hardened module in the catalog — network, compute, database, storage — and dependency edges become explicit depends_on wiring, so the generated code matches the diagram you reviewed.',
  },
  {
    q: 'How does multi-cloud actually work?',
    a: 'Three universal archetypes (web-service-stack, storage-backend, secure-network) plus abstract sizing tiers translate to native SKUs per provider. Switching a design re-maps modules, normalizes regions, and normalizes outputs back into shared descriptors.',
  },
  {
    q: 'Can someone deploy to production without review?',
    a: 'No. Every change flows through plan → policy gate → explicit approval → apply. Destructive operations require typed confirmation, production teardown requires an administrator, and every step is written to an immutable audit trail.',
  },
  {
    q: 'Where do my cloud credentials live?',
    a: 'Encrypted with AES-256-GCM at rest, validated live at onboarding (STS for AWS, Azure Resource Manager, GCP Resource Manager), then injected only into the isolated worker as environment variables — never written to HCL, never returned by the API, regex-masked in logs.',
  },
  {
    q: 'Do I need to know Terraform to use it?',
    a: 'To design and deploy, no — the canvas and schema-driven forms handle the HCL. Everything generates standard Terraform you can export and read, so most teams start visual and graduate to tuning the code as they mature.',
  },
  {
    q: 'What happens when someone changes things in the cloud console?',
    a: 'Scheduled drift scans diff live state against your source of truth on your cron schedule, flag drifted resources in the dashboard, and show exactly which attributes moved — so out-of-band changes get reconciled instead of discovered during an incident.',
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Section id="faq">
      <div className="max-w-3xl mx-auto">
        <Reveal className="text-center">
          <h2 className="display-lg" style={{ color: 'var(--ink)' }}>Your questions, answered.</h2>
        </Reveal>

        <div className="mt-12">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={item.q} delay={i * 40}>
                <div className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-6 py-5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>{item.q}</span>
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-none transition-transform duration-300"
                      style={{ border: '1px solid var(--border-strong)', transform: isOpen ? 'rotate(180deg)' : undefined }}
                    >
                      <ChevronDown size={12} style={{ color: 'var(--ink-muted)' }} />
                    </span>
                  </button>
                  <div className={`faq-panel ${isOpen ? 'open' : ''}`}>
                    <div>
                      <p className="pb-5 text-sm leading-relaxed max-w-2xl" style={{ color: 'var(--ink-muted)' }}>{item.a}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

/* ============================================================
   Final CTA — dot-grid box
   ============================================================ */

export function FinalCTA() {
  return (
    <Section className="pb-16">
      <Reveal variant="scale">
        <div className="cta-box text-center px-6">
          <p className="eyebrow">Ready when you are</p>
          <h2 className="display-xl mt-5" style={{ color: 'var(--ink)' }}>
            Your first architecture is minutes away.
          </h2>
          <p className="mt-5 text-base max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
            Open the dashboard, place three nodes, and watch the Terraform write itself —
            then ship it through a pipeline your security team already approved.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 h-12 px-7 rounded-full text-sm font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(180deg, #5b96ff 0%, var(--accent) 55%, #2c6ce8 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 8px 28px rgba(45,108,232,0.35)' }}
            >
              Open the dashboard
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#faq"
              className="inline-flex items-center gap-2 h-12 px-6 rounded-full text-sm font-medium transition-colors"
              style={{ border: '1px solid var(--border-strong)', color: 'var(--ink-secondary)', background: 'var(--surface)' }}
            >
              Read the FAQ
            </a>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6">
            {['AWS', 'AZURE', 'GCP'].map((p) => (
              <span key={p} className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'var(--ink-muted)' }}>
                <ProviderIcon provider={p} size={13} /> {p}
              </span>
            ))}
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

/* ============================================================
   Footer
   ============================================================ */

const FOOTER_COLS = [
  {
    title: 'Product',
    links: [
      { label: 'Visual Designer', href: '/designer' },
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Template Catalog', href: '/templates' },
      { label: 'Deployments', href: '/dashboard/deployments' },
    ],
  },
  {
    title: 'Platform',
    links: [
      { label: 'Multi-cloud', href: '/#multicloud' },
      { label: 'Pipeline governance', href: '/#showcase' },
      { label: 'Drift detection', href: '/#platform' },
      { label: 'FAQ', href: '/#faq' },
    ],
  },
  {
    title: 'Stack',
    links: [
      { label: 'Terraform / OpenTofu', href: '/#platform' },
      { label: 'AWS · Azure · GCP', href: '/#multicloud' },
      { label: 'PostgreSQL', href: '/#platform' },
      { label: 'RabbitMQ', href: '/#platform' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t py-14" style={{ borderColor: 'var(--border-faint)', background: 'var(--bg-elevated)' }}>
      <div className="container-wide">
        <div className="grid md:grid-cols-[1.3fr_repeat(3,0.8fr)] gap-10">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent-strong)" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M12 2a10 10 0 1 0 10 10" />
                  <circle cx="12" cy="12" r="3" fill="var(--accent)" stroke="none" />
                </svg>
              </span>
              <span className="font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>CerebrOps</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed max-w-xs" style={{ color: 'var(--ink-muted)' }}>
              Visual multi-cloud infrastructure with a governed deploy pipeline. Deterministic
              Terraform, human approvals, complete audit trail.
            </p>
          </div>

          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <div className="eyebrow">{col.title}</div>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm transition-colors hover:underline" style={{ color: 'var(--ink-muted)' }}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-7 border-t flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: 'var(--border-faint)' }}>
          <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>© 2026 CerebrOps. Demo workspace — data resets on reload.</span>
          <div className="flex items-center gap-5 text-xs" style={{ color: 'var(--ink-faint)' }}>
            <span>Terms</span>
            <span>Privacy</span>
            <span className="flex items-center gap-1.5">
              <Cloud size={11} /> built on open standards
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
