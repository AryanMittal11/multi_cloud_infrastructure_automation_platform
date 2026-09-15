'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, CloudAccount } from '../../lib/api';
import { useAuth } from '../../context/auth-context';
import { PageHeader } from '../../components/cerebro/app-shell';
import {
  Panel,
  EmptyState,
  Skeleton,
  Modal,
  ConfirmDialog,
  useToast,
} from '../../components/cerebro/ui-kit';
import {
  Cloud,
  Plus,
  ShieldCheck,
  Lock,
  Calendar,
  AlertCircle,
  X,
  Loader2,
  Trash2,
  KeyRound,
} from 'lucide-react';

const CONFIRM_KEYWORD = 'CONFIRM_DELETE_ACCOUNT';

export default function CloudAccountsPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CloudAccount | null>(null);
  const [provider, setProvider] = useState<'AWS' | 'AZURE' | 'GCP'>('AWS');
  const [name, setName] = useState('');
  const [accountReference, setAccountReference] = useState('');
  // Credential fields
  const [awsAccessKey, setAwsAccessKey] = useState('');
  const [awsSecretKey, setAwsSecretKey] = useState('');
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  // Azure credential fields
  const [azureClientId, setAzureClientId] = useState('');
  const [azureClientSecret, setAzureClientSecret] = useState('');
  const [azureTenantId, setAzureTenantId] = useState('');
  const [azureSubscriptionId, setAzureSubscriptionId] = useState('');
  // GCP credential fields
  const [gcpProjectId, setGcpProjectId] = useState('');
  const [gcpClientEmail, setGcpClientEmail] = useState('');
  const [gcpPrivateKey, setGcpPrivateKey] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['cloud-accounts'],
    queryFn: () => api.cloudAccounts.list(),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (newAccount: {
      name: string;
      provider: 'AWS' | 'AZURE' | 'GCP';
      accountReference: string;
      credentials: Record<string, string>;
    }) => api.cloudAccounts.create(newAccount),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['cloud-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      setIsModalOpen(false);
      setName('');
      setAccountReference('');
      resetCredentialFields();
      setFormError(null);
      push({ title: res.message || 'Cloud account onboarded', tone: 'success' });
    },
    onError: (err: any) => {
      setFormError(
        err?.status === 403
          ? 'Onboarding cloud accounts requires the Site Owner (ADMIN)'
          : err.message || 'Failed to onboard cloud account',
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.cloudAccounts.delete(id, CONFIRM_KEYWORD),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['cloud-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      push({ title: res.message || 'Cloud account deleted', tone: 'success' });
    },
    onError: (err: any) => {
      push({
        title:
          err?.status === 400
            ? err.message
            : err?.status === 403
              ? 'Deleting cloud accounts requires the Site Owner (ADMIN)'
              : err?.message || 'Failed to delete cloud account',
        tone: 'fail',
      });
    },
  });

  const buildCredentials = (): Record<string, string> | null => {
    if (provider === 'AWS') {
      if (!awsAccessKey.trim() || !awsSecretKey.trim()) {
        setFormError('AWS Access Key ID and Secret Access Key are required');
        return null;
      }
      return {
        accessKeyId: awsAccessKey.trim(),
        secretAccessKey: awsSecretKey.trim(),
        defaultRegion: awsRegion,
      };
    }

    if (provider === 'AZURE') {
      if (!azureClientId.trim() || !azureClientSecret.trim() || !azureTenantId.trim() || !azureSubscriptionId.trim()) {
        setFormError('Azure Client ID, Client Secret, Tenant ID, and Subscription ID are all required');
        return null;
      }
      return {
        clientId: azureClientId.trim(),
        clientSecret: azureClientSecret.trim(),
        tenantId: azureTenantId.trim(),
        subscriptionId: azureSubscriptionId.trim(),
      };
    }

    // GCP
    if (!gcpProjectId.trim() || !gcpClientEmail.trim() || !gcpPrivateKey.trim()) {
      setFormError('GCP Project ID, Client Email, and Private Key are all required');
      return null;
    }
    return {
      projectId: gcpProjectId.trim(),
      clientEmail: gcpClientEmail.trim(),
      privateKey: gcpPrivateKey.trim(),
    };
  };

  const resetCredentialFields = () => {
    setAwsAccessKey('');
    setAwsSecretKey('');
    setAzureClientId('');
    setAzureClientSecret('');
    setAzureTenantId('');
    setAzureSubscriptionId('');
    setGcpProjectId('');
    setGcpClientEmail('');
    setGcpPrivateKey('');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !accountReference.trim()) {
      setFormError('Account name and account reference are required');
      return;
    }

    const credentials = buildCredentials();
    if (!credentials) return;

    setFormError(null);
    createMutation.mutate({
      name: name.trim(),
      provider,
      accountReference: accountReference.trim(),
      credentials,
    });
  };

  const getProviderConfig = (p: string) => {
    switch (p) {
      case 'AWS':
        return { color: 'var(--accent)', label: 'Amazon Web Services' };
      case 'AZURE':
        return { color: 'var(--accent)', label: 'Microsoft Azure' };
      case 'GCP':
        return { color: 'var(--accent)', label: 'Google Cloud Platform' };
      default:
        return { color: 'var(--ink-muted)', label: p };
    }
  };

  const accounts: CloudAccount[] = data?.cloudAccounts ?? [];
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div>
      <PageHeader
        title="Cloud Accounts"
        sub="Manage cloud provider credentials secured with AES-256-GCM encryption"
        actions={
          user && (
            <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={14} /> Connect account
            </button>
          )
        }
      />

      {/* Invariant Alert */}
      <Panel className="mb-5">
        <div className="flex items-start gap-3">
          <Lock size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--warn)' }} />
          <div>
            <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Zero secret leakage invariant
            </span>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
              Cloud credentials are validated upon onboarding, encrypted using AES-256-GCM before database
              insertion, and sanitized from all logs and client payloads. Deletion is guarded by an explicit
              typed confirmation and blocked while any environment is still bound.
            </p>
          </div>
        </div>
      </Panel>

      {user && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <Skeleton key={n} className="h-48" />
              ))}
            </div>
          ) : error ? (
            <Panel>
              <div className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--fail)' }}>
                <AlertCircle size={16} className="shrink-0" />
                <span>Failed to fetch cloud accounts: {(error as Error).message}</span>
              </div>
            </Panel>
          ) : accounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {accounts.map((account) => {
                const cfg = getProviderConfig(account.provider);
                return (
                  <div key={account.id} className="panel p-5 flex flex-col justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>
                            {account.name}
                          </h2>
                          <span className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                            {cfg.label}
                          </span>
                        </div>
                        <span
                          className="chip flex-none flex items-center gap-1.5 uppercase"
                          style={{ color: cfg.color, borderColor: cfg.color }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                          {account.provider}
                        </span>
                      </div>

                      <div
                        className="px-2.5 py-2 rounded-[10px] mono text-xs flex items-center justify-between"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-faint)' }}
                      >
                        <span style={{ color: 'var(--ink-faint)' }}>Account Ref:</span>
                        <span style={{ color: 'var(--ink)' }}>{account.accountReference}</span>
                      </div>
                    </div>

                    <div
                      className="pt-3 flex items-center justify-between text-[11px]"
                      style={{ borderTop: '1px solid var(--border-faint)' }}
                    >
                      <span className="flex items-center gap-1" style={{ color: 'var(--ink-faint)' }}>
                        <Calendar size={12} />
                        <span>{new Date(account.createdAt).toLocaleDateString()}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className="flex items-center gap-1"
                          style={{ color: 'var(--ok)' }}
                          title="Credentials encrypted at rest with AES-256-GCM"
                        >
                          <ShieldCheck size={12} />
                          <span>Encrypted</span>
                        </span>
                        {isAdmin && (
                          <button
                            className="icon-btn"
                            style={{ color: 'var(--ink-faint)' }}
                            onClick={() => setDeleteTarget(account)}
                            title="Delete cloud account (Site Owner only)"
                            aria-label={`Delete cloud account ${account.name}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Panel>
              <EmptyState
                icon={<Cloud size={28} />}
                title="No cloud accounts connected"
                body="Connect your AWS, Azure, or GCP credentials to enable automated infrastructure deployments."
                action={
                  <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
                    <Plus size={14} /> Connect account
                  </button>
                }
              />
            </Panel>
          )}
        </>
      )}

      {/* Secure delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        title={`Delete “${deleteTarget?.name ?? ''}”?`}
        body={`This permanently removes the stored credential reference for this ${deleteTarget?.provider ?? ''} account. The action is audited and cannot be undone. Environments still bound to this account will block deletion.`}
        confirmLabel="Delete account"
        danger
        requireText={CONFIRM_KEYWORD}
      />

      {/* Onboard Cloud Account Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Connect cloud provider" large>
        {formError && (
          <div
            className="p-3 mb-4 rounded-[10px] flex items-start gap-2 text-xs"
            style={{ background: 'var(--fail-soft)', border: '1px solid var(--fail)', color: 'var(--fail)' }}
          >
            <AlertCircle size={14} className="flex-none mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          {/* Provider selector */}
          <div>
            <label className="eyebrow block mb-1.5">Target provider</label>
            <div className="grid grid-cols-3 gap-2">
              {(['AWS', 'AZURE', 'GCP'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvider(p)}
                  className={provider === p ? 'btn-primary' : 'btn-ghost'}
                  style={{ justifyContent: 'center' }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="eyebrow block mb-1.5">Account friendly name *</label>
            <input
              type="text"
              placeholder="e.g. Production AWS Account"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="eyebrow block mb-1.5">Account reference / ID *</label>
            <input
              type="text"
              placeholder={provider === 'AWS' ? '12-digit AWS Account ID' : 'Subscription / Project ID'}
              value={accountReference}
              onChange={(e) => setAccountReference(e.target.value)}
              className="input mono w-full"
              required
            />
          </div>

          {provider === 'AWS' && (
            <div className="p-3.5 rounded-[12px] space-y-2.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-faint)' }}>
              <div className="eyebrow flex items-center gap-1.5" style={{ color: 'var(--warn)' }}>
                <KeyRound size={12} /> AWS IAM credentials
              </div>
              <input
                type="text"
                placeholder="AWS Access Key ID (AKIA...)"
                value={awsAccessKey}
                onChange={(e) => setAwsAccessKey(e.target.value)}
                className="input mono w-full"
                required
              />
              <input
                type="password"
                placeholder="AWS Secret Access Key"
                value={awsSecretKey}
                onChange={(e) => setAwsSecretKey(e.target.value)}
                className="input mono w-full"
                required
              />
              <select value={awsRegion} onChange={(e) => setAwsRegion(e.target.value)} className="input w-full">
                <option value="us-east-1">us-east-1 (N. Virginia)</option>
                <option value="us-west-2">us-west-2 (Oregon)</option>
                <option value="eu-west-1">eu-west-1 (Ireland)</option>
                <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
              </select>
            </div>
          )}

          {provider === 'AZURE' && (
            <div className="p-3.5 rounded-[12px] space-y-2.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-faint)' }}>
              <div className="eyebrow flex items-center gap-1.5" style={{ color: '#0369a1' }}>
                <KeyRound size={12} /> Azure service principal
              </div>
              <input
                type="text"
                placeholder="Application (Client) ID — UUID"
                value={azureClientId}
                onChange={(e) => setAzureClientId(e.target.value)}
                className="input mono w-full"
                required
              />
              <input
                type="password"
                placeholder="Client Secret"
                value={azureClientSecret}
                onChange={(e) => setAzureClientSecret(e.target.value)}
                className="input mono w-full"
                required
              />
              <input
                type="text"
                placeholder="Directory (Tenant) ID — UUID"
                value={azureTenantId}
                onChange={(e) => setAzureTenantId(e.target.value)}
                className="input mono w-full"
                required
              />
              <input
                type="text"
                placeholder="Subscription ID — UUID"
                value={azureSubscriptionId}
                onChange={(e) => setAzureSubscriptionId(e.target.value)}
                className="input mono w-full"
                required
              />
            </div>
          )}

          {provider === 'GCP' && (
            <div className="p-3.5 rounded-[12px] space-y-2.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-faint)' }}>
              <div className="eyebrow flex items-center gap-1.5" style={{ color: '#047857' }}>
                <KeyRound size={12} /> GCP service account
              </div>
              <input
                type="text"
                placeholder="Project ID (e.g. infra-platform-prod)"
                value={gcpProjectId}
                onChange={(e) => setGcpProjectId(e.target.value)}
                className="input mono w-full"
                required
              />
              <input
                type="text"
                placeholder="Service Account Email (name@project.iam.gserviceaccount.com)"
                value={gcpClientEmail}
                onChange={(e) => setGcpClientEmail(e.target.value)}
                className="input mono w-full"
                required
              />
              <textarea
                placeholder="Private Key (PEM format: -----BEGIN PRIVATE KEY-----)"
                value={gcpPrivateKey}
                onChange={(e) => setGcpPrivateKey(e.target.value)}
                rows={4}
                className="input mono w-full"
                required
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              {createMutation.isPending ? 'Validating & storing…' : 'Onboard account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
