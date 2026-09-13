'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../context/auth-context';
import {
  Cloud,
  Activity,
  User as UserIcon,
  Shield,
  Key,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  Server,
} from 'lucide-react';

interface NavbarProps {
  onToggleMobileSidebar: () => void;
  isMobileSidebarOpen: boolean;
}

export function Navbar({ onToggleMobileSidebar, isMobileSidebarOpen }: NavbarProps) {
  const { user, quickLogin, logout, isLoading: authLoading } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  // Poll health endpoint every 15s to display live backend connectivity
  const {
    data: health,
    isLoading: healthLoading,
    error: healthError,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.health.get(),
    refetchInterval: 15000,
    retry: 1,
  });

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'DEVELOPER':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'VIEWER':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 py-3 transition-all">
      <div className="flex items-center justify-between">
        {/* Left: Mobile menu toggle + Logo */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            aria-label="Toggle Navigation"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                  MultiCloud
                </span>
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-indigo-950/70 border border-indigo-700/50 text-indigo-300 font-mono">
                  v1.6
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal hidden sm:block">
                Infrastructure Automation Platform
              </p>
            </div>
          </Link>
        </div>

        {/* Right: Health Telemetry + User / Role Management */}
        <div className="flex items-center space-x-3">
          {/* Live Backend Telemetry Pill */}
          <div
            className="hidden sm:flex items-center space-x-2 text-xs px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900/70 shadow-inner"
            title={
              health
                ? `Service: ${health.service} (${health.environment}) - Last ping: ${new Date(
                    dataUpdatedAt
                  ).toLocaleTimeString()}`
                : 'Connecting to Control Plane'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                healthLoading
                  ? 'bg-amber-400 animate-pulse'
                  : healthError
                  ? 'bg-rose-500'
                  : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
              }`}
            />
            <span className="text-slate-300 font-medium">
              Control Plane:{' '}
              {healthLoading ? (
                <span className="text-amber-400">Pinging...</span>
              ) : healthError ? (
                <span className="text-rose-400">Offline</span>
              ) : (
                <span className="text-emerald-400 font-semibold">Active ({health?.version})</span>
              )}
            </span>
          </div>

          {/* User Role Switcher Dropdown */}
          <div className="relative">
            {user ? (
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 transition-all text-xs text-left"
              >
                <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-slate-300">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
                <div className="hidden md:block">
                  <div className="font-semibold text-slate-200 leading-tight">{user.name}</div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                    {user.email}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getRoleBadgeColor(
                    user.role
                  )}`}
                >
                  {user.role}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            ) : (
              <button
                onClick={() => quickLogin('DEVELOPER')}
                disabled={authLoading}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{authLoading ? 'Authenticating...' : 'Connect (Dev)'}</span>
              </button>
            )}

            {/* Role Switcher Menu */}
            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-slate-800/80 mb-2">
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    Simulate RBAC Persona
                  </p>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Switch context to test authoritative permissions.
                  </p>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      quickLogin('ADMIN');
                      setShowRoleMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      user?.role === 'ADMIN'
                        ? 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="flex items-center space-x-2">
                      <Shield className="w-3.5 h-3.5 text-rose-400" />
                      <span>Admin Operator</span>
                    </span>
                    <span className="text-[10px] text-rose-400 font-mono">Full Access</span>
                  </button>

                  <button
                    onClick={() => {
                      quickLogin('DEVELOPER');
                      setShowRoleMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      user?.role === 'DEVELOPER'
                        ? 'bg-indigo-950/40 text-indigo-300 border border-indigo-800/40'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="flex items-center space-x-2">
                      <Key className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Developer</span>
                    </span>
                    <span className="text-[10px] text-indigo-400 font-mono">Plan / Apply</span>
                  </button>

                  <button
                    onClick={() => {
                      quickLogin('VIEWER');
                      setShowRoleMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      user?.role === 'VIEWER'
                        ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="flex items-center space-x-2">
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Auditor / Viewer</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">Read Only</span>
                  </button>
                </div>

                <div className="border-t border-slate-800/80 mt-2 pt-1">
                  <button
                    onClick={() => {
                      logout();
                      setShowRoleMenu(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect Session</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
