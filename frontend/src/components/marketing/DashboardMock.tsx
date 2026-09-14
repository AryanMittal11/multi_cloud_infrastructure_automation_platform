'use client';

import React from 'react';
import {
  LayoutDashboard,
  GitBranch,
  Workflow,
  Activity,
  AlertTriangle,
  Radio,
  LineChart,
  Settings as SettingsIcon,
  Search,
  Bell,
  Sun,
} from 'lucide-react';
import { ProviderIcon } from '../../lib/provider-icon';

/* ============================================================
   DashboardMock — a faithful DOM recreation of the real
   /dashboard UI (same tokens, same components, same density).
   Used as the product visual across landing sections.
   ============================================================ */

const NAV = [
  { icon: LayoutDashboard, label: 'Overview', active: false },
  { icon: GitBranch, label: 'Pipelines', active: true },
  { icon: Workflow, label: 'Deployments', active: false },
  { icon: Activity, label: 'Anomalies', active: false },
  { icon: AlertTriangle, label: 'Alerts', badge: 4, active: false },
  { icon: Radio, label: 'Environments', active: false },
  { icon: LineChart, label: 'Analytics', active: false },
  { icon: SettingsIcon, label: 'Settings', active: false },
];

export function DashboardMock({ state = 'overview' }: { state?: 'overview' | 'design' | 'plan' | 'approved' }) {
  const states = {
    overview: {
      h1: 'Overview',
      badge: 'success' as const,
      badgeText: 'successful',
      title: 'v2.14.3 → production',
      commit: '7d2f9a1',
      rail: ['OK', 'OK', 'OK', 'RUN'],
      bars: [46, 68, 40, 82, 58, 90, 52, 74, 44, 66, 84, 60],
    },
    design: {
      h1: 'Pipelines',
      badge: 'run' as const,
      badgeText: 'running',
      title: 'web-dashboard · run-1843',
      commit: 'b21a6c8',
      rail: ['OK', 'OK', 'RUN', '···'],
      bars: [30, 44, 62, 78, 52, 70, 88, 60, 76, 48, 64, 82],
    },
    plan: {
      h1: 'Deployments',
      badge: 'warn' as const,
      badgeText: 'in review',
      title: 'v2.14.3 · awaiting approval',
      commit: '7d2f9a1',
      rail: ['OK', 'OK', 'WAIT', '···'],
      bars: [50, 60, 46, 72, 66, 80, 58, 70, 54, 62, 76, 68],
    },
    approved: {
      h1: 'Deployments',
      badge: 'success' as const,
      badgeText: 'successful',
      title: 'v2.14.3 → production',
      commit: '7d2f9a1',
      rail: ['OK', 'OK', 'OK', 'OK'],
      bars: [64, 78, 56, 88, 70, 92, 62, 84, 58, 74, 90, 80],
    },
  }[state];

  return (
    <div className="dash-mock" style={{ background: 'var(--bg)', color: 'var(--ink)', fontSize: 'var(--text-sm)' }}>
      <div className="flex h-full">
        {/* sidebar */}
        <aside className="mock-side w-[168px] flex-none border-r flex flex-col py-3 px-2.5 gap-0.5" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 px-2 h-8 mb-3">
            <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent-strong)" strokeWidth="2.6" strokeLinecap="round">
                <path d="M12 2a10 10 0 1 0 10 10" />
                <circle cx="12" cy="12" r="3" fill="var(--accent)" stroke="none" />
              </svg>
            </span>
            <span className="text-[12px] font-semibold">CerebrOps</span>
          </div>
          {NAV.map((item) => (
            <div
              key={item.label}
              className="side-mock flex items-center gap-2 h-[26px] px-2 rounded-md text-[10.5px] font-medium"
              style={{
                background: item.active ? 'var(--accent-soft)' : undefined,
                color: item.active ? 'var(--accent-strong)' : 'var(--ink-muted)',
              }}
            >
              <item.icon size={11} />
              <span>{item.label}</span>
              {item.badge ? (
                <span className="ml-auto mono text-[8px] px-1 rounded-full" style={{ background: 'var(--fail-soft)', color: 'var(--fail)' }}>{item.badge}</span>
              ) : null}
            </div>
          ))}
          <div className="mt-auto flex items-center gap-1.5 px-2 pt-3">
            <span className="dot dot-success" style={{ width: 6, height: 6 }} />
            <span className="mono text-[8.5px]" style={{ color: 'var(--ink-muted)' }}>system · healthy</span>
          </div>
        </aside>

        {/* main */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* topbar */}
          <div className="h-9 flex-none flex items-center gap-2.5 px-3.5 border-b" style={{ borderColor: 'var(--border)' }}>
            <span className="mono text-[9.5px]" style={{ color: 'var(--ink-faint)' }}>~/</span>
            <span className="text-[10.5px] font-medium">{states.h1.toLowerCase()}</span>
            <div className="ml-auto flex items-center gap-2">
              <span className="search-mock flex items-center gap-1.5 h-[20px] px-2 rounded-md text-[8.5px]" style={{ border: '1px solid var(--border)', color: 'var(--ink-muted)' }}>
                <Search size={8} /> Search… <span className="kbd" style={{ height: 12, minHeight: 12, fontSize: 7 }}>⌘K</span>
              </span>
              <Bell size={10} style={{ color: 'var(--ink-muted)' }} />
              <Sun size={10} style={{ color: 'var(--ink-muted)' }} />
              <span className="avatar-mock w-[16px] h-[16px] rounded-full flex items-center justify-center text-[7px] font-bold" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>DU</span>
            </div>
          </div>

          {/* content */}
          <div className="flex-1 p-3.5 overflow-hidden">
            <div className="flex items-end justify-between mb-3">
              <div>
                <div className="text-[15px] font-semibold tracking-tight">{states.h1}</div>
                <div className="text-[9px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>Fleet-wide posture · live</div>
              </div>
              <div className="flex gap-1.5">
                <span className="h-[22px] px-2.5 rounded-full text-[9px] font-semibold flex items-center" style={{ border: '1px solid var(--border-strong)', background: 'var(--surface-2)' }}>Refresh</span>
                <span className="h-[22px] px-2.5 rounded-full text-[9px] font-semibold flex items-center text-white" style={{ background: 'linear-gradient(180deg,#5b96ff,var(--accent) 55%,#2c6ce8)' }}>Run</span>
              </div>
            </div>

            {/* stat tiles */}
            <div className="mock-stats grid grid-cols-4 gap-2 mb-3">
              {[
                { l: 'Successful runs', v: '31', d: '+6.2%', c: 'var(--success)' },
                { l: 'Deployments', v: '9', d: '+12.5%', c: 'var(--accent-strong)' },
                { l: 'Active alerts', v: '4', d: '1 paging', c: 'var(--warn)' },
                { l: 'Error rate', v: '0.9%', d: '−1.7%', c: 'var(--success)' },
              ].map((t) => (
                <div key={t.l} className="p-2 rounded-lg" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                  <div className="text-[8px]" style={{ color: 'var(--ink-muted)' }}>{t.l}</div>
                  <div className="text-[15px] font-semibold num mt-0.5">{t.v}</div>
                  <div className="mono text-[7.5px] num" style={{ color: t.c }}>{t.d}</div>
                </div>
              ))}
            </div>

            {/* stage rail + deployment row */}
            <div className="p-2.5 rounded-lg mb-2.5" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold">{states.title}</span>
                <span className="badge" style={{ height: 14, fontSize: 7.5, padding: '0 6px', color: `var(--${states.badge})`, background: `var(--${states.badge}-soft)` }}>
                  <span className={`dot dot-${states.badge}`} style={{ width: 4, height: 4 }} /> {states.badgeText}
                </span>
              </div>
              <div className="flex items-center">
                {states.rail.map((s, i) => {
                  const cls = s === 'OK' ? 'pg-passed' : s === 'RUN' ? 'pg-running' : 'pg-pending';
                  const conn = i === 0 ? '' : states.rail[i - 1] === 'OK' ? 'done' : states.rail[i - 1] === 'RUN' ? 'active' : '';
                  return (
                    <React.Fragment key={i}>
                      {i > 0 && <div className={`pg-conn ${conn}`} style={{ flexBasis: 22, marginTop: -14 }} />}
                      <div className={`pg-stage ${cls}`}>
                        <span className="pg-node" style={{ width: 20, height: 20, fontSize: 7.5 }}>{s}</span>
                        <span className="pg-meta" style={{ fontSize: 7.5 }}>{['build', 'test', 'plan', 'apply'][i]}</span>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="chip" style={{ height: 14, fontSize: 7.5, padding: '0 6px' }}>production</span>
                  <span className="row-commit" style={{ fontSize: 8, padding: '0 6px' }}>{states.commit}</span>
                </div>
              </div>
            </div>

            {/* activity table + throughput */}
            <div className="mock-duo grid grid-cols-[1.2fr_1fr] gap-2.5">
              <div className="p-2.5 rounded-lg" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <div className="text-[10px] font-semibold mb-1.5">Recent activity</div>
                {[
                  { s: 'run-1843', b: 'running', t: 'web-dashboard', c: 'var(--run)' },
                  { s: 'dep-9308', b: 'successful', t: 'v2.14.3', c: 'var(--success)' },
                  { s: 'anom-1', b: 'page', t: 'gateway p95', c: 'var(--fail)' },
                  { s: 'alg-2', b: 'acknowledged', t: 'SLO fast-burn', c: 'var(--run)' },
                ].map((r) => (
                  <div key={r.s} className="flex items-center gap-2 h-[22px] border-t first:border-t-0" style={{ borderColor: 'var(--border-faint)' }}>
                    <span className="dot" style={{ width: 5, height: 5, background: r.c }} />
                    <span className="mono text-[9px]">{r.s}</span>
                    <span className="text-[9px]" style={{ color: 'var(--ink-muted)' }}>{r.t}</span>
                    <span className="ml-auto mono text-[8px]" style={{ color: 'var(--ink-faint)' }}>{r.b}</span>
                  </div>
                ))}
              </div>
              <div className="p-2.5 rounded-lg" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <div className="text-[10px] font-semibold mb-1.5">Run throughput</div>
                <div className="flex items-end gap-[3px] h-[64px]">
                  {states.bars.map((h, i) => (
                    <div key={i} className="flex-1 rounded-[2px]" style={{ height: `${h}%`, background: i % 5 === 2 ? 'var(--fail)' : 'var(--accent)', opacity: 0.85 }} />
                  ))}
                </div>
                <div className="flex justify-between mono text-[7px] mt-1" style={{ color: 'var(--ink-faint)' }}>
                  <span>00:00</span><span>12:00</span><span>now</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   DesignerMock — the visual canvas (for the designer section)
   ============================================================ */

const CANVAS_NODES = [
  { x: '46%', y: 30, kind: 'NETWORK', label: 'prod-vpc', ref: 'aws_vpc', tone: 'sky' },
  { x: '18%', y: 118, kind: 'COMPUTE', label: 'web-01', ref: 'aws_ec2_web', tone: 'amber' },
  { x: '60%', y: 118, kind: 'DATABASE', label: 'app-db', ref: 'aws_rds', tone: 'indigo' },
  { x: '37%', y: 206, kind: 'STORAGE', label: 'assets', ref: 'aws_s3', tone: 'emerald' },
];

export function DesignerMock() {
  return (
    <div className="dash-mock" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      <div className="flex h-full flex-col">
        {/* toolbar */}
        <div className="h-9 flex-none flex items-center gap-2 px-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
          <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent-strong)" strokeWidth="2.6" strokeLinecap="round">
              <path d="M12 2a10 10 0 1 0 10 10" />
              <circle cx="12" cy="12" r="3" fill="var(--accent)" stroke="none" />
            </svg>
          </span>
          <span className="text-[11px] font-semibold">prod-web-stack</span>
          <div className="ml-auto flex items-center gap-1 text-[9px] font-bold">
            {['AWS', 'AZURE', 'GCP'].map((p, i) => (
              <span key={p} className="px-1.5 py-0.5 rounded" style={{ background: i === 0 ? 'var(--accent-soft)' : undefined, color: i === 0 ? 'var(--accent-strong)' : 'var(--ink-muted)' }}>
                {p}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* palette */}
          <div className="w-[104px] flex-none border-r p-2 space-y-1.5" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
            <div className="mono text-[7.5px] uppercase tracking-widest px-1" style={{ color: 'var(--ink-faint)' }}>Resources</div>
            {['Network', 'Compute', 'Database', 'Storage'].map((r, i) => (
              <div key={r} className="flex items-center gap-1.5 h-[24px] px-1.5 rounded-md text-[9px] font-medium" style={{ border: '1px dashed var(--border)', color: 'var(--ink-muted)' }}>
                <span className="w-2 h-2 rounded-[3px]" style={{ background: ['var(--run)', 'var(--warn)', 'var(--accent)', 'var(--success)'][i] }} />
                {r}
              </div>
            ))}
          </div>

          {/* canvas */}
          <div className="flex-1 relative min-w-0" style={{ backgroundImage: 'radial-gradient(var(--grid-line) 1px, transparent 1px)', backgroundSize: '18px 18px' }}>
            <svg className="absolute inset-0 w-full h-full" aria-hidden>
              <defs>
                <marker id="mk-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" opacity="0.75" />
                </marker>
              </defs>
              <path d="M 245 62 C 245 92, 150 92, 150 118" stroke="var(--accent)" strokeWidth="1.4" fill="none" opacity="0.6" markerEnd="url(#mk-arrow)" strokeDasharray="4 3" />
              <path d="M 245 62 C 245 92, 355 92, 355 118" stroke="var(--accent)" strokeWidth="1.4" fill="none" opacity="0.6" markerEnd="url(#mk-arrow)" strokeDasharray="4 3" />
              <path d="M 150 156 C 150 184, 240 182, 242 206" stroke="var(--accent)" strokeWidth="1.4" fill="none" opacity="0.45" markerEnd="url(#mk-arrow)" strokeDasharray="4 3" />
            </svg>
            {CANVAS_NODES.map((n) => (
              <div
                key={n.label}
                className="absolute rounded-lg border px-2.5 py-1.5"
                style={{
                  left: n.x,
                  top: n.y,
                  background: 'var(--surface-2)',
                  borderColor: 'var(--border-strong)',
                  minWidth: 96,
                }}
              >
                <div className="mono text-[6.5px] tracking-widest" style={{ color: 'var(--ink-muted)' }}>{n.kind}</div>
                <div className="text-[11px] font-bold leading-tight">{n.label}</div>
                <div className="mono text-[7px]" style={{ color: 'var(--ink-faint)' }}>{n.ref}</div>
              </div>
            ))}
          </div>

          {/* code panel */}
          <div className="mock-code w-[172px] flex-none border-l flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
            <div className="h-7 flex items-center px-2.5 border-b mono text-[8px]" style={{ borderColor: 'var(--border)', color: 'var(--ink-muted)' }}>main.tf — live</div>
            <pre className="p-2.5 mono text-[7.5px] leading-[1.7] overflow-hidden" style={{ color: 'var(--ink-secondary)' }}>
{`module "prod_vpc" {
  source = "./aws_vpc"
  cidr   = "10.0.0.0/16"
}

module "web" {
  source     = "./aws_ec2_web"
  depends_on = [prod_vpc]
  tier       = "small"
}

module "app_db" {
  source     = "./aws_rds"
  depends_on = [prod_vpc]
  storage_gb = 100
}`}
            </pre>
            <div className="mt-auto flex items-center gap-1.5 px-2.5 py-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse-glow" style={{ background: 'var(--success)' }} />
              <span className="text-[8px] font-medium" style={{ color: 'var(--success)' }}>Terraform synced</span>
              <ProviderIcon provider="AWS" size={9} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
