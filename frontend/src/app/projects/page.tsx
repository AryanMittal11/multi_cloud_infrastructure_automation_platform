'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Project } from '../../lib/api';
import { useAuth } from '../../context/auth-context';
import { PageHeader } from '../../components/cerebro/app-shell';
import { Panel, EmptyState, Skeleton, Modal, useToast } from '../../components/cerebro/ui-kit';
import {
  FolderGit2,
  Plus,
  Calendar,
  User as UserIcon,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function ProjectsPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [createDefaults, setCreateDefaults] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch projects from backend
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
    enabled: !!user,
  });

  // Cloud accounts for environment binding (PDF 5.2 — accounts associate with environments)
  const { data: accountsData } = useQuery({
    queryKey: ['cloud-accounts'],
    queryFn: () => api.cloudAccounts.list(),
    enabled: !!user,
  });
  const accounts = accountsData?.cloudAccounts ?? [];

  // Bind / unbind a cloud account on an environment
  const bindMutation = useMutation({
    mutationFn: (input: { projectId: string; environmentId: string; cloudAccountId: string | null }) =>
      api.projects.bindCloudAccount(input.projectId, input.environmentId, input.cloudAccountId),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      push({
        title: vars.cloudAccountId
          ? 'Cloud account bound to environment'
          : 'Cloud account unbound from environment',
        tone: 'success',
      });
    },
    onError: (err: any) => {
      push({
        title:
          err?.status === 403
            ? 'Binding requires the Developer role or above'
            : err?.message || 'Failed to update binding',
        tone: 'fail',
      });
    },
  });

  // Create Project mutation
  const createMutation = useMutation({
    mutationFn: (newProject: {
      name: string;
      description?: string;
      createDefaultEnvironments?: boolean;
    }) => api.projects.create(newProject),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      setIsCreateModalOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
      setFormError(null);
      push({ title: 'Project created', tone: 'success' });
    },
    onError: (err: any) => {
      setFormError(
        err?.status === 403
          ? 'Creating projects requires the Developer role or above'
          : err.message || 'Failed to create project',
      );
    },
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      setFormError('Project name is required');
      return;
    }
    setFormError(null);
    createMutation.mutate({
      name: newProjectName.trim(),
      description: newProjectDesc.trim() || undefined,
      createDefaultEnvironments: createDefaults,
    });
  };

  const getEnvBadgeColor = (name: string) => {
    switch (name.toLowerCase()) {
      case 'production':
        return { color: 'var(--fail)', background: 'var(--fail-soft)', border: '1px solid var(--fail-border, var(--fail))' };
      case 'staging':
        return { color: 'var(--warn)', background: 'var(--warn-soft)', border: '1px solid var(--warn-border, var(--warn))' };
      default:
        return { color: 'var(--ok)', background: 'var(--ok-soft)', border: '1px solid var(--ok-border, var(--ok))' };
    }
  };

  return (
    <div>
      <PageHeader
        title="Projects"
        sub="Manage cloud infrastructure workspaces and multi-tier environments"
        actions={
          user && (
            <button className="btn-primary" onClick={() => setIsCreateModalOpen(true)}>
              <Plus size={14} /> New project
            </button>
          )
        }
      />

      {user && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <Skeleton key={n} className="h-56" />
              ))}
            </div>
          ) : error ? (
            <Panel>
              <div className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--fail)' }}>
                <AlertCircle size={16} className="shrink-0" />
                <span>Failed to fetch projects: {(error as Error).message}</span>
              </div>
            </Panel>
          ) : data?.projects && data.projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {data.projects.map((project: Project) => (
                <div
                  key={project.id}
                  className="panel p-5 flex flex-col justify-between gap-4 transition-shadow hover:shadow-[var(--shadow-md)]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="p-2 rounded-[10px] flex-none flex items-center justify-center"
                          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                        >
                          <FolderGit2 size={16} />
                        </span>
                        <h2 className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>
                          {project.name}
                        </h2>
                      </div>
                      <span className="chip flex-none">{project.environments?.length ?? 0} envs</span>
                    </div>

                    <p className="text-xs mt-2.5 line-clamp-2" style={{ color: 'var(--ink-muted)' }}>
                      {project.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Environments with cloud-account binding (PDF 5.2) */}
                  <div className="space-y-1.5 pt-3" style={{ borderTop: '1px solid var(--border-faint)' }}>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--ink-faint)' }}
                    >
                      Environments
                    </span>
                    {project.environments && project.environments.length > 0 ? (
                      <div className="space-y-1.5">
                        {project.environments.map((env) => (
                          <div key={env.id} className="flex items-center gap-2">
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-none uppercase tracking-wide"
                              style={getEnvBadgeColor(env.name)}
                            >
                              {env.name}
                            </span>
                            <select
                              value={env.cloudAccountId ?? ''}
                              onChange={(e) =>
                                bindMutation.mutate({
                                  projectId: project.id,
                                  environmentId: env.id,
                                  cloudAccountId: e.target.value || null,
                                })
                              }
                              disabled={bindMutation.isPending}
                              className="input flex-1 min-w-0 text-[11px]"
                              style={{ height: 28, padding: '0 8px' }}
                              aria-label={`Cloud account for ${env.name}`}
                            >
                              <option value="">No cloud account bound</option>
                              {accounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.provider} · {a.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs italic" style={{ color: 'var(--ink-faint)' }}>
                        No environments
                      </span>
                    )}
                  </div>

                  {/* Footer metadata */}
                  <div
                    className="pt-3 flex items-center justify-between text-[11px]"
                    style={{ borderTop: '1px solid var(--border-faint)', color: 'var(--ink-faint)' }}
                  >
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                    </span>
                    <span className="flex items-center gap-1 truncate max-w-[140px]">
                      <UserIcon size={11} />
                      <span className="truncate">{project.owner?.name ?? 'Owner'}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Panel>
              <EmptyState
                icon={<FolderGit2 size={28} />}
                title="No projects yet"
                body="Create your first project workspace with default development, staging, and production environments."
                action={
                  <button className="btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                    <Plus size={14} /> New project
                  </button>
                }
              />
            </Panel>
          )}
        </>
      )}

      {/* Create Project Modal */}
      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create infrastructure project"
      >
        {formError && (
          <div
            className="p-3 mb-4 rounded-[10px] flex items-start gap-2 text-xs"
            style={{ background: 'var(--fail-soft)', border: '1px solid var(--fail)', color: 'var(--fail)' }}
          >
            <AlertCircle size={14} className="flex-none mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-secondary)' }}>
              Project name *
            </label>
            <input
              type="text"
              placeholder="e.g. Acme Web Infrastructure"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-secondary)' }}>
              Description (optional)
            </label>
            <textarea
              placeholder="Multi-tier production application stack..."
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              rows={3}
              className="input w-full"
            />
          </div>

          <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--ink-secondary)' }}>
            <input
              type="checkbox"
              checked={createDefaults}
              onChange={(e) => setCreateDefaults(e.target.checked)}
            />
            Auto-create default environments (development, staging, production)
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              {createMutation.isPending ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
