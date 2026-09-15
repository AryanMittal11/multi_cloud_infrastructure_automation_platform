'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  Boxes,
  ChevronDown,
  ChevronLeft,
  Cloud,
  DollarSign,
  FolderGit2,
  Layers,
  Library,
  LogOut,
  Menu,
  PenTool,
  Rocket,
  ScrollText,
  Server,
  Users,
  Waypoints,
  X,
} from 'lucide-react';
import { Dropdown } from './ui-kit';
import { api, AuditLog } from '../../lib/api';
import { useAuth } from '../../context/auth-context';
import { timeAgo } from '../../lib/format';
import { CommandPalette } from './command-palette';

/* ============================================================
   Palette open context — lets the topbar button open it
   ============================================================ */

const PaletteCtx = createContext<{ open: () => void }>({ open: () => {} });
export const usePaletteOpener = () => useContext(PaletteCtx);

/* ============================================================
   Navigation model — the real platform surfaces (PDF §12)
   ============================================================ */

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number | string }>;
  match: (path: string) => boolean;
}

const eq = (href: string) => (path: string) => path === href;
const starts = (href: string) => (path: string) => path === href || path.startsWith(href + '/');

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: Boxes, match: eq('/dashboard') },
    ],
  },
  {
    label: 'Deliver',
    items: [
      { label: 'Projects', href: '/projects', icon: FolderGit2, match: starts('/projects') },
      { label: 'Template Catalog', href: '/templates', icon: Library, match: starts('/templates') },
      { label: 'Visual Designer', href: '/designer', icon: PenTool, match: starts('/designer') },
      { label: 'Saved Designs', href: '/architectures', icon: Layers, match: starts('/architectures') },
      { label: 'Deployments', href: '/deployments', icon: Rocket, match: starts('/deployments') },
    ],
  },
  {
    label: 'Operate',
    items: [
      { label: 'Resources', href: '/resources', icon: Server, match: starts('/resources') },
      { label: 'Topology', href: '/topology', icon: Waypoints, match: starts('/topology') },
      { label: 'Costs', href: '/costs', icon: DollarSign, match: starts('/costs') },
    ],
  },
  {
    label: 'Trust',
    items: [
      { label: 'Cloud Accounts', href: '/cloud-accounts', icon: Cloud, match: starts('/cloud-accounts') },
      { label: 'Audit Logs', href: '/audit-logs', icon: ScrollText, match: starts('/audit-logs') },
    ],
  },
];

/** Admin-only nav items (site owner) */
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'User Management', href: '/users', icon: Users, match: starts('/users') },
];

/* ============================================================
   Breadcrumbs
   ============================================================ */

function useCrumbs(): string[] {
  const pathname = usePathname();
  return useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts[0] === 'dashboard' && parts.length === 1) return ['dashboard'];
    return parts;
  }, [pathname]);
}

/* ============================================================
   Theme — light is the single theme; normalize any stale override
   ============================================================ */

function useLightTheme() {
  useEffect(() => {
    if (document.documentElement.getAttribute('data-theme')) {
      document.documentElement.removeAttribute('data-theme');
    }
    window.localStorage.removeItem('cerebro-theme');
  }, []);
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
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="flex flex-col h-full">
      {/* brand */}
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className={`flex items-center gap-2.5 h-[52px] flex-none px-4 border-b ${collapsed ? 'justify-center px-0' : ''}`}
        style={{ borderColor: 'var(--border-faint)', color: 'var(--ink)' }}
        title="cloudweave"
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
          <span className="font-semibold text-[15px] tracking-tight">cloudweave</span>
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
                </Link>
              );
            })}
          </div>
        ))}

        {/* Admin-only nav items (site owner) */}
        {isAdmin && ADMIN_NAV_ITEMS.length > 0 && (
          <div>
            {!collapsed && (
              <p className="side-label">Admin</p>
            )}
            {collapsed && <div className="h-3" />}
            {ADMIN_NAV_ITEMS.map((item) => {
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
                </Link>
              );
            })}
          </div>
        )}
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
              control plane · live
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
  useLightTheme();
  const { user, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);

  // Real notifications: latest audit-trail entries
  const { data: auditData } = useQuery({
    queryKey: ['audit-notifications'],
    queryFn: () => api.auditLogs.list({ limit: 6 }),
    refetchInterval: 30000,
    enabled: !!user,
  });
  const auditLogs: AuditLog[] = auditData?.auditLogs ?? [];

  const initials = user
    ? user.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

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
            <span className="truncate" style={{ color: i === crumbs.length - 1 ? 'var(--ink)' : 'var(--ink-muted)' }}>
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

        {/* notifications (live audit trail) */}
        <div className="relative">
          <button
            className="icon-btn"
            onClick={() => setNotifOpen(!notifOpen)}
            aria-label="Recent activity"
            aria-expanded={notifOpen}
          >
            <Bell size={16} />
          </button>
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} aria-hidden />
              <div
                className="absolute right-0 z-50 mt-1.5 w-[360px] max-h-[440px] overflow-y-auto rounded-[var(--r-md)] shadow-2xl"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', animation: 'palette-in 160ms var(--ease-out)' }}
                role="menu"
                aria-label="Recent activity"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b text-sm font-semibold" style={{ borderColor: 'var(--border)' }}>
                  Recent activity
                  <Link href="/audit-logs" onClick={() => setNotifOpen(false)} className="chip">view all</Link>
                </div>
                {auditLogs.length === 0 && (
                  <p className="px-4 py-6 text-xs text-center" style={{ color: 'var(--ink-muted)' }}>
                    No activity recorded yet.
                  </p>
                )}
                {auditLogs.map((n) => (
                  <Link
                    key={n.id}
                    href={n.deploymentId ? `/deployments/${n.deploymentId}` : '/audit-logs'}
                    onClick={() => setNotifOpen(false)}
                    className="flex gap-3 px-4 py-3 border-b last:border-b-0"
                    style={{ borderColor: 'var(--border-faint)' }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-1.5 flex-none"
                      style={{
                        background: n.status === 'SUCCESS' ? 'var(--success)' : n.status === 'FAILURE' ? 'var(--fail)' : 'var(--accent)',
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{n.action}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--ink-muted)' }}>{n.message ?? ''}</p>
                      <p className="mono text-[10px] mt-1" style={{ color: 'var(--ink-faint)' }}>{timeAgo(n.timestamp)}</p>
                    </div>
                  </Link>
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
                {initials}
              </span>
              <span className="hidden lg:inline font-medium">{user?.name ?? 'Guest'}</span>
              <ChevronDown size={13} style={{ color: 'var(--ink-muted)' }} />
            </span>
          )}
        >
          {(close) => (
            <>
              <div className="px-3 py-2 border-b mb-1" style={{ borderColor: 'var(--border-faint)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{user?.name ?? 'Not signed in'}</p>
                <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>{user?.email ?? ''}</p>
                {user && (
                  <span className="chip mt-1 inline-flex" style={{ fontSize: 10 }}>{user.role === 'ADMIN' ? 'Site Owner' : user.role}</span>
                )}
              </div>
              {user ? (
                <button
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 rounded-[var(--r-sm)]"
                  style={{ color: 'var(--ink-secondary)' }}
                  onClick={() => { logout(); close(); }}
                >
                  <LogOut size={14} /> Sign out
                </button>
              ) : (
                <Link href="/login" className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 rounded-[var(--r-sm)]" style={{ color: 'var(--ink-secondary)' }}>
                  <Cloud size={14} /> Sign in
                </Link>
              )}
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
    { label: 'Home', href: '/dashboard', icon: Boxes, active: pathname === '/dashboard' },
    { label: 'Design', href: '/designer', icon: PenTool, active: pathname.startsWith('/designer') },
    { label: 'Deploys', href: '/deployments', icon: Rocket, active: pathname.startsWith('/deployments') },
    { label: 'Costs', href: '/costs', icon: DollarSign, active: pathname.startsWith('/costs') },
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
        className="tab-fab self-center w-[50px] h-[50px] flex-none rounded-[10px] flex items-center justify-center"
        style={{
          marginTop: -18,            background: 'linear-gradient(180deg, #ffffff 0%, var(--accent) 60%, #d4d4d4 100%)',
          color: '#0a0a0a',
          border: '3px solid var(--bg)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 8px 26px rgba(0,0,0,0.55)',
        }}
        onClick={open}
        aria-label="Search"
        title="Search"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
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
