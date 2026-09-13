'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderGit2,
  Cloud,
  Layers,
  PlayCircle,
  ScrollText,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Cpu,
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

const navItems = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    badge: null,
    description: 'Telemetry & platform overview',
  },
  {
    name: 'Projects',
    href: '/projects',
    icon: FolderGit2,
    badge: null,
    description: 'Workspaces & environments',
  },
  {
    name: 'Cloud Accounts',
    href: '/cloud-accounts',
    icon: Cloud,
    badge: null,
    description: 'AWS, Azure, & GCP credentials',
  },
  {
    name: 'Template Catalog',
    href: '/templates',
    icon: Layers,
    badge: 'AWS Core',
    description: 'Modular IaC archetypes',
  },
  {
    name: 'Deployments',
    href: '/deployments',
    icon: PlayCircle,
    badge: null,
    description: 'Plan, apply, & destroy runs',
  },
  {
    name: 'Audit Logs',
    href: '/audit-logs',
    icon: ScrollText,
    badge: null,
    description: 'Immutable compliance trail',
  },
];

export function Sidebar({ isMobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed md:sticky top-[57px] left-0 z-35 h-[calc(100vh-57px)] w-64 bg-slate-950/90 border-r border-slate-800/80 backdrop-blur-lg flex flex-col justify-between p-4 transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Navigation links */}
        <div className="space-y-6">
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Core Platform
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600/20 to-blue-600/10 text-white border border-indigo-500/30 shadow-sm shadow-indigo-500/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-1.5 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40'
                            : 'bg-slate-900 text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-semibold">{item.name}</span>
                    </div>

                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Platform Invariants Summary Card */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Active Invariants</span>
          </div>

          <div className="space-y-1.5 text-[11px] text-slate-400">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">Plan &rarr; Approval Gate</span>
            </div>
            <div className="flex items-center space-x-2">
              <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">Isolated Async Worker</span>
            </div>
            <div className="flex items-center space-x-2">
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">AES-256 Secret Masking</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
