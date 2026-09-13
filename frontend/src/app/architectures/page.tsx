'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../context/auth-context';
import { ProviderIcon } from '../../lib/provider-icon';
import {
  DraftingCompass,
  Plus,
  Trash2,
  ExternalLink,
  Calendar,
  Network,
  Key,
  Workflow,
} from 'lucide-react';

export default function ArchitecturesPage() {
  const { user, quickLogin } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState<'AWS' | 'AZURE' | 'GCP'>('AWS');
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['designs'],
    queryFn: () => api.designs.list(),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; description: string; cloudProvider: string }) =>
      api.designs.create({ ...payload, nodes: [], edges: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designs'] });
      setShowCreate(false);
      setName('');
      setDescription('');
    },
    onError: (err: any) => setFormError(err.message || 'Failed to create design'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.designs.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['designs'] }),
  });

  const designs = data?.designs || [];

  const providerBadge = (p: string) => {
    if (p === 'AWS') return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    if (p === 'AZURE') return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
    if (p === 'GCP') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400">
            <DraftingCompass className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Architectures</h1>
            <p className="text-xs text-slate-400">
              Saved visual designs — canvas state, live Terraform, one-click deploy
            </p>
          </div>
        </div>

        {user ? (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>New Architecture</span>
          </button>
        ) : (
          <button
            onClick={() => quickLogin('DEVELOPER')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-2"
          >
            <Key className="w-4 h-4" />
            <span>Connect to View Designs</span>
          </button>
        )}
      </div>

      {/* Designer entry banner */}
      <Link
        href="/designer"
        className="block p-5 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/50 via-slate-900 to-slate-900 hover:border-indigo-400/50 transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-indigo-600/20 border border-indigo-500/30">
              <Workflow className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Open Visual Designer</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Place resources, wire dependencies, and watch Terraform generate live — then plan,
                approve, and deploy through the platform pipeline.
              </p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
        </div>
      </Link>

      {/* Designs grid */}
      {user && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-44 rounded-2xl border border-slate-800 bg-slate-900/40 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-950/20 text-rose-300 text-xs">
              Failed to load designs: {(error as Error).message}
            </div>
          ) : designs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {designs.map((design) => (
                <div
                  key={design.id}
                  className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <ProviderIcon provider={design.cloudProvider} size={16} />
                        <h2 className="text-sm font-bold text-white tracking-tight">{design.name}</h2>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${providerBadge(design.cloudProvider)}`}>
                        {design.cloudProvider}
                      </span>
                    </div>

                    {design.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2">{design.description}</p>
                    )}

                    <div className="flex items-center space-x-4 text-[11px] text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Network className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{design.nodeCount} resources</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Workflow className="w-3.5 h-3.5 text-violet-400" />
                        <span>{design.edgeCount} links</span>
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {design.updatedAt
                          ? new Date(design.updatedAt).toLocaleDateString()
                          : '—'}
                      </span>
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => {
                          if (confirm(`Delete design "${design.name}"?`)) {
                            deleteMutation.mutate(design.id);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400"
                        title="Delete design"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <Link
                        href={`/designer?id=${design.id}`}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold flex items-center space-x-1"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 space-y-3">
              <DraftingCompass className="w-10 h-10 text-slate-600 mx-auto" />
              <h2 className="text-sm font-semibold text-slate-300">No architectures yet</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Create your first visual design and generate production-ready Terraform from the canvas.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs"
              >
                Create Architecture
              </button>
            </div>
          )}
        </>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">New Architecture</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white text-lg">
                ×
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Design Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production Web Stack"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="What does this architecture run?"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Primary Provider</label>
              <div className="grid grid-cols-3 gap-2">
                {(['AWS', 'AZURE', 'GCP'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProvider(p)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center space-x-1.5 transition-all ${
                      provider === p
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <ProviderIcon provider={p} size={12} />
                    <span>{p}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!name.trim()) {
                    setFormError('Design name is required');
                    return;
                  }
                  setFormError(null);
                  createMutation.mutate({
                    name: name.trim(),
                    description: description.trim(),
                    cloudProvider: provider,
                  });
                }}
                disabled={createMutation.isPending}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create & Open'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
