'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cloud, ArrowRight } from 'lucide-react';

const LINKS = [
  { label: 'Platform', href: '#platform' },
  { label: 'Designer', href: '#designer' },
  { label: 'Integrations', href: '#integrations' },
  { label: 'Security', href: '#security' },
  { label: 'FAQ', href: '#faq' },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#05070d]/85 backdrop-blur-xl border-b border-white/[0.06]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      {/* Scroll progress hairline */}
      <div
        className="absolute bottom-0 left-0 h-px bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 transition-[width] duration-150"
        style={{ width: `${progress * 100}%`, opacity: scrolled ? 1 : 0 }}
      />

      <nav className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Cloud className="w-4 h-4 text-white" strokeWidth={2.2} />
          </span>
          <span className="font-bold tracking-tight text-white">MultiCloud</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-slate-300 font-mono">
            v2.0
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard"
            className="hidden sm:inline-flex px-3.5 py-2 rounded-lg text-[13px] font-medium text-slate-300 hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-[#05070d] text-[13px] font-semibold hover:bg-indigo-50 transition-colors shadow-lg shadow-white/10"
          >
            Start building
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </nav>
    </header>
  );
}
