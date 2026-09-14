'use client';

import React from 'react';
import Link from 'next/link';
import { CloudCog, ShieldCheck, Workflow, Waypoints } from 'lucide-react';

/**
 * Shared split-panel chrome for the auth pages: brand story on the left,
 * form card on the right. Light theme matches the app shell tokens.
 */
export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Brand panel */}
      <aside
        className="hidden lg:flex flex-col justify-between w-[44%] max-w-[560px] flex-none p-10"
        style={{
          background: 'linear-gradient(160deg, var(--accent-soft) 0%, var(--bg) 45%)',
          borderRight: '1px solid var(--border-faint)',
        }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <span
            className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center"
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-strong)" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 2a10 10 0 1 0 10 10" />
              <circle cx="12" cy="12" r="3" fill="var(--accent)" stroke="none" />
            </svg>
          </span>
          <span className="font-semibold text-[17px] tracking-tight" style={{ color: 'var(--ink)' }}>
            cloudweave
          </span>
        </Link>

        <div>
          <h1 className="text-[32px] leading-[1.1] tracking-tight" style={{ color: 'var(--ink)' }}>
            The control plane for
            <br />
            multi-cloud infrastructure.
          </h1>
          <p className="text-sm mt-4 max-w-[400px]" style={{ color: 'var(--ink-secondary)' }}>
            Select a verified template, review the provider-specific plan, pass the policy gate,
            approve, and let the isolated worker apply it — with a full audit trail.
          </p>

          <ul className="mt-8 space-y-3.5">
            {[
              { icon: Workflow, title: 'Gated pipeline', sub: 'Plan → policy → explicit approval → apply' },
              { icon: CloudCog, title: 'AWS · Azure · GCP', sub: 'Portable templates, provider-specific plans' },
              { icon: Waypoints, title: 'Live topology', sub: 'Resources and dependencies after every apply' },
              { icon: ShieldCheck, title: 'Audited by default', sub: 'Who did what, and when — immutable trail' },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.title} className="flex items-start gap-3">
                  <span
                    className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-none mt-0.5"
                    style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', color: 'var(--accent-strong)' }}
                  >
                    <Icon size={15} />
                  </span>
                  <span>
                    <span className="block text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>{f.title}</span>
                    <span className="block text-xs" style={{ color: 'var(--ink-muted)' }}>{f.sub}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="text-[11px] mono" style={{ color: 'var(--ink-faint)' }}>
          cloudweave · multi-cloud infrastructure automation platform
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[400px]">
          {/* compact brand for mobile */}
          <Link href="/" className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <span
              className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-strong)" strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 2a10 10 0 1 0 10 10" />
                <circle cx="12" cy="12" r="3" fill="var(--accent)" stroke="none" />
              </svg>
            </span>
            <span className="font-semibold text-[17px] tracking-tight" style={{ color: 'var(--ink)' }}>
              cloudweave
            </span>
          </Link>

          <h2 className="text-[26px] tracking-tight" style={{ color: 'var(--ink)' }}>{title}</h2>
          <p className="text-sm mt-1.5 mb-7" style={{ color: 'var(--ink-muted)' }}>{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
