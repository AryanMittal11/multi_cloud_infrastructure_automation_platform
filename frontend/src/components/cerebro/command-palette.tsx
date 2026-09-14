'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  GitBranch,
  LayoutDashboard,
  LineChart,
  Moon,
  Play,
  Radio,
  RefreshCw,
  Settings as SettingsIcon,
  Workflow,
} from 'lucide-react';
import { pipelines, deployments, alerts, anomalies, environments } from '../../lib/cerebro/mock-data';

interface PaletteItem {
  id: string;
  group: string;
  title: string;
  sub: string;
  icon: React.ReactNode;
  keywords?: string;
  action: () => void;
}

export function usePalette() {
  return { openPalette: () => window.dispatchEvent(new CustomEvent('cerebro:open-palette')) };
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // global event opener (for components outside the shell)
  useEffect(() => {
    const handler = () => window.dispatchEvent(new CustomEvent('cerebro:palette-open'));
    window.addEventListener('cerebro:open-palette', handler);
    return () => window.removeEventListener('cerebro:open-palette', handler);
  }, []);

  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener('cerebro:palette-open', handler);
    return () => window.removeEventListener('cerebro:palette-open', handler);
  }, [onClose]);

  // focus + reset on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const flat = useMemo<PaletteItem[]>(() => {
    const go = (href: string) => () => {
      router.push(href);
      onClose();
    };
    const items: PaletteItem[] = [];

    // navigation
    const nav = [
      { label: 'Overview', href: '/dashboard', icon: <LayoutDashboard size={13} /> },
      { label: 'Pipelines', href: '/dashboard/pipelines', icon: <GitBranch size={13} /> },
      { label: 'Deployments', href: '/dashboard/deployments', icon: <Workflow size={13} /> },
      { label: 'Anomalies', href: '/dashboard/anomalies', icon: <Activity size={13} /> },
      { label: 'Alerts', href: '/dashboard/alerts', icon: <AlertTriangle size={13} /> },
      { label: 'Environments', href: '/dashboard/environments', icon: <Radio size={13} /> },
      { label: 'Analytics', href: '/dashboard/analytics', icon: <LineChart size={13} /> },
      { label: 'Settings', href: '/dashboard/settings', icon: <SettingsIcon size={13} /> },
    ];
    nav.forEach((n) =>
      items.push({
        id: `nav-${n.href}`,
        group: 'Navigation',
        title: n.label,
        sub: n.href.replace('/dashboard', '~'),
        icon: n.icon,
        action: go(n.href),
      })
    );

    // quick actions
    items.push(
      {
        id: 'qa-run',
        group: 'Actions',
        title: 'Run pipeline…',
        sub: 'trigger on main',
        icon: <Play size={13} />,
        keywords: 'trigger deploy build',
        action: go('/dashboard/pipelines'),
      },
      {
        id: 'qa-refresh',
        group: 'Actions',
        title: 'Refresh data',
        sub: 're-fetch demo dataset',
        icon: <RefreshCw size={13} />,
        keywords: 'reload sync',
        action: () => {
          window.location.reload();
        },
      },
      {
        id: 'qa-theme',
        group: 'Actions',
        title: 'Toggle theme',
        sub: 'dark / light',
        icon: <Moon size={13} />,
        keywords: 'dark light appearance',
        action: () => {
          const cur = document.documentElement.getAttribute('data-theme') ?? 'dark';
          document.documentElement.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
          window.localStorage.setItem('cerebro-theme', cur === 'dark' ? 'light' : 'dark');
        },
      }
    );

    // pipelines
    pipelines.forEach((p) =>
      items.push({
        id: `pipe-${p.id}`,
        group: 'Pipelines',
        title: p.name,
        sub: `${p.repo} · ${p.env}`,
        icon: <GitBranch size={13} />,
        keywords: `${p.repo} ${p.env} ${p.lastStatus}`,
        action: go(`/dashboard/pipelines/${p.id}`),
      })
    );

    // deployments
    deployments.forEach((d) =>
      items.push({
        id: `dep-${d.id}`,
        group: 'Deployments',
        title: `${d.version} → ${d.env}`,
        sub: `${d.id} · ${d.commit}`,
        icon: <Workflow size={13} />,
        keywords: `${d.status} ${d.author} ${d.commit}`,
        action: go(`/dashboard/deployments/${d.id}`),
      })
    );

    // anomalies
    anomalies.forEach((a) =>
      items.push({
        id: `anom-${a.id}`,
        group: 'Anomalies',
        title: a.title,
        sub: `${a.id} · ${a.severity} · ${a.service}`,
        icon: <Activity size={13} />,
        keywords: `${a.state} ${a.metric}`,
        action: go(`/dashboard/anomalies/${a.id}`),
      })
    );

    // alerts
    alerts.forEach((a) =>
      items.push({
        id: `alg-${a.id}`,
        group: 'Alerts',
        title: a.title,
        sub: `${a.id} · ${a.severity} · ${a.status}`,
        icon: <AlertTriangle size={13} />,
        keywords: `${a.service} ${a.source}`,
        action: go(`/dashboard/alerts/${a.id}`),
      })
    );

    // environments
    environments.forEach((e) =>
      items.push({
        id: `env-${e.id}`,
        group: 'Environments',
        title: e.name,
        sub: `${e.region} · ${e.currentVersion}`,
        icon: <Radio size={13} />,
        keywords: `${e.key} ${e.provider}`,
        action: go(`/dashboard/environments/${e.id}`),
      })
    );

    return items;
  }, [router, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return flat;
    return flat.filter((it) =>
      `${it.title} ${it.sub} ${it.group} ${it.keywords ?? ''}`.toLowerCase().includes(q)
    );
  }, [flat, query]);

  // group while keeping global selection index
  const grouped = useMemo(() => {
    const map = new Map<string, PaletteItem[]>();
    filtered.forEach((it) => {
      if (!map.has(it.group)) map.set(it.group, []);
      map.get(it.group)!.push(it);
    });
    return map;
  }, [filtered]);

  useEffect(() => setSelected(0), [query]);

  // keyboard
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[selected]?.action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-selected="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (!open) return null;

  let idx = -1;

  return (
    <div
      className="palette-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="palette-input-row">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            className="palette-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search projects, runs, actions…"
            autoComplete="off"
            spellCheck={false}
            aria-label="Search"
            role="combobox"
            aria-expanded
            aria-controls="palette-results"
          />
          <span className="kbd">esc</span>
        </div>
        <div className="palette-results" id="palette-results" role="listbox" ref={listRef}>
          {filtered.length === 0 && (
            <div className="palette-item empty">No results for “{query}”</div>
          )}
          {[...grouped.entries()].map(([group, items]) => (
            <div key={group}>
              <p className="palette-group">{group}</p>
              {items.map((it) => {
                idx++;
                const sel = idx === selected;
                return (
                  <button
                    key={it.id}
                    className={`palette-item ${sel ? 'selected' : ''}`}
                    data-selected={sel}
                    onMouseEnter={() => setSelected(idx)}
                    onClick={it.action}
                    role="option"
                    aria-selected={sel}
                  >
                    <span className="pi-icon">{it.icon}</span>
                    <span className="pi-title">{it.title}</span>
                    <span className="pi-sub">{it.sub}</span>
                    {sel && <ArrowRight size={12} style={{ color: 'var(--ink-muted)' }} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="palette-foot">
          <span className="flex items-center gap-1">
            <span className="kbd">↑</span>
            <span className="kbd">↓</span> navigate
          </span>
          <span className="flex items-center gap-1">
            <span className="kbd">↵</span> select
          </span>
          <span className="palette-hint mono">actions</span>
        </div>
      </div>
    </div>
  );
}
