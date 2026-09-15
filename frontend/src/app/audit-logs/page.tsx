'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api, AuditLog } from '../../lib/api';
import { useAuth } from '../../context/auth-context';
import {
  ScrollText,
  ShieldCheck,
  Clock,
  User as UserIcon,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Filter,
  Key,
  FolderGit2,
  Terminal,
} from 'lucide-react';

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['audit-logs', statusFilter],
    queryFn: () =>
      api.auditLogs.list({
        status: statusFilter || undefined,
        limit: 100,
      }),
    enabled: !!user,
  });

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <ScrollText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Audit Logs</h1>
              <p className="text-xs text-slate-400">
                Immutable security ledger tracking infrastructure actions, plan requests, and approvals
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">Success Only</option>
              <option value="FAILURE">Failure Only</option>
              <option value="PENDING">Pending Only</option>
            </select>
          </div>

          {!user && (
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Key className="w-4 h-4" />
              <span>Sign in to View Audit Trail</span>
            </Link>
          )}
        </div>
      </div>

      {/* Compliance Notice */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex items-start space-x-3 text-xs">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-slate-200">Immutable Compliance Trail:</span>
          <p className="text-slate-400 text-[11px]">
            Every plan request, approval gate decision, concurrency lock override, and credential onboarding event is persisted with actor context and timestamped for compliance auditing.
          </p>
        </div>
      </div>

      {/* Audit Logs List */}
      {user && (
        <>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="h-16 rounded-2xl border border-slate-800 bg-slate-900/40 animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-950/20 text-rose-300 text-xs flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Failed to fetch audit logs: {(error as Error).message}</span>
            </div>
          ) : data?.auditLogs && data.auditLogs.length > 0 ? (
            <div className="space-y-2">
              {data.auditLogs.map((log: AuditLog) => {
                const isExpanded = expandedLogId === log.id;
                const isSuccess = log.status === 'SUCCESS';

                return (
                  <div
                    key={log.id}
                    className="rounded-xl border border-slate-800/80 bg-slate-900/30 hover:border-slate-700/80 transition-all overflow-hidden"
                  >
                    <div
                      onClick={() => toggleExpand(log.id)}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-start sm:items-center space-x-3">
                        <button className="text-slate-500 hover:text-slate-300 pt-0.5 sm:pt-0">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>

                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-300">
                              {log.action}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                                isSuccess
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {log.status}
                            </span>
                            {log.project && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 flex items-center space-x-1">
                                <FolderGit2 className="w-3 h-3" />
                                <span>{log.project.name}</span>
                              </span>
                            )}
                            {log.deploymentId && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 flex items-center space-x-1">
                                <Terminal className="w-3 h-3" />
                                <span>#{log.deploymentId.slice(0, 8)}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{log.message}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-[11px] text-slate-400 self-end sm:self-auto shrink-0">
                        {log.user && (
                          <div className="flex items-center space-x-1">
                            <UserIcon className="w-3 h-3 text-slate-500" />
                            <span>{log.user.name}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1 text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Metadata view */}
                    {isExpanded && (
                      <div className="p-3.5 bg-slate-950/80 border-t border-slate-800/80 text-xs space-y-2">
                        <div className="font-semibold text-slate-300">Audit Metadata & Payload:</div>
                        <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                          {log.metadata
                            ? JSON.stringify(log.metadata, null, 2)
                            : 'No structured metadata associated with this log.'}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 space-y-3">
              <ScrollText className="w-10 h-10 text-slate-600 mx-auto" />
              <h2 className="text-sm font-semibold text-slate-300">No audit logs found</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Platform actions like project creation, cloud onboarding, and deployment planning generate immutable audit events.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
