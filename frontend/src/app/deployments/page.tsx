'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Deployment } from '../../lib/api';
import { useAuth } from '../../context/auth-context';
import { SafeDestructionModal } from '../../components/deployments/safe-destruction-modal';
import { ConfirmApplyModal } from '../../components/deployments/confirm-apply-modal';
import { ConfirmDestroyModal } from '../../components/deployments/confirm-destroy-modal';
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
  const [confirmDestroyTarget, setConfirmDestroyTarget] = useState<Deployment | null>(null);

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

  const confirmDestroyMutation = useMutation({
    mutationFn: (id: string) =>
      api.deployments.confirmDestroy(id, { confirmationKeyword: 'CONFIRM_DESTROY' }),
    onSuccess: () => {
      setConfirmDestroyTarget(null);
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'RUNNING':
        return 'bg-white/5 text-neutral-300 border-neutral-500/30 animate-pulse';
      case 'QUEUED':
        return 'bg-white/5 text-neutral-300 border-neutral-500/30';
      case 'PLANNED':
        return 'bg-white/5 text-neutral-300 border-neutral-500/30';
      case 'PLANNING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse';
      case 'FAILED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-neutral-800 text-neutral-400 border-neutral-700';
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
        return 'bg-emerald-950/40 text-neutral-300 border-emerald-800/40';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-white/5 border border-neutral-500/30 text-neutral-300">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Deployments</h1>
              <p className="text-xs text-neutral-400">
                End-to-end execution lifecycle: Plan &rarr; Approval &rarr; Asynchronous Apply & Teardown
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {user ? (
            <Link
              href="/deployments/wizard"
              className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-neutral-900 font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-black/30 transition-all"
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

      {/* Main Table / List View */}
      {isLoading ? (
        <div className="p-16 text-center space-y-4">
          <div className="w-10 h-10 rounded-full border-3 border-neutral-400 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-neutral-400">Synchronizing deployment registry...</p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl border border-rose-500/30 bg-rose-950/20 text-rose-300 space-y-2 text-center">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <h3 className="text-sm font-bold">Failed to load deployments</h3>
          <p className="text-xs text-rose-200/80">{(error as Error).message}</p>
        </div>
      ) : (
        <>
          {data?.deployments && data.deployments.length > 0 ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden divide-y divide-neutral-800/60">
              {data.deployments.map((deployment) => (
                <div
                  key={deployment.id}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-neutral-800/20 transition-colors"
                >
                  {/* Left Column: ID & Target Info */}
                  <div className="flex items-start space-x-4">
                    <div className="mt-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getOperationBadge(
                          deployment.operationType
                        )}`}
                      >
                        {deployment.operationType}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/deployments/${deployment.id}`}
                          className="font-mono text-sm font-bold text-white hover:text-neutral-300 transition-colors"
                        >
                          #{deployment.id.slice(0, 8)}
                        </Link>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.2 rounded-full border uppercase ${getStatusBadge(
                            deployment.status
                          )}`}
                        >
                          {deployment.status}
                        </span>
                      </div>

                      <div className="text-xs text-neutral-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>Project: <strong className="text-neutral-200">{deployment.project?.name}</strong></span>
                        <span>&bull;</span>
                        <span>Env: <strong className="text-neutral-200">{deployment.environment?.name}</strong></span>
                        <span>&bull;</span>
                        <span>Module: <strong className="text-neutral-200">{deployment.template?.name}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Execution Metadata & Actions */}
                  <div className="flex items-center space-x-3 self-end md:self-center">
                    <div className="text-right text-[11px] text-neutral-500 font-mono hidden sm:block">
                      <div>{new Date(deployment.createdAt).toLocaleDateString()}</div>
                      <div>{new Date(deployment.createdAt).toLocaleTimeString()}</div>
                    </div>

                    {/* Planned DESTROY deployment button: Red Teardown Confirmation */}
                    {deployment.status === 'PLANNED' && deployment.operationType === 'DESTROY' && (
                      <button
                        onClick={() => setConfirmDestroyTarget(deployment)}
                        disabled={confirmDestroyMutation.isPending}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/30 transition-all flex items-center space-x-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Confirm Teardown</span>
                      </button>
                    )}

                    {/* Planned CREATE/MODIFY deployment button: Green Approval */}
                    {deployment.status === 'PLANNED' && deployment.operationType !== 'DESTROY' && (
                      <button
                        onClick={() => setConfirmTarget(deployment)}
                        disabled={approveMutation.isPending}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all"
                      >
                        Approve & Apply
                      </button>
                    )}

                    {/* Standard Teardown trigger */}
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

                    {/* Retry Teardown for destroy records */}
                    {deployment.operationType === 'DESTROY' &&
                      (deployment.status === 'FAILED' || deployment.status === 'SUCCEEDED') && (
                        <button
                          onClick={() => setDestroyTarget(deployment)}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-600/30 text-rose-300 text-xs font-medium flex items-center space-x-1 transition-colors"
                          title="Retry Teardown"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span className="hidden sm:inline">Retry Teardown</span>
                        </button>
                      )}

                    <Link
                      href={`/deployments/${deployment.id}`}
                      className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center space-x-1.5 transition-all"
                    >
                      <FileText className="w-3.5 h-3.5 text-neutral-300" />
                      <span>Live Monitor</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/40 space-y-3">
              <PlayCircle className="w-10 h-10 text-neutral-600 mx-auto" />
              <h2 className="text-sm font-semibold text-neutral-300">No deployments found</h2>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
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

      {/* Destructive apply approval confirmation (for plans with destructive changes) */}
      {confirmTarget && (
        <ConfirmApplyModal
          deployment={confirmTarget}
          isPending={approveMutation.isPending}
          error={approveMutation.error ? (approveMutation.error as Error).message : null}
          onConfirm={() => approveMutation.mutate({ id: confirmTarget.id, confirmationKeyword: 'CONFIRM_APPLY' })}
          onClose={() => setConfirmTarget(null)}
        />
      )}

      {/* Explicit Destroy confirmation (for planned DESTROY deployments) */}
      {confirmDestroyTarget && (
        <ConfirmDestroyModal
          deployment={confirmDestroyTarget}
          isPending={confirmDestroyMutation.isPending}
          error={confirmDestroyMutation.error ? (confirmDestroyMutation.error as Error).message : null}
          onConfirm={() => confirmDestroyMutation.mutate(confirmDestroyTarget.id)}
          onClose={() => setConfirmDestroyTarget(null)}
        />
      )}

      {/* Deployment Details & Log Output Modal */}
      {selectedDeployment && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <Terminal className="w-5 h-5 text-neutral-300" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Deployment #{selectedDeployment.id}
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    Status: {selectedDeployment.status} &bull; Operation: {selectedDeployment.operationType}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedDeployment(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Plan Output */}
              <div className="space-y-1">
                <div className="font-semibold text-neutral-300 flex items-center justify-between">
                  <span>Terraform Plan Preview Output:</span>
                  <span className="text-[10px] text-neutral-500">Plan Output Stream</span>
                </div>
                <pre className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800/80 font-mono text-[11px] text-neutral-300 overflow-x-auto max-h-56 leading-relaxed whitespace-pre-wrap">
                  {selectedDeployment.planOutput || 'No plan output generated.'}
                </pre>
              </div>

              {/* Apply Output if present */}
              {selectedDeployment.applyOutput && (
                <div className="space-y-1">
                  <div className="font-semibold text-neutral-300">Terraform Apply Output:</div>
                  <pre className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800/80 font-mono text-[11px] text-neutral-200 overflow-x-auto max-h-56 leading-relaxed whitespace-pre-wrap">
                    {selectedDeployment.applyOutput}
                  </pre>
                </div>
              )}

              {/* Configuration Inputs */}
              <div className="space-y-1">
                <div className="font-semibold text-neutral-300">Submitted Configuration:</div>
                <pre className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-[11px] text-neutral-400 overflow-x-auto">
                  {JSON.stringify(selectedDeployment.configuration, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800 flex justify-end">
              <button
                onClick={() => setSelectedDeployment(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold"
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
