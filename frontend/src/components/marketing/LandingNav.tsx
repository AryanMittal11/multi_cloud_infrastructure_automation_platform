'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';

const LINKS = [
  { label: 'Showcase', href: '#showcase' },
  { label: 'Multi-cloud', href: '#multicloud' },
  { label: 'Operate', href: '#operate' },
  { label: 'Trust', href: '#trust' },
  { label: 'FAQ', href: '#faq' },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [drawer, setDrawer] = useState(false);

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

  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawer]);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled ? 'border-b' : 'border-b border-transparent'
      }`}
      style={{
        background: scrolled ? 'color-mix(in srgb, var(--bg) 86%, transparent)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px)' : undefined,
        WebkitBackdropFilter: scrolled ? 'blur(14px)' : undefined,
        borderColor: scrolled ? 'var(--border-faint)' : 'transparent',
      }}
    >
      <nav className="container-wide h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span
            className="w-7 h-7 rounded-[8px] flex items-center justify-center transition-transform group-hover:scale-105"
            style={{ background: '#ffffff', border: '1px solid #ffffff' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 2a10 10 0 1 0 10 10" />
              <circle cx="12" cy="12" r="3" fill="#0a0a0a" stroke="none" />
            </svg>
          </span>
          <span className="font-semibold tracking-tight text-[15px]" style={{ color: 'var(--ink)' }}>cloudweave</span>
        </Link>

        <div className="hidden md:flex items-center gap-0.5">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-3.5 py-2 rounded-[var(--r-sm)] text-[13px] font-medium transition-colors"
              style={{ color: 'var(--ink-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--ink)';
                e.currentTarget.style.background = 'var(--surface-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--ink-muted)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/login"
            className="hidden sm:inline-flex h-9 items-center px-4 text-[13px] font-medium rounded-[8px] transition-colors"
            style={{ color: 'var(--ink-secondary)' }}
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="group hidden sm:inline-flex items-center gap-1.5 h-9 px-4 rounded-[8px] text-[13px] font-semibold transition-all"
            style={{ background: '#ffffff', color: '#0a0a0a' }}
          >
            Launch
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <button
            className="icon-btn md:hidden"
            onClick={() => setDrawer(!drawer)}
            aria-label={drawer ? 'Close menu' : 'Open menu'}
            aria-expanded={drawer}
          >
            {drawer ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </nav>

      {/* scroll progress hairline */}
      <div
        className="absolute bottom-0 left-0 h-px transition-[width] duration-150"
        style={{ width: `${progress * 100}%`, opacity: scrolled ? 1 : 0, background: 'var(--accent)' }}
      />

      {/* mobile drawer */}
      <div
        className="fixed inset-0 z-40 md:hidden transition-opacity duration-300"
        style={{
          background: 'var(--bg)',
          opacity: drawer ? 1 : 0,
          pointerEvents: drawer ? 'auto' : 'none',
        }}
      >
        <div className="pt-24 px-6 flex flex-col gap-1">
          {LINKS.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setDrawer(false)}
              className="py-4 border-b text-2xl font-semibold tracking-tight transition-all"
              style={{
                borderColor: 'var(--border-faint)',
                color: 'var(--ink)',
                opacity: drawer ? 1 : 0,
                transform: drawer ? 'translateY(0)' : 'translateY(12px)',
                transitionDelay: `${i * 50}ms`,
              }}
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/dashboard"
            onClick={() => setDrawer(false)}
            className="btn btn-primary mt-8 justify-center"
          >
            Open the dashboard
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </header>
  );
}
