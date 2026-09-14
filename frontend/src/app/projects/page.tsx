'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Project } from '../../lib/api';
import { useAuth } from '../../context/auth-context';
import {
  FolderGit2,
  Plus,
  Server,
  Layers,
  Calendar,
  User as UserIcon,
  CheckCircle,
  X,
  AlertCircle,
  Key,
} from 'lucide-react';

export default function ProjectsPage() {
  const { user, quickLogin } = useAuth();
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [createDefaults, setCreateDefaults] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch projects from backend
  const {
    data,
    isLoading,
    error,
  } = useQuery({
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
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
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create project');
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
        return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
      case 'staging':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'development':
      default:
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Projects</h1>
              <p className="text-xs text-slate-400">
                Manage cloud infrastructure workspaces and multi-tier environments
              </p>
            </div>
          </div>
        </div>

        {user ? (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Project</span>
          </button>
        ) : (
          <button
            onClick={() => quickLogin('DEVELOPER')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Key className="w-4 h-4" />
            <span>Connect to Manage Projects</span>
          </button>
        )}
      </div>

      {/* Unauthenticated Prompt */}
      {!user && (
        <div className="p-6 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 text-center max-w-lg mx-auto my-8 space-y-3">
          <Key className="w-8 h-8 text-indigo-400 mx-auto" />
          <h2 className="text-sm font-bold text-white">Authentication Required</h2>
          <p className="text-xs text-slate-300">
            Connecting an operator persona allows you to manage isolated projects and environments.
          </p>
          <button
            onClick={() => quickLogin('DEVELOPER')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
          >
            Authenticate as Developer
          </button>
        </div>
      )}

      {/* Projects Grid */}
      {user && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-48 rounded-2xl border border-slate-800 bg-slate-900/40 animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-950/20 text-rose-300 text-xs flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Failed to fetch projects: {(error as Error).message}</span>
            </div>
          ) : data?.projects && data.projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.projects.map((project: Project) => (
                <div
                  key={project.id}
                  className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h2 className="text-base font-bold text-white tracking-tight">{project.name}</h2>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {project.environments?.length ?? 0} envs
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2">
                      {project.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Environments with cloud-account binding (PDF 5.2) */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Environments
                    </span>
                    {project.environments && project.environments.length > 0 ? (
                      <div className="space-y-1.5">
                        {project.environments.map((env) => (
                          <div key={env.id} className="flex items-center gap-2">
                            <span
                              className={`text-[11px] font-medium px-2 py-0.5 rounded-lg border flex-none ${getEnvBadgeColor(
                                env.name
                              )}`}
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
                              className="flex-1 min-w-0 text-[11px] px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
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
                      <span className="text-xs text-slate-500 italic">No environments</span>
                    )}
                  </div>

                  {/* Footer metadata */}
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                    </span>
                    <span className="flex items-center space-x-1 truncate max-w-[120px]">
                      <UserIcon className="w-3 h-3" />
                      <span>{project.owner?.name ?? 'Owner'}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 space-y-3">
              <FolderGit2 className="w-10 h-10 text-slate-600 mx-auto" />
              <h2 className="text-sm font-semibold text-slate-300">No projects found</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Get started by creating your first project workspace with default development and production environments.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/30"
              >
                Create Project
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <FolderGit2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Create Infrastructure Project</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Project Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Web Infrastructure"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Description (optional)</label>
                <textarea
                  placeholder="Multi-tier production application stack..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="createDefaults"
                  checked={createDefaults}
                  onChange={(e) => setCreateDefaults(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="createDefaults" className="text-xs text-slate-300">
                  Auto-create default environments (<span className="text-emerald-400">dev</span>, <span className="text-amber-400">stage</span>, <span className="text-rose-400">prod</span>)
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
