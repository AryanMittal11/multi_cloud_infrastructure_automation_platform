'use client';

import React from 'react';
import {
  Bell,
  Boxes,
  Cloud,
  DollarSign,
  FolderGit2,
  Layers,
  Library,
  PenTool,
  Rocket,
  ScrollText,
  Search,
  Server,
  Waypoints,
} from 'lucide-react';
import { ProviderIcon } from '../../lib/provider-icon';

/* ============================================================
   DashboardMock — a faithful DOM recreation of the real
   /dashboard UI (same tokens, same nav groups, same density).
   Used as the product visual across landing sections.
   ============================================================ */

const NAV_GROUPS: { label: string; items: { icon: React.ElementType; label: string; active?: boolean }[] }[] = [
  {
    label: 'Overview',
    items: [{ icon: Boxes, label: 'Dashboard', active: true }],
  },
  {
    label: 'Deliver',
    items: [
      { icon: FolderGit2, label: 'Projects' },
      { icon: Library, label: 'Template Catalog' },
      { icon: PenTool, label: 'Visual Designer' },
      { icon: Layers, label: 'Saved Designs' },
      { icon: Rocket, label: 'Deployments' },
    ],
  },
  {
    label: 'Operate',
    items: [
      { icon: Server, label: 'Resources' },
      { icon: Waypoints, label: 'Topology' },
      { icon: DollarSign, label: 'Costs' },
    ],
  },
  {
    label: 'Trust',
    items: [
      { icon: Cloud, label: 'Cloud Accounts' },
      { icon: ScrollText, label: 'Audit Logs' },
    ],
  },
];

export function DashboardMock({ state = 'overview' }: { state?: 'overview' | 'design' | 'plan' | 'approved' }) {
  const states = {
    overview: {
      h1: 'Dashboard',
      sub: 'Infrastructure posture · live',
      badge: 'success' as const,
      badgeText: '3 succeeded',
      title: 'AWS EC2 Web Server · create',
      status: 'SUCCEEDED',
      statusColor: 'var(--success)',
      rail: ['PLAN', 'POLICY', 'APPR', 'APPLY'],
      railState: ['OK', 'OK', 'OK', 'OK'],
      bars: [46, 68, 40, 82, 58, 90, 52, 74, 44, 66, 84, 60],
    },
    design: {
      h1: 'Visual Designer',
      sub: 'three-tier web stack · draft',
      badge: 'run' as const,
      badgeText: 'terraform synced',
      title: 'network → compute → database',
      status: 'DRAFT',
      statusColor: 'var(--ink-muted)',
      rail: ['PLAN', 'POLICY', 'APPR', 'APPLY'],
      railState: ['···', '···', '···', '···'],
      bars: [30, 44, 62, 78, 52, 70, 88, 60, 76, 48, 64, 82],
    },
    plan: {
      h1: 'Deployments',
      sub: 'web-platform · staging',
      badge: 'warn' as const,
      badgeText: 'awaiting approval',
      title: 'AWS EC2 Web Server · create',
      status: 'AWAITING_APPROVAL',
      statusColor: 'var(--warn)',
      rail: ['PLAN', 'POLICY', 'APPR', 'APPLY'],
      railState: ['OK', 'OK', '···', '···'],
      bars: [50, 60, 46, 72, 66, 80, 58, 70, 54, 62, 76, 68],
    },
    approved: {
      h1: 'Deployments',
      sub: 'web-platform · production',
      badge: 'success' as const,
      badgeText: 'SUCCEEDED',
      title: 'AWS EC2 Web Server · create',
      status: 'SUCCEEDED',
      statusColor: 'var(--success)',
      rail: ['PLAN', 'POLICY', 'APPR', 'APPLY'],
      railState: ['OK', 'OK', 'OK', 'OK'],
      bars: [64, 78, 56, 88, 70, 92, 62, 84, 58, 74, 90, 80],
    },
  }[state];

  return (
    <div className="dash-mock" style={{ background: 'var(--bg)', color: 'var(--ink)', fontSize: 'var(--text-sm)' }}>
      <div className="flex h-full">
        {/* sidebar */}
        <aside className="mock-side w-[168px] flex-none border-r flex flex-col py-3 px-2.5 gap-0.5 overflow-hidden" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 px-2 h-8 mb-3">
            <span className="w-5 h-5 rounded-[6px] flex items-center justify-center" style={{ background: '#ffffff', border: '1px solid #ffffff' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.6" strokeLinecap="round">
                <path d="M12 2a10 10 0 1 0 10 10" />
                <circle cx="12" cy="12" r="3" fill="#0a0a0a" stroke="none" />
              </svg>
            </span>
            <span className="text-[12px] font-semibold">cloudweave</span>
          </div>
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-1.5">
              <div className="mono text-[7px] uppercase tracking-widest px-2 mb-1" style={{ color: 'var(--ink-faint)' }}>{group.label}</div>
              {group.items.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 h-[24px] px-2 rounded-[6px] text-[10px] font-medium"
                  style={{
                    background: item.active ? 'var(--accent-soft)' : undefined,
                    color: item.active ? 'var(--ink)' : 'var(--ink-muted)',
                  }}
                >
                  <item.icon size={10} />
                  <span className="truncate">{item.label}</span>
                </div>
              ))}
            </div>
          ))}
          <div className="mt-auto flex items-center gap-1.5 px-2 pt-3">
            <span className="dot dot-success" style={{ width: 6, height: 6 }} />
            <span className="mono text-[8.5px]" style={{ color: 'var(--ink-muted)' }}>control plane · live</span>
          </div>
        </aside>

        {/* main */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* topbar */}
          <div className="h-9 flex-none flex items-center gap-2.5 px-3.5 border-b" style={{ borderColor: 'var(--border)' }}>
            <span className="mono text-[9.5px]" style={{ color: 'var(--ink-faint)' }}>~/</span>
            <span className="text-[10.5px] font-medium">{states.h1.toLowerCase().replace(' ', '-')}</span>
            <div className="ml-auto flex items-center gap-2">
              <span className="search-mock flex items-center gap-1.5 h-[20px] px-2 rounded-[6px] text-[8.5px]" style={{ border: '1px solid var(--border)', color: 'var(--ink-muted)' }}>
                <Search size={8} /> Search… <span className="kbd" style={{ height: 12, minHeight: 12, fontSize: 7 }}>⌘K</span>
              </span>
              <Bell size={10} style={{ color: 'var(--ink-muted)' }} />
              <span className="avatar-mock w-[16px] h-[16px] rounded-full flex items-center justify-center text-[7px] font-bold" style={{ background: '#ffffff', color: '#0a0a0a' }}>MA</span>
            </div>
          </div>

          {/* content */}
          <div className="flex-1 p-3.5 overflow-hidden">
            <div className="flex items-end justify-between mb-3">
              <div>
                <div className="text-[15px] font-semibold tracking-tight">{states.h1}</div>
                <div className="text-[9px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>{states.sub}</div>
              </div>
              <div className="flex gap-1.5">
                <span className="h-[22px] px-2.5 rounded-[7px] text-[9px] font-semibold flex items-center" style={{ border: '1px solid var(--border-strong)', background: 'var(--surface-2)' }}>Refresh</span>
                <span className="h-[22px] px-2.5 rounded-[7px] text-[9px] font-semibold flex items-center" style={{ background: '#ffffff', color: '#0a0a0a' }}>New deployment</span>
              </div>
            </div>

            {/* stat tiles — mirror the real dashboard */}
            <div className="mock-stats grid grid-cols-4 gap-2 mb-3">
              {[
                { l: 'Active deployments', v: '6', d: '2 running', c: 'var(--ink-secondary)' },
                { l: 'Awaiting approval', v: '3', d: 'policy passed', c: 'var(--warn)' },
                { l: 'Recorded resources', v: '17', d: 'aws · azure', c: 'var(--ink-secondary)' },
                { l: 'Est. monthly cost', v: '$96', d: '2 projects', c: 'var(--ink-secondary)' },
              ].map((t) => (
                <div key={t.l} className="p-2 rounded-[10px]" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                  <div className="text-[8px]" style={{ color: 'var(--ink-muted)' }}>{t.l}</div>
                  <div className="text-[15px] font-semibold num mt-0.5">{t.v}</div>
                  <div className="mono text-[7.5px] num" style={{ color: t.c }}>{t.d}</div>
                </div>
              ))}
            </div>

            {/* pipeline stages + deployment row */}
            <div className="p-2.5 rounded-[10px] mb-2.5" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold">{states.title}</span>
                <span className="mono text-[8px] font-semibold" style={{ color: states.statusColor }}>{states.status}</span>
              </div>
              <div className="flex items-center">
                {states.rail.map((s, i) => {
                  const st = states.railState[i];
                  const cls = st === 'OK' ? 'pg-passed' : st === '···' ? 'pg-pending' : 'pg-running';
                  const conn = i === 0 ? '' : states.railState[i - 1] === 'OK' ? 'done' : '';
                  return (
                    <React.Fragment key={i}>
                      {i > 0 && <div className={`pg-conn ${conn}`} style={{ flexBasis: 22, marginTop: -14 }} />}
                      <div className={`pg-stage ${cls}`}>
                        <span className="pg-node" style={{ width: 20, height: 20, fontSize: 6.5 }}>{s}</span>
                        <span className="pg-meta" style={{ fontSize: 7 }}>{['plan', 'policy', 'approve', 'apply'][i]}</span>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="chip" style={{ height: 14, fontSize: 7.5, padding: '0 6px' }}>staging</span>
                  <span className="badge" style={{ height: 14, fontSize: 7.5, padding: '0 6px', color: `var(--${states.badge})`, background: `var(--${states.badge}-soft)` }}>
                    {states.badgeText}
                  </span>
                </div>
              </div>
            </div>

            {/* activity table + cost bars */}
            <div className="mock-duo grid grid-cols-[1.2fr_1fr] gap-2.5">
              <div className="p-2.5 rounded-[10px]" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <div className="text-[10px] font-semibold mb-1.5">Recent deployments</div>
                {[
                  { s: '#41', b: 'SUCCEEDED', t: 'AWS EC2 Web Server', c: 'var(--success)' },
                  { s: '#40', b: 'AWAITING_APPROVAL', t: 'GCP VPC Foundation', c: 'var(--warn)' },
                  { s: '#39', b: 'RUNNING', t: 'Azure VM Web Tier', c: 'var(--ink-secondary)' },
                  { s: '#38', b: 'SUCCEEDED', t: 'AWS RDS Postgres', c: 'var(--success)' },
                ].map((r) => (
                  <div key={r.s} className="flex items-center gap-2 h-[22px] border-t first:border-t-0" style={{ borderColor: 'var(--border-faint)' }}>
                    <span className="dot" style={{ width: 5, height: 5, background: r.c }} />
                    <span className="mono text-[9px]">{r.s}</span>
                    <span className="text-[9px] truncate" style={{ color: 'var(--ink-muted)' }}>{r.t}</span>
                    <span className="ml-auto mono text-[7.5px]" style={{ color: r.c }}>{r.b}</span>
                  </div>
                ))}
              </div>
              <div className="p-2.5 rounded-[10px]" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <div className="text-[10px] font-semibold mb-1.5">Cost by project</div>
                <div className="flex items-end gap-[3px] h-[64px]">
                  {states.bars.map((h, i) => (
                    <div key={i} className="flex-1 rounded-[2px]" style={{ height: `${h}%`, background: i % 6 === 2 ? 'rgba(255,255,255,0.35)' : '#ffffff', opacity: 0.9 }} />
                  ))}
                </div>
                <div className="flex justify-between mono text-[7px] mt-1" style={{ color: 'var(--ink-faint)' }}>
                  <span>web-platform</span><span>data-pipeline</span><span>sandbox</span>
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
  { x: '46%', y: 30, kind: 'NETWORK', label: 'prod-vpc', ref: 'aws_vpc' },
  { x: '18%', y: 118, kind: 'COMPUTE', label: 'web-01', ref: 'aws_ec2_web' },
  { x: '60%', y: 118, kind: 'DATABASE', label: 'app-db', ref: 'aws_rds' },
  { x: '37%', y: 206, kind: 'STORAGE', label: 'assets', ref: 'aws_s3' },
];

export function DesignerMock() {
  return (
    <div className="dash-mock" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      <div className="flex h-full flex-col">
        {/* toolbar */}
        <div className="h-9 flex-none flex items-center gap-2 px-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
          <span className="w-5 h-5 rounded-[6px] flex items-center justify-center" style={{ background: '#ffffff', border: '1px solid #ffffff' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.6" strokeLinecap="round">
              <path d="M12 2a10 10 0 1 0 10 10" />
              <circle cx="12" cy="12" r="3" fill="#0a0a0a" stroke="none" />
            </svg>
          </span>
          <span className="text-[11px] font-semibold">prod-web-stack</span>
          <div className="ml-auto flex items-center gap-1 text-[9px] font-bold">
            {['AWS', 'AZURE', 'GCP'].map((p, i) => (
              <span key={p} className="px-1.5 py-0.5 rounded-[5px]" style={{ background: i === 0 ? '#ffffff' : undefined, color: i === 0 ? '#0a0a0a' : 'var(--ink-muted)' }}>
                {p}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* palette */}
          <div className="w-[104px] flex-none border-r p-2 space-y-1.5" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
            <div className="mono text-[7.5px] uppercase tracking-widest px-1" style={{ color: 'var(--ink-faint)' }}>Resources</div>
            {['Network', 'Compute', 'Database', 'Storage'].map((r) => (
              <div key={r} className="flex items-center gap-1.5 h-[24px] px-1.5 rounded-[6px] text-[9px] font-medium" style={{ border: '1px dashed var(--border)', color: 'var(--ink-muted)' }}>
                <span className="w-2 h-2 rounded-[3px]" style={{ background: 'var(--ink-faint)' }} />
                {r}
              </div>
            ))}
          </div>

          {/* canvas */}
          <div className="flex-1 relative min-w-0" style={{ backgroundImage: 'radial-gradient(var(--grid-line) 1px, transparent 1px)', backgroundSize: '18px 18px' }}>
            <svg className="absolute inset-0 w-full h-full" aria-hidden>
              <defs>
                <marker id="mk-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.7)" />
                </marker>
              </defs>
              <path d="M 245 62 C 245 92, 150 92, 150 118" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" fill="none" markerEnd="url(#mk-arrow)" strokeDasharray="4 3" />
              <path d="M 245 62 C 245 92, 355 92, 355 118" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" fill="none" markerEnd="url(#mk-arrow)" strokeDasharray="4 3" />
              <path d="M 150 156 C 150 184, 240 182, 242 206" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" fill="none" markerEnd="url(#mk-arrow)" strokeDasharray="4 3" />
            </svg>
            {CANVAS_NODES.map((n) => (
              <div
                key={n.label}
                className="absolute rounded-[9px] border px-2.5 py-1.5"
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
