'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Rocket, X, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';

interface DeployDialogProps {
  open: boolean;
  onClose: () => void;
  designName: string;
  nodeCount: number;
  templateId?: string | null;
}

export function DeployDialog({ open, onClose, designName, nodeCount, templateId }: DeployDialogProps) {
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState('');
  const [environmentId, setEnvironmentId] = useState('');
  const [error, setError] = useState<string | null>(null);

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
      if (!templateId) throw new Error('This design has no mapped template to deploy yet');
      const res = await api.deployments.createPlan({
        projectId,
        environmentId,
        templateId: templateId!,
        configuration: {},
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: any) => setError(err.message || 'Deployment failed'),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <Rocket className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Deploy "{designName}"</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span>Canvas resources</span>
            <span className="text-slate-200 font-mono">{nodeCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Flow</span>
            <span className="text-indigo-300 font-semibold">Plan &rarr; Review &rarr; Approve &rarr; Apply</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Target Project</label>
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setEnvironmentId('');
            }}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
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
          <label className="text-xs font-semibold text-slate-300">Target Environment</label>
          <select
            value={environmentId}
            onChange={(e) => setEnvironmentId(e.target.value)}
            disabled={!projectId}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
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

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setError(null);
              if (!projectId || !environmentId) {
                setError('Select a project and environment first');
                return;
              }
              deployMutation.mutate();
            }}
            disabled={deployMutation.isPending}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 disabled:opacity-50 flex items-center space-x-2"
          >
            {deployMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Queuing plan...</span>
              </>
            ) : deployMutation.isSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Plan queued</span>
              </>
            ) : (
              <>
                <Rocket className="w-3.5 h-3.5" />
                <span>Generate Plan</span>
              </>
            )}
          </button>
        </div>

        {deployMutation.isSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              Plan queued — track it on the Deployments page.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
