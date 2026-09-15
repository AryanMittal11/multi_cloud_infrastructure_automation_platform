'use client';

import React, { useState } from 'react';
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import { Deployment } from '../../lib/api';

interface ConfirmApplyModalProps {
  deployment: Deployment;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
  error?: string | null;
}

/**
 * Gated approval for destructive plans: mirrors the backend invariant that
 * destructive changes require the typed keyword CONFIRM_APPLY.
 */
export function ConfirmApplyModal({
  deployment,
  onConfirm,
  onClose,
  isPending,
  error,
}: ConfirmApplyModalProps) {
  const [typed, setTyped] = useState('');
  const envName = deployment.environment?.name || 'environment';
  const templateName = deployment.template?.name || 'module';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-apply-title"
      onKeyDown={(e) => e.key === 'Escape' && !isPending && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-neutral-950 shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-neutral-800/80 flex items-start space-x-3">
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h2 id="confirm-apply-title" className="text-sm font-bold text-white">
              Destructive plan requires confirmation
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              This plan will destroy or replace provisioned resources.
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 text-[11px] text-neutral-300 space-y-1">
            <div>
              Template: <strong className="text-neutral-100">{templateName}</strong>
            </div>
            <div>
              Environment: <strong className="text-rose-300">{envName}</strong>
            </div>
            <div>
              Operation: <strong className="text-rose-300">{deployment.operationType}</strong>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider">
              Type <code className="text-rose-300 font-mono">CONFIRM_APPLY</code> to proceed
            </span>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="CONFIRM_APPLY"
              className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-sm text-white font-mono placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50"
            />
          </label>

          {error && (
            <div className="flex items-start space-x-2 text-[11px] text-rose-300 bg-rose-950/30 border border-rose-500/30 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-neutral-800/80 flex items-center justify-end space-x-2 bg-neutral-950/80">
          <button
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => typed.trim() === 'CONFIRM_APPLY' && onConfirm()}
            disabled={typed.trim() !== 'CONFIRM_APPLY' || isPending}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-rose-600/30 transition-all"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Applying...</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                <span>Approve destructive plan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
