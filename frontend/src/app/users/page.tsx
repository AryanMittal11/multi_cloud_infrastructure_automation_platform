'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, UserWithCounts } from '../../lib/api';
import { useAuth } from '../../context/auth-context';
import { PageHeader } from '../../components/cerebro/app-shell';
import {
  AlertCircle,
  Crown,
  Code2,
  Eye,
  Loader2,
  MoreHorizontal,
  Shield,
  Trash2,
  UserCog,
  Users,
} from 'lucide-react';

const ROLE_BADGE: Record<string, { icon: React.ReactNode; label: string; bg: string; color: string; border: string }> = {
  ADMIN: {
    icon: <Crown size={11} />,
    label: 'Site Owner',
    bg: 'var(--accent-soft)',
    color: 'var(--accent-strong)',
    border: 'var(--accent-border)',
  },
  DEVELOPER: {
    icon: <Code2 size={11} />,
    label: 'Developer',
    bg: 'rgba(52, 211, 153, 0.1)',
    color: '#34d399',
    border: 'rgba(52, 211, 153, 0.3)',
  },
  VIEWER: {
    icon: <Eye size={11} />,
    label: 'Viewer',
    bg: 'rgba(148, 163, 184, 0.1)',
    color: '#94a3b8',
    border: 'rgba(148, 163, 184, 0.3)',
  },
};

export default function UsersPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Redirect non-admin users
  if (currentUser && currentUser.role !== 'ADMIN') {
    router.replace('/dashboard');
    return null;
  }

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.users.list(),
    enabled: !!currentUser && currentUser.role === 'ADMIN',
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'DEVELOPER' | 'VIEWER' }) =>
      api.users.updateRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setActionUserId(null);
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.message || 'Failed to update role');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmDelete(null);
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.message || 'Failed to delete user');
    },
  });

  const users: UserWithCounts[] = data?.users ?? [];
  const isBusy = updateRoleMutation.isPending || deleteMutation.isPending;

  return (
    <div className="animate-in fade-in duration-200">
      <PageHeader
        title="User Management"
        sub={`${users.length} platform user${users.length !== 1 ? 's' : ''} · manage roles and access`}
      />

      {error && (
        <div
          className="p-3 mb-4 rounded-[10px] flex items-start gap-2 text-xs"
          style={{ background: 'var(--fail-soft)', border: '1px solid var(--fail)', color: 'var(--fail)' }}
        >
          <AlertCircle size={14} className="flex-none mt-0.5" />
          <span>{error}</span>
          <button className="ml-auto text-[10px] underline" onClick={() => setError(null)}>dismiss</button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--ink-muted)' }}>
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No users found.</p>
        </div>
      ) : (
        <div className="rounded-[var(--r-lg)] border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
          {/* Table Header */}
          <div
            className="grid items-center gap-4 px-5 py-3 text-[11px] font-bold uppercase tracking-wider"
            style={{
              gridTemplateColumns: '1fr 1fr 120px 100px 80px',
              color: 'var(--ink-faint)',
              borderBottom: '1px solid var(--border)',
              background: 'var(--surface-2)',
            }}
          >
            <span>User</span>
            <span>Email</span>
            <span>Role</span>
            <span>Activity</span>
            <span className="text-right">Actions</span>
          </div>

          {/* User Rows */}
          {users.map((u) => {
            const badge = ROLE_BADGE[u.role] || ROLE_BADGE.VIEWER;
            const isOwner = u.role === 'ADMIN';
            const isSelf = u.id === currentUser?.id;
            const counts = u._count || {};

            return (
              <div key={u.id} className="relative">
                <div
                  className="grid items-center gap-4 px-5 py-3.5 text-sm transition-colors hover:bg-[var(--surface)]"
                  style={{
                    gridTemplateColumns: '1fr 1fr 120px 100px 80px',
                    borderBottom: '1px solid var(--border-faint)',
                  }}
                >
                  {/* Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold uppercase flex-none"
                      style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                    >
                      {u.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                        {u.name}
                        {isSelf && <span className="text-[10px] ml-1.5" style={{ color: 'var(--ink-muted)' }}>(you)</span>}
                      </p>
                      {isOwner && (
                        <p className="text-[10px]" style={{ color: 'var(--accent)' }}>Platform owner</p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <span className="mono text-xs truncate" style={{ color: 'var(--ink-muted)' }}>
                    {u.email}
                  </span>

                  {/* Role Badge */}
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold w-fit"
                    style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                  >
                    {badge.icon}
                    {badge.label}
                  </span>

                  {/* Activity counts */}
                  <div className="text-[11px] space-y-0.5" style={{ color: 'var(--ink-muted)' }}>
                    <p>{counts.projects ?? 0} projects</p>
                    <p>{counts.deployments ?? 0} deploys</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    {!isOwner && (
                      <button
                        className="icon-btn"
                        onClick={() => setActionUserId(actionUserId === u.id ? null : u.id)}
                        title="Manage user"
                        disabled={isBusy}
                      >
                        <MoreHorizontal size={15} />
                      </button>
                    )}
                    {isOwner && (
                      <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>
                        <Shield size={13} />
                      </span>
                    )}
                  </div>
                </div>

                {/* Action dropdown */}
                {actionUserId === u.id && !isOwner && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setActionUserId(null)} />
                    <div
                      className="absolute right-4 top-full z-50 w-[200px] rounded-[var(--r-md)] shadow-xl py-1"
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-strong)',
                        animation: 'palette-in 120ms var(--ease-out)',
                      }}
                    >
                      <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
                        Change Role
                      </p>
                      {(['DEVELOPER', 'VIEWER'] as const).map((role) => (
                        <button
                          key={role}
                          className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-[var(--surface)] transition-colors disabled:opacity-50"
                          style={{ color: u.role === role ? 'var(--accent)' : 'var(--ink-secondary)' }}
                          disabled={u.role === role || isBusy}
                          onClick={() => updateRoleMutation.mutate({ id: u.id, role })}
                        >
                          <UserCog size={13} />
                          {role === 'DEVELOPER' ? 'Developer' : 'Viewer'}
                          {u.role === role && <span className="ml-auto text-[10px]">current</span>}
                        </button>
                      ))}
                      <div className="my-1 border-t" style={{ borderColor: 'var(--border-faint)' }} />
                      <button
                        className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-[var(--surface)] transition-colors"
                        style={{ color: 'var(--fail)' }}
                        onClick={() => { setActionUserId(null); setConfirmDelete(u.id); }}
                      >
                        <Trash2 size={13} />
                        Remove user
                      </button>
                    </div>
                  </>
                )}

                {/* Delete confirmation */}
                {confirmDelete === u.id && (
                  <>
                    <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setConfirmDelete(null)} />
                    <div
                      className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[400px] rounded-[var(--r-lg)] p-6 shadow-2xl"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)' }}
                    >
                      <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--ink)' }}>Remove user?</h3>
                      <p className="text-sm mb-1" style={{ color: 'var(--ink-secondary)' }}>
                        This will permanently delete <strong>{u.name}</strong> ({u.email}) and all their associated data.
                      </p>
                      <p className="text-xs mb-5" style={{ color: 'var(--fail)' }}>This action cannot be undone.</p>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="px-4 py-2 rounded-[var(--r-sm)] text-xs font-medium"
                          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink-secondary)' }}
                          onClick={() => setConfirmDelete(null)}
                        >
                          Cancel
                        </button>
                        <button
                          className="px-4 py-2 rounded-[var(--r-sm)] text-xs font-semibold text-white"
                          style={{ background: 'var(--fail)' }}
                          disabled={isBusy}
                          onClick={() => deleteMutation.mutate(u.id)}
                        >
                          {deleteMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          {deleteMutation.isPending ? ' Removing...' : ' Remove user'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary footer */}
      {!isLoading && users.length > 0 && (
        <div className="mt-4 flex items-center gap-4 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
          <span>{users.filter(u => u.role === 'ADMIN').length} site owner</span>
          <span>·</span>
          <span>{users.filter(u => u.role === 'DEVELOPER').length} developer{users.filter(u => u.role === 'DEVELOPER').length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{users.filter(u => u.role === 'VIEWER').length} viewer{users.filter(u => u.role === 'VIEWER').length !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}
