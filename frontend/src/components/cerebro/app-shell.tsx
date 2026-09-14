'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  Bell,
  ChevronDown,
  ChevronLeft,
  Copy,
  GitBranch,
  LayoutDashboard,
  LineChart,
  Menu,
  Moon,
  Radio,
  Settings as SettingsIcon,
  Sun,
  Workflow,
  X,
} from 'lucide-react';
import { Dropdown, MenuItem } from './ui-kit';
import { notifications, timeAgo } from '../../lib/cerebro/mock-data';
import { CommandPalette, usePalette } from './command-palette';

/* ============================================================
   Palette open context — lets the topbar button open it
   ============================================================ */

const PaletteCtx = createContext<{ open: () => void }>({ open: () => {} });
export const usePaletteOpener = () => useContext(PaletteCtx);

/* ============================================================
   Navigation model
   ============================================================ */

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number | string }>;
  badge?: number;
  match: (path: string) => boolean;
}

const eq = (href: string) => (path: string) => path === href;
const starts = (href: string) => (path: string) => path === href || path.startsWith(href + '/');

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, match: eq('/dashboard') },
      { label: 'Pipelines', href: '/dashboard/pipelines', icon: GitBranch, match: starts('/dashboard/pipelines') },
      { label: 'Deployments', href: '/dashboard/deployments', icon: Workflow, match: starts('/dashboard/deployments') },
      { label: 'Anomalies', href: '/dashboard/anomalies', icon: Activity, match: starts('/dashboard/anomalies') },
      { label: 'Alerts', href: '/dashboard/alerts', icon: AlertTriangle, badge: 4, match: starts('/dashboard/alerts') },
    ],
  },
  {
    label: 'Manage',
    items: [
      { label: 'Environments', href: '/dashboard/environments', icon: Radio, match: starts('/dashboard/environments') },
      { label: 'Analytics', href: '/dashboard/analytics', icon: LineChart, match: starts('/dashboard/analytics') },
      { label: 'Settings', href: '/dashboard/settings', icon: SettingsIcon, match: starts('/dashboard/settings') },
    ],
  },
];

/* ============================================================
   Breadcrumbs
   ============================================================ */

const CRUMB_NAMES: Record<string, string> = {
  dashboard: 'overview',
  pipelines: 'pipelines',
  deployments: 'deployments',
  anomalies: 'anomalies',
  alerts: 'alerts',
  environments: 'environments',
  analytics: 'analytics',
  settings: 'settings',
};

function useCrumbs(): string[] {
  const pathname = usePathname();
  return useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts[0] === 'dashboard' && parts.length === 1) return ['overview'];
    return parts.map((p) => CRUMB_NAMES[p] ?? p);
  }, [pathname]);
}

/* ============================================================
   Theme
   ============================================================ */

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => {
    const stored = window.localStorage.getItem('cerebro-theme');
    if (stored === 'light' || stored === 'dark') setTheme(stored);
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('cerebro-theme', theme);
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) };
}

/* ============================================================
   Sidebar
   ============================================================ */

function SidebarContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      {/* brand */}
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className={`flex items-center gap-2.5 h-[52px] flex-none px-4 border-b ${collapsed ? 'justify-center px-0' : ''}`}
        style={{ borderColor: 'var(--border-faint)', color: 'var(--ink)' }}
        title="CerebrOps"
      >
        <span
          className="w-[26px] h-[26px] rounded-[8px] flex items-center justify-center flex-none"
          style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent-strong)" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 2a10 10 0 1 0 10 10" />
            <circle cx="12" cy="12" r="3" fill="var(--accent)" stroke="none" />
          </svg>
        </span>
        {!collapsed && (
          <>
            <span className="font-semibold text-[15px] tracking-tight">CerebrOps</span>
            <span className="chip" style={{ marginLeft: 'auto', height: 20, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              demo
            </span>
          </>
        )}
      </Link>

      {/* nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-0.5" aria-label="Primary">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="side-label">{group.label}</p>
            )}
            {collapsed && <div className="h-3" />}
            {group.items.map((item) => {
              const active = item.match(pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`side-link ${active ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={16} />
                  {!collapsed && <span>{item.label}</span>}
                  {!collapsed && item.badge ? (
                    <span className="side-count">{item.badge}</span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* foot: system status */}
      <div
        className={`flex-none border-t px-4 py-3 flex items-center justify-between gap-2 ${collapsed ? 'justify-center px-0' : ''}`}
        style={{ borderColor: 'var(--border-faint)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="dot dot-success flex-none" />
          {!collapsed && (
            <span className="mono text-[11px] truncate" style={{ color: 'var(--ink-muted)' }}>
              system · healthy
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Topbar
   ============================================================ */

function Topbar({
  onHamburger,
  collapsed,
  onToggleCollapse,
}: {
  onHamburger: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const crumbs = useCrumbs();
  const { open } = usePaletteOpener();
  const { theme, toggle } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const unread = notifications.filter((n) => n.unread).length;

  return (
    <header
      className="topbar sticky top-0 z-40 flex items-center gap-3 h-[52px] flex-none px-4 border-b"
      style={{
        borderColor: 'var(--border)',
        background: 'color-mix(in srgb, var(--bg) 88%, transparent)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      {/* hamburger (mobile) */}
      <button className="icon-btn md:hidden" onClick={onHamburger} aria-label="Open navigation">
        <Menu size={17} />
      </button>

      {/* collapse (desktop) */}
      <button className="icon-btn hidden md:inline-flex" onClick={onToggleCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        <ChevronLeft size={16} style={{ transform: collapsed ? 'rotate(180deg)' : undefined, transition: 'transform var(--dur) var(--ease-out)' }} />
      </button>

      {/* breadcrumb */}
      <div className="crumb flex items-center gap-2 text-sm font-medium min-w-0 hidden sm:flex">
        <span className="mono" style={{ color: 'var(--ink-faint)' }}>~/</span>
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-2 min-w-0">
            {i > 0 && <span style={{ color: 'var(--ink-faint)' }}>/</span>}
            <span className={`truncate ${i === crumbs.length - 1 ? '' : ''}`} style={{ color: i === crumbs.length - 1 ? 'var(--ink)' : 'var(--ink-muted)' }}>
              {c}
            </span>
          </span>
        ))}
      </div>

      {/* right cluster */}
      <div className="ml-auto flex items-center gap-2">
        {/* search trigger */}
        <button
          className="search-trigger hidden sm:inline-flex items-center gap-2 h-[30px] px-3 rounded-[var(--r-sm)] text-xs transition-colors"
          style={{
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--ink-muted)',
          }}
          onClick={open}
          aria-label="Search (Command K)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <span>Search…</span>
          <span className="kbd ml-3">⌘K</span>
        </button>
        <button className="icon-btn sm:hidden" onClick={open} aria-label="Search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </button>

        {/* theme */}
        <button className="icon-btn" onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* notifications */}
        <div className="relative">
          <button
            className="icon-btn"
            onClick={() => setNotifOpen(!notifOpen)}
            aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
            aria-expanded={notifOpen}
          >
            <Bell size={16} />
            {unread > 0 && (
              <span
                className="absolute rounded-full num"
                style={{
                  top: 2,
                  right: 2,
                  minWidth: 14,
                  height: 14,
                  padding: '0 3px',
                  background: 'var(--fail)',
                  color: '#fff',
                  fontSize: 9,
                  fontFamily: 'var(--font-mono)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid var(--bg)',
                }}
              >
                {unread}
              </span>
            )}
          </button>
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} aria-hidden />
              <div
                className="absolute right-0 z-50 mt-1.5 w-[340px] max-h-[440px] overflow-y-auto rounded-[var(--r-md)] shadow-2xl"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', animation: 'palette-in 160ms var(--ease-out)' }}
                role="menu"
                aria-label="Notifications"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b text-sm font-semibold" style={{ borderColor: 'var(--border)' }}>
                  Notifications
                  <span className="chip">{unread} new</span>
                </div>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex gap-3 px-4 py-3 border-b last:border-b-0"
                    style={{
                      borderColor: 'var(--border-faint)',
                      background: n.unread ? 'var(--accent-soft)' : undefined,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-1.5 flex-none"
                      style={{
                        background:
                          n.tone === 'success' ? 'var(--success)' : n.tone === 'fail' ? 'var(--fail)' : n.tone === 'warn' ? 'var(--warn)' : 'var(--accent)',
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{n.title}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--ink-muted)' }}>{n.sub}</p>
                      <p className="mono text-[10px] mt-1" style={{ color: 'var(--ink-faint)' }}>{timeAgo(n.at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* user chip */}
        <Dropdown
          width={220}
          trigger={() => (
            <span
              className="flex items-center gap-2 pl-0.5 pr-1 py-0.5 rounded-full text-xs"
              style={{ border: '1px solid var(--border)', color: 'var(--ink-secondary)' }}
            >
              <span
                className="avatar w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-semibold uppercase"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                du
              </span>
              <span className="hidden lg:inline font-medium">Demo User</span>
              <ChevronDown size={13} style={{ color: 'var(--ink-muted)' }} />
            </span>
          )}
        >
          {(close) => (
            <>
              <div className="px-3 py-2 border-b mb-1" style={{ borderColor: 'var(--border-faint)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Demo User</p>
                <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>demo@cerebrops.io</p>
              </div>
              <MenuItem icon={<SettingsIcon size={14} />} label="Workspace settings" onClick={close} />
              <MenuItem icon={<Copy size={14} />} label="Copy demo API key" sub="cerebro_sk_…demo" onClick={close} />
              <MenuItem icon={<X size={14} />} label="Sign out" onClick={close} />
            </>
          )}
        </Dropdown>
      </div>
    </header>
  );
}

/* ============================================================
   Mobile bottom tabbar
   ============================================================ */

function Tabbar() {
  const pathname = usePathname();
  const { open } = usePaletteOpener();
  const items = [
    { label: 'Home', href: '/dashboard', icon: LayoutDashboard, active: pathname === '/dashboard' },
    { label: 'Pipelines', href: '/dashboard/pipelines', icon: GitBranch, active: pathname.startsWith('/dashboard/pipelines') },
    { label: 'Deploys', href: '/dashboard/deployments', icon: Workflow, active: pathname.startsWith('/dashboard/deployments') },
    { label: 'Alerts', href: '/dashboard/alerts', icon: AlertTriangle, active: pathname.startsWith('/dashboard/alerts') },
  ];
  return (
    <nav
      className="tabbar fixed left-0 right-0 bottom-0 z-40 md:hidden flex items-stretch justify-around gap-0.5"
      style={{
        height: 62,
        padding: '4px 6px max(6px, env(safe-area-inset-bottom))',
        background: 'color-mix(in srgb, var(--bg-elevated) 90%, transparent)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border)',
      }}
      aria-label="Primary mobile"
    >
      {items.slice(0, 2).map((it) => (
        <TabItem key={it.href} {...it} />
      ))}
      <button
        className="tab-fab self-center w-[50px] h-[50px] flex-none rounded-full flex items-center justify-center"
        style={{
          marginTop: -18,
          background: 'linear-gradient(180deg, #5b96ff 0%, var(--accent) 55%, #2c6ce8 100%)',
          color: '#fff',
          border: '3px solid var(--bg)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 8px 26px rgba(45,108,232,0.45)',
        }}
        onClick={open}
        aria-label="Run pipeline"
        title="Run pipeline"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5z" /></svg>
      </button>
      {items.slice(2).map((it) => (
        <TabItem key={it.href} {...it} />
      ))}
    </nav>
  );
}

function TabItem({ label, href, icon: Icon, active }: { label: string; href: string; icon: React.ComponentType<{ size?: number | string }>; active: boolean }) {
  return (
    <Link
      href={href}
      className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 rounded-[var(--r-md)] text-[9.5px] font-semibold transition-colors"
      style={{ color: active ? 'var(--accent-strong)' : 'var(--ink-muted)' }}
      aria-current={active ? 'page' : undefined}
    >
      <Icon size={19} />
      <span>{label}</span>
    </Link>
  );
}

/* ============================================================
   AppShell
   ============================================================ */

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const stored = window.localStorage.getItem('cerebro-side-collapsed');
    if (stored === '1') setCollapsed(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // close drawer on route change
  useEffect(() => setMobileOpen(false), [pathname]);

  const toggleCollapse = () => {
    setCollapsed((c) => {
      window.localStorage.setItem('cerebro-side-collapsed', c ? '0' : '1');
      return !c;
    });
  };

  return (
    <PaletteCtx.Provider value={{ open: () => setPaletteOpen(true) }}>
      <div className="flex h-screen overflow-hidden">
        {/* desktop sidebar */}
        <aside
          className="hidden md:flex flex-col flex-none h-full transition-[width]"
          style={{
            width: collapsed ? 64 : 236,
            background: 'var(--bg-elevated)',
            borderRight: '1px solid var(--border)',
            transitionDuration: '320ms',
            transitionTimingFunction: 'var(--ease-out)',
            zIndex: 40,
          }}
          aria-label="Sidebar"
        >
          <SidebarContent collapsed={collapsed} />
        </aside>

        {/* mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.5)' }}
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <aside
              className="absolute left-0 top-0 bottom-0 w-[248px] flex flex-col shadow-2xl"
              style={{
                background: 'var(--bg-elevated)',
                borderRight: '1px solid var(--border)',
                animation: 'drawer-in 240ms var(--ease-out)',
              }}
              aria-label="Sidebar"
            >
              <button
                className="absolute right-2 top-3 icon-btn z-10"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
              >
                <X size={16} />
              </button>
              <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        {/* main column */}
        <div className="flex-1 min-w-0 flex flex-col h-screen">
          <Topbar onHamburger={() => setMobileOpen(true)} collapsed={collapsed} onToggleCollapse={toggleCollapse} />
          <main
            key={pathname}
            className="flex-1 overflow-y-auto page-enter"
            style={{ paddingBottom: 64 }}
            tabIndex={-1}
          >
            <div className="mx-auto w-full" style={{ maxWidth: 1280, padding: 'var(--sp-5) var(--sp-4) var(--sp-8)' }}>
              {children}
            </div>
          </main>
        </div>

        {/* mobile tabbar */}
        <Tabbar />

        {/* command palette */}
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
      <style jsx global>{`
        @keyframes drawer-in {
          from { transform: translateX(-100%); }
        }
        @media (max-width: 767px) {
          main { padding-bottom: 76px; }
        }
      `}</style>
    </PaletteCtx.Provider>
  );
}

/* ============================================================
   PageHeader
   ============================================================ */

export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
      <div className="min-w-0">
        <h1 className="text-[26px] tracking-tight" style={{ color: 'var(--ink)' }}>
          {title}
        </h1>
        {sub && (
          <p className="text-sm mt-1" style={{ color: 'var(--ink-muted)' }}>
            {sub}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
