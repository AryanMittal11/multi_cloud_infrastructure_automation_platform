'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Rocket, X, AlertCircle, Loader2, CheckCircle2, ArrowRight, Layers, Cloud } from 'lucide-react';
import { api, Deployment } from '../../lib/api';

interface DeployDialogProps {
  open: boolean;
  onClose: () => void;
  designId: string | null;
  designName: string;
  nodeCount: number;
  cloudProvider: 'AWS' | 'AZURE' | 'GCP';
  nodes: any[];
  edges: any[];
  onSaveBeforeDeploy?: () => Promise<string | null>;
}

export function DeployDialog({
  open,
  onClose,
  designId,
  designName,
  nodeCount,
  cloudProvider,
  nodes,
  edges,
  onSaveBeforeDeploy,
}: DeployDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState('');
  const [environmentId, setEnvironmentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deployedItem, setDeployedItem] = useState<Deployment | null>(null);

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
    enabled: open,
  });

  const projects = projectsData?.projects || [];
  const selectedProject = projects.find((p) => p.id === projectId);
  const environments = selectedProject?.environments || [];

  const deployMutation = useMutation({
    mutationFn: async () => {
      if (nodeCount === 0) {
        throw new Error('Your canvas is empty. Add at least one resource before deploying.');
      }

      let targetDesignId = designId;
      if (!targetDesignId && onSaveBeforeDeploy) {
        targetDesignId = await onSaveBeforeDeploy();
      }

      if (!targetDesignId) {
        // Fallback: create design record first
        const createRes = await api.designs.create({
          name: designName.trim() || 'Untitled Architecture',
          description: `Visual architecture with ${nodeCount} resources across ${cloudProvider}`,
          cloudProvider,
          nodes,
          edges,
        });
        targetDesignId = createRes.design.id;
      }

      const res = await api.designs.deploy(targetDesignId, {
        projectId,
        environmentId,
        name: designName.trim(),
        cloudProvider,
        nodes,
        edges,
      });

      return res;
    },
    onSuccess: (data) => {
      setDeployedItem(data.deployment);
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['designs'] });
    },
    onError: (err: any) => setError(err.message || 'Failed to deploy architecture design'),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
              <Rocket className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Deploy &quot;{designName}&quot;</h3>
              <p className="text-[10px] text-neutral-400">Deploy your custom visual design</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 text-[11px] text-neutral-400 space-y-2">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-neutral-400" />
              Canvas Resources
            </span>
            <span className="text-neutral-200 font-mono font-semibold">{nodeCount} resource(s)</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-neutral-400" />
              Target Provider
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-200">
              {cloudProvider}
            </span>
          </div>

          {nodes.length > 0 && (
            <div className="pt-1.5 border-t border-neutral-800/80">
              <span className="text-[10px] text-neutral-500 block mb-1">Architecture Topology:</span>
              <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                {nodes.map((n, idx) => (
                  <span
                    key={n.id || idx}
                    className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-300 font-mono"
                  >
                    {n.data?.label || n.kind}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-1 text-[10px] text-neutral-500 flex justify-between">
            <span>Execution Pipeline</span>
            <span className="text-neutral-300">Terraform Plan &rarr; Review &rarr; Apply</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-300">Target Project</label>
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setEnvironmentId('');
            }}
            disabled={deployMutation.isPending || deployMutation.isSuccess}
            className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-neutral-400 disabled:opacity-50"
          >
            <option value="">Select project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-300">Target Environment</label>
          <select
            value={environmentId}
            onChange={(e) => setEnvironmentId(e.target.value)}
            disabled={!projectId || deployMutation.isPending || deployMutation.isSuccess}
            className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-neutral-400 disabled:opacity-50"
          >
            <option value="">Select environment...</option>
            {environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
                {env.cloudAccountId ? '' : ' (no cloud account)'}
              </option>
            ))}
          </select>
        </div>

        {deployMutation.isSuccess && deployedItem && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs space-y-2">
            <div className="flex items-center space-x-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Plan queued for &quot;{designName}&quot;!</span>
            </div>
            <p className="text-[11px] text-emerald-300/80">
              The execution worker has started planning your custom visual architecture.
            </p>
            <button
              onClick={() => {
                onClose();
                router.push(`/deployments/${deployedItem.id}`);
              }}
              className="w-full mt-1.5 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shadow"
            >
              <span>View Deployment Pipeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white"
          >
            {deployMutation.isSuccess ? 'Close' : 'Cancel'}
          </button>
          {!deployMutation.isSuccess && (
            <button
              onClick={() => {
                setError(null);
                if (!projectId || !environmentId) {
                  setError('Select a project and environment first');
                  return;
                }
                deployMutation.mutate();
              }}
              disabled={deployMutation.isPending || nodeCount === 0}
              className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-neutral-900 font-semibold text-xs shadow-md shadow-black/30 disabled:opacity-50 flex items-center space-x-2"
            >
              {deployMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Queuing plan for design...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-3.5 h-3.5" />
                  <span>Generate Plan for Design</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
