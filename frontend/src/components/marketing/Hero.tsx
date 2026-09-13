'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';
import { ProviderIcon } from '../../lib/provider-icon';

const TERRAFORM_LINES = [
  'module "prod_web_stack" {',
  '  source    = "./modules/web-service-stack"',
  '  provider  = "aws"',
  '  tier      = "medium"        # t3.medium',
  '  region    = "us-east-1"',
  '',
  '  networking {',
  '    vpc_cidr      = "10.0.0.0/16"',
  '    public_subnet = "10.0.1.0/24"',
  '    private_subnet= "10.0.2.0/24"',
  '  }',
  '',
  '  compute {',
  '    instance_type = "t3.medium"',
  '    encrypted     = true',
  '  }',
  '',
  '  database {',
  '    engine         = "postgres"',
  '    storage_gb     = 100',
  '  }',
  '}',
];

const LINE_COLORS = [
  'text-indigo-300',
  'text-slate-400',
  'text-slate-400',
  'text-slate-500',
  'text-slate-400',
  '',
  'text-emerald-300',
  'text-slate-400',
  'text-slate-400',
  'text-slate-400',
  '',
  'text-amber-300',
  'text-slate-400',
  'text-emerald-300',
  '',
  'text-amber-300',
  'text-slate-400',
  'text-slate-400',
  'text-indigo-300',
];

const ORBIT_RESOURCES = [
  { icon: '▲', label: 'EC2', color: 'text-amber-300 border-amber-500/30 bg-amber-500/10', radius: 150, duration: 26, delay: 0 },
  { icon: '◈', label: 'RDS', color: 'text-sky-300 border-sky-500/30 bg-sky-500/10', radius: 150, duration: 26, delay: -8.7 },
  { icon: '⬢', label: 'S3', color: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10', radius: 150, duration: 26, delay: -17.3 },
  { icon: '◇', label: 'VPC', color: 'text-indigo-300 border-indigo-500/30 bg-indigo-500/10', radius: 216, duration: 38, delay: 0 },
  { icon: '⬡', label: 'GKE', color: 'text-violet-300 border-violet-500/30 bg-violet-500/10', radius: 216, duration: 38, delay: -12.7 },
  { icon: '◆', label: 'GCS', color: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10', radius: 216, duration: 38, delay: -25.3 },
];

function useTypedLines(lines: string[], active: boolean) {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (lineIndex >= lines.length) {
      const restart = setTimeout(() => {
        setLineIndex(0);
        setCharIndex(0);
      }, 6000);
      return () => clearTimeout(restart);
    }
    const current = lines[lineIndex];
    if (charIndex < current.length) {
      const t = setTimeout(() => setCharIndex((c) => c + 1), 18 + Math.random() * 26);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setLineIndex((l) => l + 1);
        setCharIndex(0);
      }, 120);
      return () => clearTimeout(t);
    }
  }, [active, lineIndex, charIndex, lines]);

  return { lineIndex, charIndex };
}

export function Hero() {
  const [mounted, setMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const { lineIndex, charIndex } = useTypedLines(TERRAFORM_LINES, mounted);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Parallax: glows and visual drift at different rates
  const glowShift = scrollY * 0.18;
  const visualShift = scrollY * 0.1;
  const contentShift = scrollY * 0.32;

  return (
    <div className="relative overflow-hidden pt-36 pb-24 sm:pt-44 sm:pb-32">
      {/* Ambient parallax glows */}
      <div
        className="glow-orb w-[560px] h-[560px] bg-indigo-600/20 -top-40 -left-40 animate-float-slow"
        style={{ transform: `translateY(${glowShift}px)` }}
      />
      <div
        className="glow-orb w-[480px] h-[480px] bg-sky-500/12 top-20 -right-48 animate-float-slower"
        style={{ transform: `translateY(${-glowShift * 0.7}px)` }}
      />
      <div
        className="glow-orb w-[380px] h-[380px] bg-emerald-500/10 bottom-0 left-1/3 animate-pulse-glow"
        style={{ transform: `translateY(${-glowShift * 0.4}px)` }}
      />
      <div className="absolute inset-0 grid-bg" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-16 items-center">
          {/* Copy column */}
          <div style={{ transform: `translateY(${Math.min(contentShift * 0.15, 40)}px)` }}>
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.04] border border-white/10 text-slate-300 transition-all duration-1000 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              Now provisioning across AWS, Azure & GCP
            </div>

            <h1
              className={`mt-6 text-[42px] leading-[1.06] sm:text-6xl lg:text-[68px] font-extrabold tracking-[-0.03em] text-white transition-all duration-1000 delay-100 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              The cloud is
              <br />
              your <span className="text-gradient-accent">canvas</span>.
            </h1>

            <p
              className={`mt-6 text-lg text-slate-400 leading-relaxed max-w-xl transition-all duration-1000 delay-200 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              Design infrastructure visually. MultiCloud generates production-ready Terraform as
              you draw — with security guardrails, cost awareness, and approval gates built in
              from the first node you place.
            </p>

            <div
              className={`mt-9 flex flex-wrap items-center gap-4 transition-all duration-1000 delay-300 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-[#05070d] text-sm font-semibold hover:bg-indigo-50 transition-all shadow-xl shadow-white/10 hover:shadow-indigo-500/20"
              >
                Start building free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#designer"
                className="inline-flex items-center gap-2.5 px-5 py-3.5 rounded-xl text-sm font-medium text-slate-300 border border-white/10 hover:border-white/25 hover:text-white transition-all bg-white/[0.03]"
              >
                <Play className="w-3.5 h-3.5" />
                See it in motion
              </a>
            </div>

            {/* Proof bar */}
            <div
              className={`mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 transition-all duration-1000 delay-500 ${
                mounted ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div>
                <div className="text-2xl font-bold text-white">3</div>
                <div className="text-xs text-slate-500">cloud providers, one canvas</div>
              </div>
              <div className="w-px h-9 bg-white/10" />
              <div>
                <div className="text-2xl font-bold text-white">12+</div>
                <div className="text-xs text-slate-500">hardened Terraform modules</div>
              </div>
              <div className="w-px h-9 bg-white/10" />
              <div>
                <div className="text-2xl font-bold text-white">100%</div>
                <div className="text-xs text-slate-500">plans gated by approval</div>
              </div>
              <div className="w-px h-9 bg-white/10" />
              <div>
                <div className="text-2xl font-bold text-white">0</div>
                <div className="text-xs text-slate-500">credentials ever exposed</div>
              </div>
            </div>
          </div>

          {/* Visual column: orbiting resources + typing terraform */}
          <div
            className="relative hidden lg:block h-[560px] transition-all duration-1000 delay-300"
            style={{
              transform: `translateY(${visualShift}px)`,
              opacity: mounted ? 1 : 0,
            }}
          >
            {/* Center core */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative w-36 h-36">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 blur-xl opacity-40 animate-pulse-glow" />
                <div className="absolute inset-0 rounded-3xl border-gradient flex flex-col items-center justify-center gap-1.5">
                  <ProviderIcon provider="MULTI" size={34} />
                  <span className="text-[10px] font-bold text-slate-300 tracking-widest uppercase">Platform</span>
                  <span className="text-[9px] font-mono text-slate-500">control plane</span>
                </div>
              </div>
            </div>

            {/* Orbit rings */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border border-white/[0.06] animate-spin-slow" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[432px] h-[432px] rounded-full border border-white/[0.05] animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '55s' }} />

            {/* Orbiting resource chips */}
            {ORBIT_RESOURCES.map((res, i) => (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 animate-orbit"
                style={{ '--orbit-radius': `${res.radius}px`, '--orbit-duration': `${res.duration}s`, '--orbit-delay': `${res.delay}s` } as React.CSSProperties}
              >
                <div className={`-translate-x-1/2 -translate-y-1/2 px-3 py-2 rounded-xl border backdrop-blur-md flex items-center gap-2 ${res.color}`}>
                  <span className="text-sm leading-none">{res.icon}</span>
                  <span className="text-[11px] font-bold">{res.label}</span>
                </div>
              </div>
            ))}

            {/* Terraform typing card */}
            <div className="absolute right-0 bottom-0 w-[340px] rounded-2xl border border-white/10 bg-[#070b14]/90 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.06]">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                <span className="ml-2 text-[11px] font-mono text-slate-500">main.tf — generated live</span>
              </div>
              <div className="p-4 font-mono text-[11px] leading-[1.7] h-[280px] overflow-hidden">
                {TERRAFORM_LINES.slice(0, lineIndex + 1).map((line, i) => (
                  <div key={i} className={LINE_COLORS[i] || 'text-slate-400'}>
                    {i === lineIndex ? (
                      <>
                        <span className="text-slate-600">{i + 1}&nbsp;&nbsp;</span>
                        {line.slice(0, charIndex)}
                        <span className="animate-caret inline-block w-[7px] h-[13px] bg-indigo-400 align-[-2px] ml-0.5" />
                      </>
                    ) : (
                      <>
                        <span className="text-slate-600">{i + 1}&nbsp;&nbsp;</span>
                        {line}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade into next section */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-b from-transparent to-[#05070d]" />
    </div>
  );
}
