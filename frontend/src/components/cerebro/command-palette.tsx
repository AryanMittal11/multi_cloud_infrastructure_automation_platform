'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Cloud,
  DollarSign,
  FolderGit2,
  Library,
  PenTool,
  RefreshCw,
  Rocket,
  ScrollText,
  Server,
  Waypoints,
  Boxes,
} from 'lucide-react';
import { api } from '../../lib/api';
import { timeAgo } from '../../lib/format';

interface PaletteItem {
  id: string;
  group: string;
  title: string;
  sub: string;
  icon: React.ReactNode;
  keywords?: string;
  href: string;
}

export function usePalette() {
  return { openPalette: () => window.dispatchEvent(new CustomEvent('cerebro:open-palette')) };
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
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

  // Live platform datasets (only fetched while the palette is open)
  const { data: deploymentsData } = useQuery({
    queryKey: ['palette-deployments'],
    queryFn: () => api.deployments.list(),
    enabled: open,
  });
  const { data: designsData } = useQuery({
    queryKey: ['palette-designs'],
    queryFn: () => api.designs.list(),
    enabled: open,
  });

  const flat = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [];

    // navigation — the real platform surfaces
    const nav = [
      { label: 'Dashboard', href: '/dashboard', icon: <Boxes size={13} /> },
      { label: 'Projects', href: '/projects', icon: <FolderGit2 size={13} /> },
      { label: 'Template Catalog', href: '/templates', icon: <Library size={13} /> },
      { label: 'Visual Designer', href: '/designer', icon: <PenTool size={13} /> },
      { label: 'Saved Designs', href: '/architectures', icon: <Library size={13} /> },
      { label: 'Deployments', href: '/deployments', icon: <Rocket size={13} /> },
      { label: 'Resources', href: '/resources', icon: <Server size={13} /> },
      { label: 'Topology', href: '/topology', icon: <Waypoints size={13} /> },
      { label: 'Costs', href: '/costs', icon: <DollarSign size={13} /> },
      { label: 'Cloud Accounts', href: '/cloud-accounts', icon: <Cloud size={13} /> },
      { label: 'Audit Logs', href: '/audit-logs', icon: <ScrollText size={13} /> },
    ];
    nav.forEach((n) =>
      items.push({
        id: `nav-${n.href}`,
        group: 'Navigation',
        title: n.label,
        sub: n.href,
        icon: n.icon,
        href: n.href,
      })
    );

    // quick actions
    items.push(
      {
        id: 'qa-wizard',
        group: 'Actions',
        title: 'New deployment…',
        sub: 'launch the deployment wizard',
        icon: <Rocket size={13} />,
        keywords: 'create deploy plan apply',
        href: '/deployments/wizard',
      },
      {
        id: 'qa-design',
        group: 'Actions',
        title: 'Design infrastructure…',
        sub: 'open the visual canvas',
        icon: <PenTool size={13} />,
        keywords: 'draw architecture canvas',
        href: '/designer',
      },
      {
        id: 'qa-refresh',
        group: 'Actions',
        title: 'Refresh data',
        sub: 're-fetch from the control plane',
        icon: <RefreshCw size={13} />,
        keywords: 'reload sync',
        href: pathname,
      }
    );

    // live deployments
    (deploymentsData?.deployments ?? []).slice(0, 8).forEach((d: any) =>
      items.push({
        id: `dep-${d.id}`,
        group: 'Deployments',
        title: `${d.template?.name ?? 'deployment'} · ${d.status}`,
        sub: `${d.project?.name ?? ''} · ${timeAgo(d.createdAt)}`,
        icon: <Rocket size={13} />,
        keywords: `${d.status}`,
        href: `/deployments/${d.id}`,
      })
    );

    // saved designs
    (designsData?.designs ?? []).slice(0, 6).forEach((s: any) =>
      items.push({
        id: `dsn-${s.id}`,
        group: 'Designs',
        title: s.name,
        sub: `${s.cloudProvider} · ${s.nodeCount} nodes`,
        icon: <PenTool size={13} />,
        keywords: 'design canvas',
        href: `/designer`,
      })
    );

    return items;
  }, [deploymentsData, designsData, pathname]);

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

  const run = (item: PaletteItem) => {
    if (item.id === 'qa-refresh') {
      onClose();
      router.refresh();
      return;
    }
    onClose();
    router.push(item.href);
  };

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
      filtered[selected] && run(filtered[selected]);
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
            placeholder="Search pages, deployments, designs…"
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
                  <Link
                    key={it.id}
                    href={it.href}
                    className={`palette-item ${sel ? 'selected' : ''}`}
                    data-selected={sel}
                    onMouseEnter={() => setSelected(idx)}
                    onMouseDown={(e) => {
                      // refresh is an action, not navigation
                      if (it.id === 'qa-refresh') {
                        e.preventDefault();
                        run(it);
                      }
                    }}
                    role="option"
                    aria-selected={sel}
                  >
                    <span className="pi-icon">{it.icon}</span>
                    <span className="pi-title">{it.title}</span>
                    <span className="pi-sub">{it.sub}</span>
                    {sel && <ArrowRight size={12} style={{ color: 'var(--ink-muted)' }} />}
                  </Link>
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
          <span className="palette-hint mono">cloudweave</span>
        </div>
      </div>
    </div>
  );
}
