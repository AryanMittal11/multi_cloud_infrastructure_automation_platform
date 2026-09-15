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
};

export default function UsersPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [selectedActivityUserId, setSelectedActivityUserId] = useState<string | null>(null);
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

  const { data: activityData, isLoading: isActivityLoading } = useQuery({
    queryKey: ['user-activity', selectedActivityUserId],
    queryFn: () => api.users.getActivity(selectedActivityUserId!),
    enabled: !!selectedActivityUserId,
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
  const isBusy = deleteMutation.isPending;

  return (
    <div className="animate-in fade-in duration-200">
      <PageHeader
        title="User Management"
        sub={`${users.length} registered user${users.length !== 1 ? 's' : ''} · site owner oversight & activity tracking`}
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
              gridTemplateColumns: '1fr 1fr 120px 140px 120px',
              color: 'var(--ink-faint)',
              borderBottom: '1px solid var(--border)',
              background: 'var(--surface-2)',
            }}
          >
            <span>User</span>
            <span>Email</span>
            <span>Role</span>
            <span>Activity Overview</span>
            <span className="text-right">Actions</span>
          </div>

          {/* User Rows */}
          {users.map((u) => {
            const badge = ROLE_BADGE[u.role] || ROLE_BADGE.DEVELOPER;
            const isOwner = u.role === 'ADMIN';
            const isSelf = u.id === currentUser?.id;
            const counts = u._count || {};

            return (
              <div key={u.id} className="relative">
                <div
                  className="grid items-center gap-4 px-5 py-3.5 text-sm transition-colors hover:bg-[var(--surface)]"
                  style={{
                    gridTemplateColumns: '1fr 1fr 120px 140px 120px',
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
                        <p className="text-[10px]" style={{ color: 'var(--accent)' }}>Site owner</p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <span className="mono text-xs truncate" style={{ color: 'var(--ink-muted)' }}>
                    {u.email}
                  </span>

                  {/* Role Badge */}
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold w-fit"
                    style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                  >
                    {badge.icon}
                    {badge.label}
                  </span>

                  {/* Activity counts */}
                  <div className="text-[11px] space-y-0.5" style={{ color: 'var(--ink-muted)' }}>
                    <p><strong className="font-semibold" style={{ color: 'var(--ink)' }}>{counts.projects ?? 0}</strong> projects · <strong className="font-semibold" style={{ color: 'var(--ink)' }}>{counts.deployments ?? 0}</strong> deploys</p>
                    <p><strong className="font-semibold" style={{ color: 'var(--ink)' }}>{counts.cloudAccounts ?? 0}</strong> cloud accounts</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      className="px-2.5 py-1 rounded-[6px] text-xs font-medium flex items-center gap-1.5 transition-colors"
                      style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
                      onClick={() => setSelectedActivityUserId(u.id)}
                      title="View user activity and owned assets"
                    >
                      <Eye size={12} />
                      Activity
                    </button>
                    {!isOwner && (
                      <button
                        className="p-1.5 rounded-[6px] text-xs transition-colors hover:bg-[var(--fail-soft)]"
                        style={{ color: 'var(--fail)' }}
                        onClick={() => setConfirmDelete(u.id)}
                        title="Delete user"
                        disabled={isBusy}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

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
                        This will permanently delete <strong>{u.name}</strong> ({u.email}) and all their associated projects & deployments.
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
                          className="px-4 py-2 rounded-[var(--r-sm)] text-xs font-semibold text-white flex items-center gap-1.5"
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

      {/* Activity Drawer / Modal */}
      {selectedActivityUserId && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs" onClick={() => setSelectedActivityUserId(null)} />
          <div
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[620px] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
            style={{ background: 'var(--bg-elevated)', borderLeft: '1px solid var(--border-strong)' }}
          >
            {/* Modal Header */}
            <div className="p-5 flex items-center justify-between border-b" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--ink)' }}>
                  <Users size={18} style={{ color: 'var(--accent)' }} />
                  User Activity & Inventory
                </h2>
                {activityData?.user && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                    {activityData.user.name} ({activityData.user.email}) · <span className="font-semibold text-emerald-400">{activityData.user.role}</span>
                  </p>
                )}
              </div>
              <button
                className="px-3 py-1 rounded-[6px] text-xs font-medium"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink-secondary)' }}
                onClick={() => setSelectedActivityUserId(null)}
              >
                Close
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {isActivityLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
                </div>
              ) : !activityData ? (
                <p className="text-xs text-center py-10" style={{ color: 'var(--ink-muted)' }}>Failed to load activity log.</p>
              ) : (
                <>
                  {/* Projects section */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5" style={{ color: 'var(--ink-secondary)' }}>
                      Projects ({activityData.activity.projects.length})
                    </h3>
                    {activityData.activity.projects.length === 0 ? (
                      <p className="text-xs italic" style={{ color: 'var(--ink-faint)' }}>No projects created yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {activityData.activity.projects.map((p) => (
                          <div key={p.id} className="p-3 rounded-[8px] text-xs" style={{ background: 'var(--surface)', border: '1px solid var(--border-faint)' }}>
                            <div className="flex items-center justify-between font-semibold" style={{ color: 'var(--ink)' }}>
                              <span>{p.name}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                {p._count?.deployments ?? 0} deployments
                              </span>
                            </div>
                            {p.description && <p className="text-[11px] mt-1" style={{ color: 'var(--ink-muted)' }}>{p.description}</p>}
                            <div className="mt-2 flex items-center gap-2 text-[10px]" style={{ color: 'var(--ink-faint)' }}>
                              <span>Environments: {p.environments.map(e => e.name).join(', ') || 'None'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Deployments section */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5" style={{ color: 'var(--ink-secondary)' }}>
                      Deployments ({activityData.activity.deployments.length})
                    </h3>
                    {activityData.activity.deployments.length === 0 ? (
                      <p className="text-xs italic" style={{ color: 'var(--ink-faint)' }}>No deployments performed.</p>
                    ) : (
                      <div className="space-y-2">
                        {activityData.activity.deployments.slice(0, 10).map((d) => (
                          <div key={d.id} className="p-3 rounded-[8px] text-xs flex items-center justify-between" style={{ background: 'var(--surface)', border: '1px solid var(--border-faint)' }}>
                            <div>
                              <p className="font-semibold" style={{ color: 'var(--ink)' }}>
                                {d.template?.name || 'Custom Plan'} <span className="text-[10px] font-normal" style={{ color: 'var(--ink-muted)' }}>({d.operationType})</span>
                              </p>
                              <p className="text-[10.5px]" style={{ color: 'var(--ink-muted)' }}>
                                Project: {d.project?.name} · Env: {d.environment?.name}
                              </p>
                            </div>
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                              style={{
                                background: d.status === 'SUCCEEDED' ? 'rgba(52, 211, 153, 0.15)' : d.status === 'FAILED' ? 'rgba(248, 113, 113, 0.15)' : 'var(--surface-2)',
                                color: d.status === 'SUCCEEDED' ? '#34d399' : d.status === 'FAILED' ? '#f87171' : 'var(--accent)',
                              }}
                            >
                              {d.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cloud Accounts section */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5" style={{ color: 'var(--ink-secondary)' }}>
                      Onboarded Cloud Accounts ({activityData.activity.cloudAccounts.length})
                    </h3>
                    {activityData.activity.cloudAccounts.length === 0 ? (
                      <p className="text-xs italic" style={{ color: 'var(--ink-faint)' }}>No cloud accounts onboarded.</p>
                    ) : (
                      <div className="space-y-2">
                        {activityData.activity.cloudAccounts.map((ca) => (
                          <div key={ca.id} className="p-3 rounded-[8px] text-xs flex items-center justify-between" style={{ background: 'var(--surface)', border: '1px solid var(--border-faint)' }}>
                            <span className="font-semibold" style={{ color: 'var(--ink)' }}>{ca.name} ({ca.provider})</span>
                            <span className="mono text-[10.5px]" style={{ color: 'var(--ink-muted)' }}>Ref: {ca.accountReference}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Audit Trail */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5" style={{ color: 'var(--ink-secondary)' }}>
                      Recent Activity Logs ({activityData.activity.auditLogs.length})
                    </h3>
                    {activityData.activity.auditLogs.length === 0 ? (
                      <p className="text-xs italic" style={{ color: 'var(--ink-faint)' }}>No audit activity logs recorded.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {activityData.activity.auditLogs.slice(0, 15).map((log) => (
                          <div key={log.id} className="p-2.5 rounded-[6px] text-[11px] flex items-center justify-between" style={{ background: 'var(--surface-2)' }}>
                            <div className="min-w-0 pr-2">
                              <p className="font-medium truncate" style={{ color: 'var(--ink)' }}>{log.message}</p>
                              <p className="text-[9.5px] mono" style={{ color: 'var(--ink-faint)' }}>{new Date(log.timestamp).toLocaleString()}</p>
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono uppercase" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                              {log.action}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Summary footer */}
      {!isLoading && users.length > 0 && (
        <div className="mt-4 flex items-center gap-4 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
          <span>{users.filter(u => u.role === 'ADMIN').length} site owner</span>
          <span>·</span>
          <span>{users.filter(u => u.role === 'DEVELOPER').length} developer{users.filter(u => u.role === 'DEVELOPER').length !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}
