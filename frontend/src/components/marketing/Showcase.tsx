'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock, Eye, FileCode2, ShieldCheck } from 'lucide-react';
import { Eyebrow } from './Reveal';
import { DashboardMock } from './DashboardMock';

const STEPS = [
  {
    id: 'design',
    icon: FileCode2,
    step: '01',
    title: 'Design the architecture',
    body: 'Place network, compute, database, and storage on the canvas. Every wire you draw is a real Terraform dependency — the diagram and the code never diverge.',
    chip: 'canvas → main.tf',
  },
  {
    id: 'plan',
    icon: Eye,
    step: '02',
    title: 'Plan, gated by policy',
    body: 'Terraform plan runs in an isolated worker. Security policies check encryption, exposure, and CIDR allowlists before a human ever sees the diff.',
    chip: 'terraform plan',
  },
  {
    id: 'approved',
    icon: ShieldCheck,
    step: '03',
    title: 'Approve with receipts',
    body: 'A named approver signs off on exactly what will change. Destructive operations require typed confirmation — nothing applies implicitly.',
    chip: 'approval recorded',
  },
  {
    id: 'applied',
    icon: CheckCircle2,
    step: '04',
    title: 'Applied, tracked, observed',
    body: 'The worker applies through the provider APIs, state is tracked, and the deployment lands in the dashboard with health checks and an audit trail.',
    chip: 'apply → live',
  },
];

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
      // progress 0 when the section top reaches the viewport top,
      // 1 when the section bottom reaches the viewport bottom
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
  const mockState = step.id === 'design' ? 'design' : step.id === 'plan' ? 'plan' : 'approved';

  return (
    <section id="showcase" ref={sectionRef} className="relative" style={{ minHeight: `${STEPS.length * 78}vh` }}>
      <div className="sticky top-0 flex min-h-screen items-center">
        <div className="container-wide w-full">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-20 items-center">
            {/* narrative column */}
            <div>
              <Eyebrow>One governed pipeline</Eyebrow>

              {/* step markers */}
              <div className="mt-8 flex items-center gap-2.5">
                {STEPS.map((s, i) => (
                  <React.Fragment key={s.id}>
                    <span
                      className="h-1 rounded-full transition-all duration-500"
                      style={{
                        width: i === active ? 34 : 16,
                        background: i <= active ? 'var(--accent)' : 'var(--surface-3)',
                      }}
                    />
                  </React.Fragment>
                ))}
                <span className="mono text-[10px] ml-2" style={{ color: 'var(--ink-faint)' }}>
                  {step.step} / 04
                </span>
              </div>

              <div key={step.id} className="showcase-step mt-6">
                <div className="flex items-center gap-2.5 text-xs font-semibold" style={{ color: 'var(--accent-strong)' }}>
                  <step.icon size={14} />
                  <span className="mono tracking-widest uppercase">{step.chip}</span>
                </div>
                <h3 className="display-lg mt-4" style={{ color: 'var(--ink)' }}>{step.title}</h3>
                <p className="mt-4 text-base leading-relaxed max-w-md" style={{ color: 'var(--ink-muted)' }}>
                  {step.body}
                </p>
              </div>
            </div>

            {/* product column — transitions between dashboard states */}
            <div className="relative">
              <div className="browser-frame">
                <div className="browser-bar">
                  <span className="browser-dot" />
                  <span className="browser-dot" />
                  <span className="browser-dot" />
                  <span className="browser-url">cloudweave.app/dashboard</span>
                  <span className="w-[46px]" />
                </div>
                <div style={{ height: 'clamp(300px, 36vw, 470px)' }} className="relative">
                  {/* stacked states crossfade + rise */}
                  {(['overview', 'design', 'plan', 'approved'] as const).map((s) => (
                    <div
                      key={s}
                      className="absolute inset-0 transition-all duration-500"
                      style={{
                        opacity: mockState === s ? 1 : 0,
                        transform: mockState === s ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.99)',
                        pointerEvents: 'none',
                      }}
                      aria-hidden={mockState !== s}
                    >
                      <DashboardMock state={s} />
                    </div>
                  ))}
                </div>
              </div>

              {/* inline approval chip on the relevant step */}
              {step.id === 'approved' && (
                <div
                  className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold shadow-lg"
                  style={{ background: 'var(--surface-3)', border: '1px solid var(--border-strong)', color: 'var(--success)' }}
                >
                  <CheckCircle2 size={13} /> Approved by maya · recorded in audit trail
                </div>
              )}
              {step.id === 'plan' && (
                <div
                  className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold shadow-lg"
                  style={{ background: 'var(--surface-3)', border: '1px solid var(--border-strong)', color: 'var(--warn)' }}
                >
                  <Clock size={13} /> 3 to add · 0 to destroy · policy: pass
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
