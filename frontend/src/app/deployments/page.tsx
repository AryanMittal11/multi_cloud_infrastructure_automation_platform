'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Deployment } from '../../lib/api';
import { useAuth } from '../../context/auth-context';
import { SafeDestructionModal } from '../../components/deployments/safe-destruction-modal';
import { ConfirmApplyModal } from '../../components/deployments/confirm-apply-modal';
import Link from 'next/link';
import {
  PlayCircle,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Flame,
  FileText,
  X,
  Key,
  ShieldCheck,
  ChevronRight,
  Terminal,
  Trash2,
} from 'lucide-react';

export default function DeploymentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [destroyTarget, setDestroyTarget] = useState<Deployment | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Deployment | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['deployments'],
    queryFn: () => api.deployments.list(),
    enabled: !!user,
    refetchInterval: 5000, // Poll every 5s for live status updates
  });

  const approveMutation = useMutation({
    mutationFn: (input: { id: string; confirmationKeyword?: string }) =>
      api.deployments.approve(input.id, { confirmationKeyword: input.confirmationKeyword }),
    onSuccess: () => {
      setConfirmTarget(null);
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'RUNNING':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 animate-pulse';
      case 'QUEUED':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'PLANNED':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'PLANNING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse';
      case 'FAILED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getOperationBadge = (op: string) => {
    switch (op) {
      case 'DESTROY':
        return 'bg-rose-950/40 text-rose-400 border-rose-800/40';
      case 'MODIFY':
        return 'bg-amber-950/40 text-amber-400 border-amber-800/40';
      case 'CREATE':
      default:
        return 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Deployments</h1>
              <p className="text-xs text-slate-400">
                End-to-end execution lifecycle: Plan &rarr; Approval &rarr; Asynchronous Apply & Teardown
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {user ? (
            <Link
              href="/deployments/wizard"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Launch Wizard</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Key className="w-4 h-4" />
              <span>Sign in to Track Runs</span>
            </Link>
          )}
        </div>
      </div>

      {/* Deployments Table / List */}
      {user && (
        <>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-20 rounded-2xl border border-slate-800 bg-slate-900/40 animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-950/20 text-rose-300 text-xs flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Failed to fetch deployments: {(error as Error).message}</span>
            </div>
          ) : data?.deployments && data.deployments.length > 0 ? (
            <div className="space-y-3">
              {data.deployments.map((deployment: Deployment) => (
                <div
                  key={deployment.id}
                  className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start md:items-center space-x-4">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 shrink-0">
                      <Terminal className="w-4 h-4 text-indigo-400" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          #{deployment.id.slice(0, 8)}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getOperationBadge(
                            deployment.operationType
                          )}`}
                        >
                          {deployment.operationType}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getStatusBadge(
                            deployment.status
                          )}`}
                        >
                          {deployment.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                        <span>Project: <strong className="text-slate-200">{deployment.project?.name ?? 'Default'}</strong></span>
                        <span>&bull;</span>
                        <span>Env: <strong className="text-indigo-300">{deployment.environment?.name ?? 'development'}</strong></span>
                        <span>&bull;</span>
                        <span>Template: <strong className="text-emerald-300">{deployment.template?.name ?? 'aws_vpc'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 self-end md:self-auto">
                    <div className="text-right text-[11px] text-slate-500 hidden sm:block">
                      <div>{new Date(deployment.createdAt).toLocaleDateString()}</div>
                      <div>{new Date(deployment.createdAt).toLocaleTimeString()}</div>
                    </div>

                    {deployment.status === 'PLANNED' && (
                      <button
                        onClick={() =>
                          deployment.operationType === 'DESTROY'
                            ? setConfirmTarget(deployment)
                            : approveMutation.mutate({ id: deployment.id })
                        }
                        disabled={approveMutation.isPending}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all"
                      >
                        Approve & Apply
                      </button>
                    )}

                    {deployment.status === 'SUCCEEDED' && deployment.operationType !== 'DESTROY' && (
                      <button
                        onClick={() => setDestroyTarget(deployment)}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-600/30 text-rose-300 text-xs font-medium flex items-center space-x-1 transition-colors"
                        title="Tear down environment"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span className="hidden sm:inline">Teardown</span>
                      </button>
                    )}

                    <Link
                      href={`/deployments/${deployment.id}`}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1.5 transition-all"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Live Monitor</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 space-y-3">
              <PlayCircle className="w-10 h-10 text-slate-600 mx-auto" />
              <h2 className="text-sm font-semibold text-slate-300">No deployments found</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Trigger a plan run via the Template Catalog or Deployment Wizard to begin provisioning infrastructure.
              </p>
            </div>
          )}
        </>
      )}

      {/* Safe Destruction Modal */}
      {destroyTarget && (
        <SafeDestructionModal
          deployment={destroyTarget}
          isOpen={!!destroyTarget}
          onClose={() => setDestroyTarget(null)}
        />
      )}

      {/* Destructive approval confirmation */}
      {confirmTarget && (
        <ConfirmApplyModal
          deployment={confirmTarget}
          isPending={approveMutation.isPending}
          error={approveMutation.error ? (approveMutation.error as Error).message : null}
          onConfirm={() => approveMutation.mutate({ id: confirmTarget.id, confirmationKeyword: 'CONFIRM_APPLY' })}
          onClose={() => setConfirmTarget(null)}
        />
      )}

      {/* Deployment Details & Log Output Modal */}
      {selectedDeployment && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <Terminal className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Deployment #{selectedDeployment.id}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Status: {selectedDeployment.status} &bull; Operation: {selectedDeployment.operationType}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedDeployment(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Plan Output */}
              <div className="space-y-1">
                <div className="font-semibold text-slate-300 flex items-center justify-between">
                  <span>Terraform Plan Preview Output:</span>
                  <span className="text-[10px] text-slate-500">Plan Output Stream</span>
                </div>
                <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-56 leading-relaxed whitespace-pre-wrap">
                  {selectedDeployment.planOutput || 'No plan output generated.'}
                </pre>
              </div>

              {/* Apply Output if present */}
              {selectedDeployment.applyOutput && (
                <div className="space-y-1">
                  <div className="font-semibold text-slate-300">Terraform Apply Output:</div>
                  <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-emerald-300 overflow-x-auto max-h-56 leading-relaxed whitespace-pre-wrap">
                    {selectedDeployment.applyOutput}
                  </pre>
                </div>
              )}

              {/* Configuration Inputs */}
              <div className="space-y-1">
                <div className="font-semibold text-slate-300">Submitted Configuration:</div>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 overflow-x-auto">
                  {JSON.stringify(selectedDeployment.configuration, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedDeployment(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
