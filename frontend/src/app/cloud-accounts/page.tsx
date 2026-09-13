'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, CloudAccount } from '../../lib/api';
import { useAuth } from '../../context/auth-context';
import {
  Cloud,
  Plus,
  ShieldCheck,
  Lock,
  Calendar,
  AlertCircle,
  X,
  Key,
  Trash2,
} from 'lucide-react';

export default function CloudAccountsPage() {
  const { user, quickLogin } = useAuth();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [provider, setProvider] = useState<'AWS' | 'AZURE' | 'GCP'>('AWS');
  const [name, setName] = useState('');
  const [accountReference, setAccountReference] = useState('');
  // Credential fields
  const [awsAccessKey, setAwsAccessKey] = useState('');
  const [awsSecretKey, setAwsSecretKey] = useState('');
  const [awsRegion, setAwsRegion] = useState('us-east-1');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloud-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      setIsModalOpen(false);
      setName('');
      setAccountReference('');
      setAwsAccessKey('');
      setAwsSecretKey('');
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to onboard cloud account');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !accountReference.trim()) {
      setFormError('Account name and account reference are required');
      return;
    }

    const credentials: Record<string, string> = {};
    if (provider === 'AWS') {
      if (!awsAccessKey.trim() || !awsSecretKey.trim()) {
        setFormError('AWS Access Key ID and Secret Access Key are required');
        return;
      }
      credentials.accessKeyId = awsAccessKey.trim();
      credentials.secretAccessKey = awsSecretKey.trim();
      credentials.region = awsRegion;
    } else {
      // Mock / placeholder for Azure / GCP until Phase 2
      credentials.serviceAccount = 'mock-service-principal';
    }

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
        return {
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-400',
          label: 'Amazon Web Services',
        };
      case 'AZURE':
        return {
          badge: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
          dot: 'bg-sky-400',
          label: 'Microsoft Azure',
        };
      case 'GCP':
        return {
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400',
          label: 'Google Cloud Platform',
        };
      default:
        return {
          badge: 'bg-slate-800 text-slate-300 border-slate-700',
          dot: 'bg-slate-400',
          label: p,
        };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Cloud Accounts</h1>
              <p className="text-xs text-slate-400">
                Manage cloud provider credentials secured with AES-256-GCM encryption
              </p>
            </div>
          </div>
        </div>

        {user ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Account</span>
          </button>
        ) : (
          <button
            onClick={() => quickLogin('DEVELOPER')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Key className="w-4 h-4" />
            <span>Connect to Manage Accounts</span>
          </button>
        )}
      </div>

      {/* Invariant Alert */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex items-start space-x-3 text-xs">
        <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-slate-200">Zero Secret Leakage Invariant:</span>
          <p className="text-slate-400 text-[11px]">
            Cloud credentials are validated upon onboarding, encrypted using AES-256-GCM before database insertion, and sanitized from all logs and client payloads.
          </p>
        </div>
      </div>

      {/* Cloud Accounts List */}
      {user && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-44 rounded-2xl border border-slate-800 bg-slate-900/40 animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-950/20 text-rose-300 text-xs flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Failed to fetch cloud accounts: {(error as Error).message}</span>
            </div>
          ) : data?.accounts && data.accounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.accounts.map((account: CloudAccount) => {
                const cfg = getProviderConfig(account.provider);
                return (
                  <div
                    key={account.id}
                    className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-base font-bold text-white tracking-tight">
                            {account.name}
                          </h2>
                          <span className="text-[11px] text-slate-400">{cfg.label}</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider flex items-center space-x-1.5 ${cfg.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          <span>{account.provider}</span>
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 font-mono text-xs flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Account Ref:</span>
                        <span className="text-slate-200">{account.accountReference}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(account.createdAt).toLocaleDateString()}</span>
                      </span>
                      <span className="flex items-center space-x-1 text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>AES-256 Encrypted</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 space-y-3">
              <Cloud className="w-10 h-10 text-slate-600 mx-auto" />
              <h2 className="text-sm font-semibold text-slate-300">No cloud accounts connected</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Connect your AWS account credentials to enable automated infrastructure deployments.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/30"
              >
                Connect Account
              </button>
            </div>
          )}
        </>
      )}

      {/* Onboard Cloud Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <Cloud className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Connect Cloud Provider</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Provider selector */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Target Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['AWS', 'AZURE', 'GCP'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProvider(p)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        provider === p
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Account Friendly Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Production AWS Account"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Account Reference / ID *
                </label>
                <input
                  type="text"
                  placeholder={provider === 'AWS' ? '12-digit AWS Account ID' : 'Subscription / Project ID'}
                  value={accountReference}
                  onChange={(e) => setAccountReference(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {provider === 'AWS' && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                    AWS IAM Credentials
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="AWS Access Key ID (AKIA...)"
                      value={awsAccessKey}
                      onChange={(e) => setAwsAccessKey(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                      required
                    />
                    <input
                      type="password"
                      placeholder="AWS Secret Access Key"
                      value={awsSecretKey}
                      onChange={(e) => setAwsSecretKey(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                      required
                    />
                    <select
                      value={awsRegion}
                      onChange={(e) => setAwsRegion(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="us-east-1">us-east-1 (N. Virginia)</option>
                      <option value="us-west-2">us-west-2 (Oregon)</option>
                      <option value="eu-west-1">eu-west-1 (Ireland)</option>
                      <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Validating & Storing...' : 'Onboard Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
