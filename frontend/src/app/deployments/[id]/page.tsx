'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Deployment, Resource } from '../../../lib/api';
import { useAuth } from '../../../context/auth-context';
import { ExecutionStatusPipeline } from '../../../components/deployments/execution-status-pipeline';
import { LogTerminal } from '../../../components/deployments/log-terminal';
import { ResourceTable } from '../../../components/deployments/resource-table';
import { SafeDestructionModal } from '../../../components/deployments/safe-destruction-modal';
import { ConfirmApplyModal } from '../../../components/deployments/confirm-apply-modal';
import {
  ArrowLeft,
  Terminal,
  RefreshCw,
  FolderGit2,
  Layers,
  Calendar,
  User as UserIcon,
  PlayCircle,
  AlertCircle,
  CheckCircle2,
  Check,
  ShieldCheck,
  Radio,
  FileCode,
  Trash2,
} from 'lucide-react';

export default function DeploymentMonitoringPage() {
  const params = useParams();
  const deploymentId = params.id as string;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showConfig, setShowConfig] = useState(false);
  const [isDestructionModalOpen, setIsDestructionModalOpen] = useState(false);

  // Poll deployment details every 2 seconds if in active running/queued state
  const {
    data: deploymentData,
    isLoading: deploymentLoading,
    error: deploymentError,
    refetch: refetchDeployment,
    isRefetching,
  } = useQuery({
    queryKey: ['deployment-detail', deploymentId],
    queryFn: () => api.deployments.get(deploymentId),
    enabled: !!deploymentId,
    refetchInterval: (query) => {
      const status = query.state.data?.deployment?.status;
      if (status === 'RUNNING' || status === 'QUEUED' || status === 'PLANNING') {
        return 2000;
      }
      return false;
    },
  });

  // Query resources associated with this deployment
  const {
    data: resourcesData,
    isLoading: resourcesLoading,
    refetch: refetchResources,
  } = useQuery({
    queryKey: ['deployment-resources', deploymentId],
    queryFn: () => api.resources.list({ deploymentId }),
    enabled: !!deploymentId,
    refetchInterval: (query) => {
      const status = deploymentData?.deployment?.status;
      if (status === 'RUNNING') return 2500;
      return false;
    },
  });

  const [showConfirmApply, setShowConfirmApply] = useState(false);

  // Approve mutation if deployment is in PLANNED state
  const approveMutation = useMutation({
    mutationFn: (confirmationKeyword?: string) =>
      api.deployments.approve(deploymentId, { confirmationKeyword }),
    onSuccess: () => {
      setShowConfirmApply(false);
      queryClient.invalidateQueries({ queryKey: ['deployment-detail', deploymentId] });
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });

  const deployment = deploymentData?.deployment;
  const isLive =
    deployment?.status === 'RUNNING' ||
    deployment?.status === 'QUEUED' ||
    deployment?.status === 'PLANNING';

  const isOperator = user?.role === 'ADMIN' || user?.role === 'DEVELOPER';

  if (deploymentLoading) {
    return (
      <div className="p-16 text-center space-y-4">
        <div className="w-10 h-10 rounded-full border-3 border-indigo-500 border-t-transparent animate-spin mx-auto" />
        <h2 className="text-sm font-bold text-white">Connecting to Execution Telemetry...</h2>
        <p className="text-xs text-slate-400">Loading deployment #{deploymentId?.slice(0, 8)}</p>
      </div>
    );
  }

  if (deploymentError || !deployment) {
    return (
      <div className="p-8 max-w-lg mx-auto rounded-2xl border border-rose-500/30 bg-rose-950/20 text-rose-300 space-y-4 text-center">
        <AlertCircle className="w-8 h-8 mx-auto" />
        <h2 className="text-base font-bold">Deployment Not Found</h2>
        <p className="text-xs text-rose-200/80">
          {(deploymentError as Error)?.message || 'The specified deployment record could not be retrieved.'}
        </p>
        <Link
          href="/deployments"
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Deployments</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center space-x-4">
          <Link
            href="/deployments"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Back to Deployments"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-mono">
                Deployment #{deployment.id.slice(0, 8)}
              </h1>
              {isLive && (
                <span className="flex items-center space-x-1.5 text-[11px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-800/40 animate-pulse">
                  <Radio className="w-3 h-3" />
                  <span>Live</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Target: <strong className="text-slate-200">{deployment.project?.name}</strong> &bull; Env:{' '}
              <strong className="text-indigo-300">{deployment.environment?.name}</strong>
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              refetchDeployment();
              refetchResources();
            }}
            disabled={isRefetching}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs transition-colors"
            title="Refresh state"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium flex items-center space-x-1.5 transition-colors"
          >
            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
            <span>{showConfig ? 'Hide Config' : 'View Config'}</span>
          </button>

          {deployment.status === 'PLANNED' && (
            <button
              onClick={() =>
                deployment.operationType === 'DESTROY'
                  ? setShowConfirmApply(true)
                  : approveMutation.mutate(undefined)
              }
              disabled={!isOperator || approveMutation.isPending}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{approveMutation.isPending ? 'Queuing...' : 'Approve & Execute'}</span>
            </button>
          )}

          {deployment.status === 'SUCCEEDED' && deployment.operationType !== 'DESTROY' && (
            <button
              onClick={() => setIsDestructionModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-600/40 text-rose-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-md"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Tear Down Environment</span>
            </button>
          )}
        </div>
      </div>

      {/* Safe Destruction Modal */}
      <SafeDestructionModal
        deployment={deployment}
        isOpen={isDestructionModalOpen}
        onClose={() => setIsDestructionModalOpen(false)}
      />

      {/* Expandable Submitted Configuration Drawer */}
      {showConfig && (
        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/80 space-y-2 animate-in fade-in">
          <span className="text-xs font-bold text-slate-300">Submitted Parameter Configuration:</span>
          <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto max-h-56">
            {JSON.stringify(deployment.configuration, null, 2)}
          </pre>
        </div>
      )}

      {/* 1. Execution Status Pipeline */}
      <ExecutionStatusPipeline
        status={deployment.status}
        operationType={deployment.operationType}
        createdAt={deployment.createdAt}
        planTime={deployment.planTime}
        applyTime={deployment.applyTime}
        executionReference={deployment.executionReference}
      />

      {/* 2. Provisioned Resources Table */}
      <ResourceTable
        resources={resourcesData?.resources || []}
        isLoading={resourcesLoading}
      />

      {/* 3. Real-time Log Terminal View */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-300">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span>Execution Console & Worker Telemetry</span>
        </div>

        <LogTerminal
          planOutput={deployment.planOutput}
          applyOutput={deployment.applyOutput}
          status={deployment.status}
        />
      </div>

      {/* Destructive approval confirmation */}
      {showConfirmApply && (
        <ConfirmApplyModal
          deployment={deployment}
          isPending={approveMutation.isPending}
          error={approveMutation.error ? (approveMutation.error as Error).message : null}
          onConfirm={() => approveMutation.mutate('CONFIRM_APPLY')}
          onClose={() => setShowConfirmApply(false)}
        />
      )}
    </div>
  );
}
