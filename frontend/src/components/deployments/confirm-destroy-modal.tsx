'use client';

import React, { useState } from 'react';
import { Trash2, AlertTriangle, Loader2, ShieldAlert, X } from 'lucide-react';
import { Deployment } from '../../lib/api';

interface ConfirmDestroyModalProps {
  deployment: Deployment;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
  error?: string | null;
}

/**
 * Gated confirmation modal for executing infrastructure destruction.
 * Enforces typing "CONFIRM_DESTROY" before permanently terminating live cloud resources.
 */
export function ConfirmDestroyModal({
  deployment,
  onConfirm,
  onClose,
  isPending,
  error,
}: ConfirmDestroyModalProps) {
  const [typed, setTyped] = useState('');
  const envName = deployment.environment?.name || 'environment';
  const templateName = deployment.template?.name || 'module';
  const isProduction = envName.toLowerCase() === 'production';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-destroy-title"
      onKeyDown={(e) => e.key === 'Escape' && !isPending && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-neutral-950 shadow-2xl shadow-rose-950/40 overflow-hidden space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800/80 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 id="confirm-destroy-title" className="text-sm font-bold text-white tracking-tight">
                Confirm Permanent Teardown
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Terraform will permanently destroy all provisioned infrastructure.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="text-neutral-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="px-5 space-y-4">
          <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-3.5 text-[11px] text-neutral-300 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-neutral-400">Template:</span>
              <strong className="text-neutral-100">{templateName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Environment:</span>
              <strong className="text-rose-400 uppercase font-mono">{envName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Action:</span>
              <span className="font-bold text-rose-300 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/40 text-[10px]">
                TERRAFORM DESTROY
              </span>
            </div>
          </div>

          {isProduction && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-600/50 text-rose-200 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>Production environment protection: Requires explicit admin confirmation.</span>
            </div>
          )}

          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider">
              Type <code className="text-rose-400 font-mono font-bold">CONFIRM_DESTROY</code> to proceed:
            </span>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="CONFIRM_DESTROY"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white font-mono placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50"
            />
          </label>

          {error && (
            <div className="flex items-start space-x-2 text-[11px] text-rose-300 bg-rose-950/40 border border-rose-500/40 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-5 py-4 border-t border-neutral-800/80 flex items-center justify-end space-x-2 bg-neutral-950">
          <button
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => typed.trim() === 'CONFIRM_DESTROY' && onConfirm()}
            disabled={typed.trim() !== 'CONFIRM_DESTROY' || isPending}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-rose-600/30 transition-all"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Queuing Teardown...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Execute Teardown</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
