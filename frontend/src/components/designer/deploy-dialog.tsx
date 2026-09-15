'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Rocket, X, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';

interface DeployDialogProps {
  open: boolean;
  onClose: () => void;
  designName: string;
  nodeCount: number;
  /** Primary template reference of the design (e.g. `templates/aws/aws_ec2_web`). */
  templateRef?: string | null;
}

export function DeployDialog({ open, onClose, designName, nodeCount, templateRef }: DeployDialogProps) {
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState('');
  const [environmentId, setEnvironmentId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
    enabled: open,
  });

  // Resolve the backend template from the design's template reference
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.templates.list(),
    enabled: open,
  });

  const resolvedTemplate = useMemo(
    () => templatesData?.templates.find((t) => t.templateReference === templateRef) ?? null,
    [templatesData, templateRef]
  );

  // Seed configuration defaults from the template's JSONSchema
  const defaultConfig = useMemo(() => {
    const initial: Record<string, any> = {};
    if (resolvedTemplate?.inputSchema?.properties) {
      Object.entries(resolvedTemplate.inputSchema.properties).forEach(([key, prop]: [string, any]) => {
        if (prop.default !== undefined) initial[key] = prop.default;
      });
    }
    return initial;
  }, [resolvedTemplate]);

  const projects = projectsData?.projects || [];
  const selectedProject = projects.find((p) => p.id === projectId);
  const environments = selectedProject?.environments || [];

  const deployMutation = useMutation({
    mutationFn: async () => {
      if (!resolvedTemplate) {
        throw new Error(
          templateRef
            ? `No catalog template matches "${templateRef}" — sync the template catalog first.`
            : 'Add a node to the canvas so the design maps to a deployable template.'
        );
      }
      const res = await api.deployments.createPlan({
        projectId,
        environmentId,
        templateId: resolvedTemplate.id,
        configuration: defaultConfig,
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
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <Rocket className="w-5 h-5 text-neutral-300" />
            <h3 className="text-sm font-bold text-white">Deploy &quot;{designName}&quot;</h3>
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

        <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
          <div className="flex justify-between">
            <span>Canvas resources</span>
            <span className="text-neutral-200 font-mono">{nodeCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Primary template</span>
            {templatesLoading ? (
              <span className="text-neutral-500">resolving…</span>
            ) : resolvedTemplate ? (
              <span className="text-neutral-200 font-semibold">{resolvedTemplate.name}</span>
            ) : (
              <span className="text-rose-400">no matching template</span>
            )}
          </div>
          <div className="flex justify-between">
            <span>Flow</span>
            <span className="text-neutral-200 font-semibold">Plan &rarr; Review &rarr; Approve &rarr; Apply</span>
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
            className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-neutral-400"
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
            disabled={!projectId}
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

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white"
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
            disabled={deployMutation.isPending || !resolvedTemplate}
            className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-neutral-900 font-semibold text-xs shadow-md shadow-black/30 disabled:opacity-50 flex items-center space-x-2"
          >
            {deployMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Queuing plan...</span>
              </>
            ) : deployMutation.isSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-neutral-200" />
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
          <div className="p-3 rounded-xl bg-white/5 border border-neutral-500/30 text-neutral-200 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Plan queued — track it on the Deployments page.</span>
          </div>
        )}
      </div>
    </div>
  );
}
