'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { AuthLayout } from '../../components/auth/auth-layout';
import { AlertCircle, Loader2, UserPlus } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'DEVELOPER', label: 'Developer', note: 'Plan, deploy, and manage infrastructure resources' },
  { value: 'VIEWER', label: 'Viewer', note: 'Read-only access to view platform resources' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('DEVELOPER');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Already authenticated? Straight to the dashboard.
  useEffect(() => {
    if (!isLoading && user) router.replace('/dashboard');
  }, [isLoading, user, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError('All fields are required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setError(null);
    setPending(true);
    try {
      await register(name.trim(), email.trim(), password, role);
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err?.message ?? 'Registration failed';
      setError(msg.includes('409') || msg.toLowerCase().includes('exists') ? 'An account with this email already exists' : msg);
    } finally {
      setPending(false);
    }
  };

  const busy = pending || isLoading;

  return (
    <AuthLayout title="Create your account" subtitle="Join the control plane in under a minute.">
      {error && (
        <div className="p-3 mb-4 rounded-[10px] flex items-start gap-2 text-xs" style={{ background: 'var(--fail-soft)', border: '1px solid var(--fail)', color: 'var(--fail)' }}>
          <AlertCircle size={14} className="flex-none mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-secondary)' }}>
            Full name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            className="input w-full"
            style={{ height: 38 }}
            placeholder="Ada Lovelace"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-secondary)' }}>
            Work email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="input w-full"
            style={{ height: 38 }}
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-secondary)' }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="input w-full"
            style={{ height: 38 }}
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <p className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-secondary)' }}>
            Role
          </p>
          <div className="space-y-1.5">
            {ROLE_OPTIONS.map((r) => (
              <label
                key={r.value}
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-[10px] cursor-pointer transition-colors"
                style={{
                  background: role === r.value ? 'var(--accent-soft)' : 'var(--surface-2)',
                  border: `1px solid ${role === r.value ? 'var(--accent-border)' : 'var(--border)'}`,
                }}
              >
                <input
                  type="radio"
                  name="role"
                  value={r.value}
                  checked={role === r.value}
                  onChange={() => setRole(r.value)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-xs font-semibold" style={{ color: 'var(--ink)' }}>{r.label}</span>
                  <span className="block text-[11px]" style={{ color: 'var(--ink-muted)' }}>{r.note}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={busy} className="btn-primary w-full" style={{ height: 38 }}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
          {busy ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-xs text-center" style={{ color: 'var(--ink-muted)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--accent)' }} className="font-medium">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
