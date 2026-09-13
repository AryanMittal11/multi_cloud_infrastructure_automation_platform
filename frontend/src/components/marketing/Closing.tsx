'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowRight, Cloud, Quote } from 'lucide-react';
import { Reveal, Eyebrow, Section } from './Reveal';
import { ProviderIcon } from '../../lib/provider-icon';

/* ============================================
   Testimonials
   ============================================ */
const QUOTES = [
  {
    quote:
      'The plan → approve → apply gate sold our security team in one meeting. Nothing touches production without a reviewed diff and a named approver.',
    name: 'Platform Lead',
    role: 'Fintech, Series C',
  },
  {
    quote:
      'We handed the visual designer to two engineers who had never written Terraform. They shipped a hardened, tagged, encrypted stack in their first week.',
    name: 'Head of Engineering',
    role: 'E-commerce platform',
  },
  {
    quote:
      'Same architecture on AWS and GCP, one canvas. When our EU contract required a region move, re-mapping took an afternoon — not a quarter.',
    name: 'Principal Architect',
    role: 'SaaS, enterprise',
  },
];

export function Testimonials() {
  return (
    <Section className="py-24">
      <Reveal className="text-center max-w-2xl mx-auto">
        <Eyebrow><Quote className="w-3.5 h-3.5" /> Teams take infrastructure seriously here</Eyebrow>
        <h2 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-[-0.02em] text-white leading-[1.1]">
          Built for teams that
          <span className="text-gradient-accent"> ship with confidence</span>
        </h2>
      </Reveal>

      <div className="mt-14 grid md:grid-cols-3 gap-4">
        {QUOTES.map((t, i) => (
          <Reveal key={t.name} delay={i * 90} className="glass-card rounded-2xl p-7 flex flex-col justify-between">
            <div>
              <Quote className="w-5 h-5 text-indigo-400/60" />
              <p className="mt-4 text-[15px] text-slate-300 leading-relaxed">“{t.quote}”</p>
            </div>
            <div className="mt-6 pt-5 border-t border-white/[0.06]">
              <div className="text-sm font-bold text-white">{t.name}</div>
              <div className="text-xs text-slate-500">{t.role}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ============================================
   FAQ accordion
   ============================================ */
const FAQS = [
  {
    q: 'What exactly does the platform generate?',
    a: 'Production-ready, module-based Terraform. Each canvas node maps to a hardened module in your catalog (network, compute, database, storage), and dependency edges become explicit depends_on wiring — so the generated code matches the diagram you reviewed, not an approximation of it.',
  },
  {
    q: 'How does multi-cloud actually work?',
    a: 'A universal intent (web-service-stack, storage-backend, secure-network) plus abstract sizing tiers translate to native SKUs per provider. Switch a design from AWS to Azure or GCP and the canvas re-maps modules, regions normalize automatically, and outputs normalize back into common descriptors.',
  },
  {
    q: 'Can someone deploy directly to production without review?',
    a: 'No. Every change flows through plan → policy gate → explicit approval → apply. Destructive operations require typed confirmation keywords, production teardown requires an administrator, and every step is written to an immutable audit trail.',
  },
  {
    q: 'Where do my cloud credentials live?',
    a: 'Encrypted with AES-256-GCM at rest, validated live at onboarding (STS for AWS, Azure Resource Manager, GCP Resource Manager), injected only into the isolated worker as environment variables — never written to HCL, never returned by the API, and regex-masked in logs.',
  },
  {
    q: 'Do I need to know Terraform to use it?',
    a: 'To design and deploy, no — the canvas and schema-driven forms handle it. To extend it, yes-ish: everything generates standard Terraform you can export, read, and tune. Most teams start visual and graduate to editing the generated code as they mature.',
  },
  {
    q: 'What happens when someone changes things in the cloud console?',
    a: 'Scheduled drift scans diff live state against your source of truth on your cron schedule, flag drifted resources in the dashboard, and show exactly which attributes moved — so out-of-band changes get reconciled instead of discovered during an incident.',
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Section id="faq" className="py-24">
      <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-14">
        <Reveal variant="left">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-[-0.02em] text-white leading-[1.1]">
            Your questions,
            <span className="text-gradient-accent"> answered</span>
          </h2>
          <p className="mt-5 text-slate-400 leading-relaxed">
            The short version of how the platform works. For the long version, the docs go deep
            on every subsystem.
          </p>
        </Reveal>

        <div className="space-y-3">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={item.q} delay={i * 50}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className={`w-full text-left rounded-2xl border px-6 py-5 transition-colors ${
                    isOpen
                      ? 'bg-white/[0.05] border-indigo-500/30'
                      : 'bg-white/[0.02] border-white/[0.07] hover:border-white/[0.16]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[15px] font-semibold text-white">{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  <div className={`faq-panel ${isOpen ? 'open' : ''}`}>
                    <div>
                      <p className="pt-3.5 text-sm text-slate-400 leading-relaxed">{item.a}</p>
                    </div>
                  </div>
                </button>
              </Reveal>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

/* ============================================
   Final CTA
   ============================================ */
export function FinalCTA() {
  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-70" />
      <div className="glow-orb w-[480px] h-[480px] bg-indigo-600/20 left-1/2 -translate-x-1/2 top-0 animate-float-slow" />

      <Reveal className="relative text-center max-w-3xl mx-auto px-6">
        <h2 className="text-4xl sm:text-6xl font-extrabold tracking-[-0.03em] text-white leading-[1.05]">
          Get started with
          <br />
          <span className="text-gradient-accent">MultiCloud today</span>
        </h2>
        <p className="mt-6 text-lg text-slate-400 leading-relaxed max-w-xl mx-auto">
          Your first architecture is minutes away. Design it, watch the Terraform write itself,
          and ship it through a pipeline your security team already approved.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 px-7 py-4 rounded-xl bg-white text-[#05070d] text-sm font-semibold hover:bg-indigo-50 transition-all shadow-2xl shadow-white/15"
          >
            Start building free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a
            href="#platform"
            className="px-6 py-4 rounded-xl text-sm font-medium text-slate-300 border border-white/10 hover:border-white/25 hover:text-white transition-all bg-white/[0.03]"
          >
            Explore the platform
          </a>
        </div>
        <div className="mt-10 flex items-center justify-center gap-6 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5"><ProviderIcon provider="AWS" size={13} /> AWS</span>
          <span className="flex items-center gap-1.5"><ProviderIcon provider="AZURE" size={13} /> Azure</span>
          <span className="flex items-center gap-1.5"><ProviderIcon provider="GCP" size={13} /> GCP</span>
        </div>
      </Reveal>
    </section>
  );
}

/* ============================================
   Footer
   ============================================ */
const FOOTER_COLS = [
  {
    title: 'Platform',
    links: ['Visual Designer', 'Template Catalog', 'Deployments', 'Drift Detection', 'Audit Trail'],
  },
  {
    title: 'Resources',
    links: ['Documentation', 'Module Registry', 'API Reference', 'Changelog', 'Status'],
  },
  {
    title: 'Company',
    links: ['About', 'Security Portal', 'Blog', 'Contact', 'Careers'],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-16 bg-[#04060b]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid md:grid-cols-[1.2fr_repeat(3,0.7fr)] gap-12">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 flex items-center justify-center">
                <Cloud className="w-4 h-4 text-white" strokeWidth={2.2} />
              </span>
              <span className="font-bold tracking-tight text-white">MultiCloud</span>
            </Link>
            <p className="mt-4 text-sm text-slate-500 leading-relaxed max-w-xs">
              AI-free by design: deterministic Terraform generation, human approval gates,
              and complete auditability across AWS, Azure, and GCP.
            </p>
          </div>

          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {col.title}
              </div>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <span className="text-sm text-slate-500 hover:text-slate-300 cursor-pointer transition-colors">
                      {link}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-slate-600">© 2026 MultiCloud Platform. All rights reserved.</span>
          <div className="flex items-center gap-6 text-xs text-slate-600">
            <span className="hover:text-slate-400 cursor-pointer transition-colors">Terms</span>
            <span className="hover:text-slate-400 cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-slate-400 cursor-pointer transition-colors">GDPR</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
