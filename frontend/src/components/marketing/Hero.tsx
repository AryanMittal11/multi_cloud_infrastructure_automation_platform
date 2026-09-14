'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';
import { ProviderIcon } from '../../lib/provider-icon';
import { DashboardMock } from './DashboardMock';

function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, inView };
}

/* animated counter — eases to the target once visible */
function Counter({ to, suffix = '', duration = 1400 }: { to: number; suffix?: string; duration?: number }) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return (
    <span ref={ref} className="num">
      {val}
      {suffix}
    </span>
  );
}

const PROOF = [
  { to: 3, suffix: '', label: 'cloud providers, one canvas' },
  { to: 12, suffix: '+', label: 'hardened Terraform modules' },
  { to: 100, suffix: '%', label: 'plans gated by approval' },
  { to: 0, suffix: '', label: 'credentials ever exposed' },
];

export function Hero() {
  const [mounted, setMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const frameShift = Math.min(scrollY * 0.12, 90);

  return (
    <div className="relative overflow-hidden pt-32 sm:pt-40 pb-8">
      {/* restrained ambience */}
      <div className="absolute inset-0 grid-bg" aria-hidden />
      <div
        className="glow-orb w-[720px] h-[420px] left-1/2 -translate-x-1/2 -top-24"
        style={{ background: 'radial-gradient(closest-side, rgba(77,141,255,0.14), transparent)', transform: `translateX(-50%) translateY(${scrollY * 0.1}px)` }}
        aria-hidden
      />

      <div className="relative container-wide text-center">
        {/* badge */}
        <div
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-700 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--ink-secondary)' }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: 'var(--success)' }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: 'var(--success)' }} />
          </span>
          Provisioning across AWS, Azure &amp; GCP
        </div>

        {/* monumental headline */}
        <h1
          className={`display-hero mt-7 mx-auto transition-all duration-1000 delay-100 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ color: 'var(--ink)', maxWidth: '12ch' }}
        >
          The cloud is your <em className="serif-it" style={{ letterSpacing: '-0.01em' }}>canvas</em>.
        </h1>

        {/* one quiet, concrete sentence */}
        <p
          className={`mt-6 mx-auto max-w-2xl text-base sm:text-lg leading-relaxed transition-all duration-1000 delay-200 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ color: 'var(--ink-muted)' }}
        >
          Design infrastructure visually. cloudweave writes production-ready Terraform as you
          draw, then ships it through a governed pipeline — plans reviewed, approvals recorded,
          drift caught.
        </p>

        {/* CTAs */}
        <div
          className={`mt-9 flex flex-wrap items-center justify-center gap-3.5 transition-all duration-1000 delay-300 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 h-12 px-7 rounded-full text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(180deg, #5b96ff 0%, var(--accent) 55%, #2c6ce8 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 8px 28px rgba(45,108,232,0.35)' }}
          >
            Open the dashboard
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <a
            href="#showcase"
            className="inline-flex items-center gap-2.5 h-12 px-6 rounded-full text-sm font-medium transition-colors"
            style={{ border: '1px solid var(--border-strong)', color: 'var(--ink-secondary)', background: 'var(--surface)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-secondary)')}
          >
            <Play className="w-3.5 h-3.5" />
            Watch it flow
          </a>
        </div>
      </div>

      {/* ---- the product IS the visual ---- */}
      <div
        className={`relative container-wide mt-16 transition-all duration-1000 delay-500 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div style={{ transform: `translateY(${-frameShift}px)` }}>
          <div className="browser-frame mx-auto" style={{ maxWidth: 1120 }}>
            <div className="browser-bar">
              <span className="browser-dot" />
              <span className="browser-dot" />
              <span className="browser-dot" />
              <span className="browser-url">cloudweave.app/dashboard</span>
              <span className="w-[46px]" />
            </div>
            <div style={{ height: 'clamp(320px, 44vw, 560px)' }}>
              <DashboardMock state="overview" />
            </div>
          </div>
          {/* floor reflection */}
          <div
            className="mx-auto mt-[-1px]"
            style={{
              maxWidth: 1120,
              height: 120,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.5), transparent 80%)',
              maskImage: 'linear-gradient(180deg, black, transparent 85%)',
              WebkitMaskImage: 'linear-gradient(180deg, black, transparent 85%)',
              transform: 'perspective(600px) rotateX(58deg) scale(0.96)',
              transformOrigin: 'top center',
              opacity: 0.35,
            }}
            aria-hidden
          />
        </div>

        {/* provider strip under the frame */}
        <div className="flex items-center justify-center gap-8 sm:gap-12 mt-4 opacity-70">
          <span className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--ink-muted)' }}>
            <ProviderIcon provider="AWS" size={16} /> AWS
          </span>
          <span className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--ink-muted)' }}>
            <ProviderIcon provider="AZURE" size={16} /> Azure
          </span>
          <span className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--ink-muted)' }}>
            <ProviderIcon provider="GCP" size={16} /> GCP
          </span>
          <span className="hidden sm:inline mono text-xs" style={{ color: 'var(--ink-faint)' }}>
            ·  Terraform  ·  OpenTofu-compatible output
          </span>
        </div>
      </div>

      {/* ---- proof bar (true facts, animated counters) ---- */}
      <div className="container-wide mt-14 sm:mt-20">
        <div className="grid grid-cols-2 md:grid-cols-4 border-y" style={{ borderColor: 'var(--border)' }}>
          {PROOF.map((p, i) => (
            <div
              key={p.label}
              className={`py-8 px-4 text-center ${i > 0 ? 'border-l' : ''} max-md:[&:nth-child(3)]:border-l-0 max-md:[&:nth-child(n+3)]:border-t`}
              style={{ borderColor: 'var(--border-faint)' }}
            >
              <div className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
                <Counter to={p.to} suffix={p.suffix} />
              </div>
              <div className="mt-1.5 text-xs" style={{ color: 'var(--ink-muted)' }}>{p.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
