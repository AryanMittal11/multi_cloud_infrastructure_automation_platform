'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Deployment } from '../../lib/api';
import { useAuth } from '../../context/auth-context';
import {
  AlertTriangle,
  Flame,
  X,
  ShieldAlert,
  Loader2,
  Trash2,
  Check,
  Terminal,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface SafeDestructionModalProps {
  deployment: Deployment;
  isOpen: boolean;
  onClose: () => void;
}

export function SafeDestructionModal({
  deployment,
  isOpen,
  onClose,
}: SafeDestructionModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [phase, setPhase] = useState<'PREVIEW' | 'CONFIRM'>('PREVIEW');
  const [destroyDeploymentId, setDestroyDeploymentId] = useState<string | null>(null);
  const [typedKeyword, setTypedKeyword] = useState('');
  const [comment, setComment] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const envName = deployment.environment?.name || 'environment';
  const isProduction = envName.toLowerCase() === 'production';
  const isAdmin = user?.role === 'ADMIN';

  // 1. Trigger destroy plan preview mutation
  const destroyPlanMutation = useMutation({
    mutationFn: async () => {
      return api.deployments.createDestroyPlan(deployment.id);
    },
    onSuccess: (res) => {
      setDestroyDeploymentId(res.deployment.id);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to initiate destruction dry-run');
    },
  });

  // Query destroy deployment polling while planning
  const { data: destroyData } = useQuery({
    queryKey: ['destroy-plan-poll', destroyDeploymentId],
    queryFn: () => api.deployments.get(destroyDeploymentId!),
    enabled: !!destroyDeploymentId && phase === 'PREVIEW',
    refetchInterval: (query) => {
      const status = query.state.data?.deployment?.status;
      if (status === 'PLANNING') return 1500;
      return false;
    },
  });

  const activeDestroyDeployment = destroyData?.deployment;

  // 2. Confirm destruction mutation
  const confirmDestroyMutation = useMutation({
    mutationFn: async () => {
      if (!destroyDeploymentId) throw new Error('Destroy plan not initialized');
      return api.deployments.confirmDestroy(destroyDeploymentId, {
        confirmationKeyword: typedKeyword.trim(),
        comment: comment.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      onClose();
      router.push(`/deployments/${destroyDeploymentId}`);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Destruction confirmation rejected');
    },
  });

  if (!isOpen) return null;

  const isKeywordMatched = typedKeyword.trim() === 'CONFIRM_DESTROY';
  const canConfirm = isKeywordMatched && (!isProduction || isAdmin);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-xl rounded-2xl border border-rose-500/50 bg-neutral-950 p-6 sm:p-7 shadow-2xl shadow-rose-950/40 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Safe Decommissioning Guard
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800/60 uppercase">
                  Destroy
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Permanent teardown for environment: <strong className="text-rose-300">{envName}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Error Notice */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* High Severity Production Alert */}
        {isProduction && (
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-600/50 text-rose-200 text-xs space-y-1.5">
            <div className="flex items-center space-x-2 font-bold text-rose-400">
              <ShieldAlert className="w-4 h-4" />
              <span>PRODUCTION WORKSPACE PROTECTION</span>
            </div>
            <p className="text-[11px] leading-relaxed text-rose-300">
              This environment is tagged as <strong>PRODUCTION</strong>. Teardown requires explicit <strong>ADMIN</strong> authority. All live resources, databases, storage buckets, and subnets will be terminated.
            </p>
          </div>
        )}

        {/* ======================================================= */}
        {/* PHASE 1: PREVIEW DESTRUCTION */}
        {/* ======================================================= */}
        {phase === 'PREVIEW' && (
          <div className="space-y-4">
            {!destroyDeploymentId ? (
              <div className="space-y-3 text-xs text-neutral-300">
                <p>
                  To prevent accidental downtime, the platform mandates a dry-run destruction preview (<code>terraform plan -destroy</code>) prior to final signoff.
                </p>

                <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2 text-[11px]">
                  <div className="flex justify-between text-neutral-400">
                    <span>Target Project:</span>
                    <strong className="text-white">{deployment.project?.name}</strong>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Target Environment:</span>
                    <strong className="text-rose-400 uppercase">{envName}</strong>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Associated Module:</span>
                    <strong className="text-white">{deployment.template?.name}</strong>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-800 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={destroyPlanMutation.isPending}
                    onClick={() => destroyPlanMutation.mutate()}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
                  >
                    {destroyPlanMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Initializing Preview...</span>
                      </>
                    ) : (
                      <>
                        <span>Generate Destruction Plan</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {activeDestroyDeployment?.status === 'PLANNING' ? (
                  <div className="p-8 text-center rounded-xl bg-neutral-900/50 border border-neutral-800 space-y-3">
                    <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
                    <h4 className="text-xs font-bold text-white">
                      Evaluating Destructive Blast Radius...
                    </h4>
                    <p className="text-[11px] text-neutral-400">
                      Isolated worker is computing resource teardown dependencies.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-1">
                      <div className="text-xs font-bold text-rose-400 flex items-center space-x-2">
                        <Terminal className="w-3.5 h-3.5" />
                        <span>Destructive Plan Computed</span>
                      </div>
                      <pre className="text-[11px] font-mono text-neutral-300 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {activeDestroyDeployment?.planOutput || 'Plan output ready.'}
                      </pre>
                    </div>

                    <div className="pt-3 border-t border-neutral-800 flex justify-between items-center">
                      <button
                        type="button"
                        onClick={onClose}
                        className="text-xs font-semibold text-neutral-500 hover:text-white"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={() => setPhase('CONFIRM')}
                        className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-rose-600/30 transition-all"
                      >
                        <span>Proceed to Final Confirmation</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================================================= */}
        {/* PHASE 2: EXPLICIT CONFIRMATION */}
        {/* ======================================================= */}
        {phase === 'CONFIRM' && (
          <div className="space-y-4">
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-neutral-200">
                To confirm permanent destruction, type <code className="text-rose-400 font-bold bg-neutral-900 px-1.5 py-0.5 rounded border border-rose-500/30">CONFIRM_DESTROY</code> below:
              </label>
              <input
                type="text"
                placeholder="Type CONFIRM_DESTROY"
                value={typedKeyword}
                onChange={(e) => setTypedKeyword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white font-mono focus:outline-none focus:border-rose-500 transition-colors"
                autoFocus
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-neutral-400">
                Audit Reason / Comment (optional):
              </label>
              <input
                type="text"
                placeholder="e.g. End of sprint teardown"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-neutral-700"
              />
            </div>

            {isProduction && !isAdmin && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-600/50 text-rose-400 text-xs flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Admin privileges required for production teardown. Your role: {user?.role}</span>
              </div>
            )}

            <div className="pt-3 border-t border-neutral-800 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setPhase('PREVIEW')}
                className="text-xs font-semibold text-neutral-400 hover:text-white"
              >
                Back to Preview
              </button>

              <button
                type="button"
                disabled={!canConfirm || confirmDestroyMutation.isPending}
                onClick={() => confirmDestroyMutation.mutate()}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-rose-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {confirmDestroyMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Teardown Queued...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Execute Permanent Destruction</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
