'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../context/auth-context';
import { ProviderIcon } from '../../lib/provider-icon';
import { PageHeader } from '../../components/cerebro/app-shell';
import { Panel, EmptyState, Skeleton, Modal, ConfirmDialog, useToast } from '../../components/cerebro/ui-kit';
import {
  DraftingCompass,
  Plus,
  Trash2,
  ExternalLink,
  Calendar,
  Network,
  Workflow,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function ArchitecturesPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
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
      setFormError(null);
      push({ title: 'Architecture created', tone: 'success' });
    },
    onError: (err: any) =>
      setFormError(
        err?.status === 403
          ? 'Creating architectures requires the Developer role or above'
          : err.message || 'Failed to create design',
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.designs.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designs'] });
      push({ title: 'Architecture deleted', tone: 'success' });
    },
    onError: (err: any) => push({ title: err?.message || 'Failed to delete design', tone: 'fail' }),
  });

  const designs = data?.designs || [];

  const providerColor = (p: string) => {
    if (p === 'AWS') return '#b45309';
    if (p === 'AZURE') return '#0369a1';
    if (p === 'GCP') return '#047857';
    return 'var(--accent)';
  };

  return (
    <div>
      <PageHeader
        title="Saved Designs"
        sub="Saved visual designs — canvas state, live Terraform, one-click deploy"
        actions={
          user && (
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> New architecture
            </button>
          )
        }
      />

      {/* Designer entry */}
      <Link
        href="/designer"
        className="panel px-5 py-4 mb-5 flex items-center justify-between group transition-shadow hover:shadow-[var(--shadow-md)]"
      >
        <div className="flex items-center gap-4">
          <span
            className="p-2.5 rounded-[10px] flex items-center justify-center"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            <Workflow size={18} />
          </span>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Open Visual Designer
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
              Place resources, wire dependencies, and watch Terraform generate live — then plan, approve, and
              deploy through the platform pipeline.
            </p>
          </div>
        </div>
        <ExternalLink size={15} className="group-hover:translate-x-0.5 transition-transform" style={{ color: 'var(--accent)' }} />
      </Link>

      {user && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <Skeleton key={n} className="h-44" />
              ))}
            </div>
          ) : error ? (
            <Panel>
              <div className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--fail)' }}>
                <AlertCircle size={16} className="shrink-0" />
                <span>Failed to load designs: {(error as Error).message}</span>
              </div>
            </Panel>
          ) : designs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {designs.map((design) => (
                <div key={design.id} className="panel p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <ProviderIcon provider={design.cloudProvider} size={15} />
                        <h2 className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>
                          {design.name}
                        </h2>
                      </div>
                      <span
                        className="chip flex-none uppercase"
                        style={{ color: providerColor(design.cloudProvider), borderColor: providerColor(design.cloudProvider) }}
                      >
                        {design.cloudProvider}
                      </span>
                    </div>

                    {design.description && (
                      <p className="text-[11px] line-clamp-2" style={{ color: 'var(--ink-muted)' }}>
                        {design.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                      <span className="flex items-center gap-1">
                        <Network size={12} style={{ color: 'var(--accent)' }} />
                        {design.nodeCount} resources
                      </span>
                      <span className="flex items-center gap-1">
                        <Workflow size={12} style={{ color: 'var(--accent)' }} />
                        {design.edgeCount} links
                      </span>
                    </div>
                  </div>

                  <div
                    className="pt-3 flex items-center justify-between"
                    style={{ borderTop: '1px solid var(--border-faint)' }}
                  >
                    <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--ink-faint)' }}>
                      <Calendar size={11} />
                      {design.updatedAt ? new Date(design.updatedAt).toLocaleDateString() : '—'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setDeleteTarget({ id: design.id, name: design.name })}
                        className="icon-btn"
                        style={{ color: 'var(--ink-faint)' }}
                        title="Delete design"
                        aria-label={`Delete design ${design.name}`}
                      >
                        <Trash2 size={13} />
                      </button>
                      <Link href={`/designer?id=${design.id}`} className="btn btn-sm">
                        <span>Open</span>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Panel>
              <EmptyState
                icon={<DraftingCompass size={28} />}
                title="No architectures yet"
                body="Create your first visual design and generate production-ready Terraform from the canvas."
                action={
                  <button className="btn-primary" onClick={() => setShowCreate(true)}>
                    <Plus size={14} /> New architecture
                  </button>
                }
              />
            </Panel>
          )}
        </>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        title={`Delete “${deleteTarget?.name ?? ''}”?`}
        body="The saved canvas, its Terraform mapping, and deploy history links for this design will be removed. This cannot be undone."
        confirmLabel="Delete design"
        danger
      />

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New architecture">
        {formError && (
          <div
            className="p-3 mb-4 rounded-[10px] flex items-start gap-2 text-xs"
            style={{ background: 'var(--fail-soft)', border: '1px solid var(--fail)', color: 'var(--fail)' }}
          >
            <AlertCircle size={14} className="flex-none mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="eyebrow block mb-1.5">Design name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production Web Stack"
              className="input w-full"
            />
          </div>

          <div>
            <label className="eyebrow block mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What does this architecture run?"
              className="input w-full"
            />
          </div>

          <div>
            <label className="eyebrow block mb-1.5">Primary provider</label>
            <div className="grid grid-cols-3 gap-2">
              {(['AWS', 'AZURE', 'GCP'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvider(p)}
                  className={provider === p ? 'btn-primary' : 'btn-ghost'}
                  style={{ justifyContent: 'center' }}
                >
                  <ProviderIcon provider={p} size={12} />
                  <span>{p}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>
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
              className="btn-primary"
            >
              {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              {createMutation.isPending ? 'Creating…' : 'Create & open'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
