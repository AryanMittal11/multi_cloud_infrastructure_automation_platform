'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { AuthLayout } from '../../components/auth/auth-layout';
import { AlertCircle, Loader2, LogIn, ShieldCheck } from 'lucide-react';

const DEMO_CREDENTIALS = [
  { role: 'ADMIN', email: 'admin@multicloud.local', password: 'AdminPassword123!', note: 'full access · seeds showcase artifacts' },
  { role: 'DEVELOPER', email: 'dev@multicloud.local', password: 'DevPassword123!', note: 'plan & apply' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Already authenticated? Straight to the dashboard.
  useEffect(() => {
    if (!isLoading && user) router.replace('/dashboard');
  }, [isLoading, user, router]);

  const doLogin = async (e: React.FormEvent | null, overrideEmail?: string, overridePassword?: string) => {
    if (e) e.preventDefault();
    const useEmail = overrideEmail ?? email;
    const usePassword = overridePassword ?? password;
    if (!useEmail.trim() || !usePassword) {
      setError('Enter your email and password');
      return;
    }
    setError(null);
    setPending(true);
    try {
      await login(useEmail.trim(), usePassword);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message?.includes('Invalid') ? 'Invalid email or password' : err?.message || 'Sign-in failed');
    } finally {
      setPending(false);
    }
  };

  const busy = pending || isLoading;

  return (
    <AuthLayout title="Sign in" subtitle="Access the cloudweave control plane.">
      {error && (
        <div className="p-3 mb-4 rounded-[10px] flex items-start gap-2 text-xs" style={{ background: 'var(--fail-soft)', border: '1px solid var(--fail)', color: 'var(--fail)' }}>
          <AlertCircle size={14} className="flex-none mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={(e) => doLogin(e)} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-secondary)' }}>
            Email
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
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-xs font-semibold" style={{ color: 'var(--ink-secondary)' }}>
              Password
            </label>
            <Link href="/register" className="text-xs" style={{ color: 'var(--accent)' }}>
              Create an account
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="input w-full"
            style={{ height: 38 }}
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" disabled={busy} className="btn-primary w-full" style={{ height: 38 }}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />}
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {/* Test credentials */}
      <div className="mt-7 p-4 rounded-[12px]" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-faint)' }}>
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--ink-muted)' }}>
          <ShieldCheck size={13} style={{ color: 'var(--accent)' }} />
          Demo credentials
        </p>
        <div className="space-y-2">
          {DEMO_CREDENTIALS.map((c) => (
            <button
              key={c.role}
              type="button"
              onClick={() => doLogin(null, c.email, c.password)}
              disabled={busy}
              className="w-full text-left px-3 py-2.5 rounded-[10px] transition-colors disabled:opacity-50"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <span className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>{c.role}</span>
                <span className="text-[10px]" style={{ color: 'var(--accent)' }}>use →</span>
              </span>
              <span className="block mono text-[10.5px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                {c.email} · {c.password}
              </span>
              <span className="block text-[10.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{c.note}</span>
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}
