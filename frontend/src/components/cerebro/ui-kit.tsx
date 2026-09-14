'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Info, X } from 'lucide-react';
import type {
  PipelineStatus,
  DeploymentStatus,
  Severity,
  AlertStatus,
  AnomalyState,
  EnvHealth,
  TimelineEvent,
} from '../../lib/cerebro/types';

/* ============================================================
   Status mapping — one vocabulary across the whole app
   ============================================================ */

type Tone = 'success' | 'fail' | 'warn' | 'run' | 'muted' | 'accent';

const badgeClass: Record<Tone, string> = {
  success: 'badge badge-success',
  fail: 'badge badge-fail',
  warn: 'badge badge-warn',
  run: 'badge badge-run',
  muted: 'badge badge-muted',
  accent: 'badge badge-accent',
};

const STATUS_TONE: Record<string, Tone> = {
  success: 'success',
  successful: 'success',
  pass: 'success',
  resolved: 'success',
  healthy: 'success',
  ok: 'success',
  failed: 'fail',
  fail: 'fail',
  down: 'fail',
  degraded: 'warn',
  warn: 'warn',
  pending: 'muted',
  skipped: 'muted',
  cancelled: 'muted',
  queued: 'muted',
  rolled: 'warn',
  'rolled-back': 'warn',
  'in-progress': 'run',
  running: 'run',
  acknowledged: 'run',
  investigating: 'run',
  detected: 'warn',
  page: 'fail',
  ticket: 'warn',
  info: 'muted',
  completed: 'success',
};

export function StatusBadge({ status, pulse }: { status: string; pulse?: boolean }) {
  const tone = STATUS_TONE[status] ?? 'muted';
  const label = status.replace(/-/g, ' ');
  return (
    <span className={badgeClass[tone]}>
      {tone === 'run' && pulse !== false ? (
        <span className="dot dot-run" />
      ) : tone === 'success' ? (
        <span className="dot dot-success" />
      ) : tone === 'fail' ? (
        <span className="dot dot-fail" />
      ) : tone === 'warn' ? (
        <span className="dot dot-warn" />
      ) : null}
      {label}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const map: Record<Severity, { cls: string; label: string }> = {
    page: { cls: 'badge-fail', label: 'page' },
    ticket: { cls: 'badge-warn', label: 'ticket' },
    info: { cls: 'badge-muted', label: 'info' },
  };
  return <span className={`badge ${map[severity].cls}`}>{map[severity].label}</span>;
}

export function Dot({ tone }: { tone: 'success' | 'fail' | 'warn' | 'run' | 'muted' }) {
  return <span className={`dot dot-${tone}`} />;
}

/* ============================================================
   Panels
   ============================================================ */

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className = '',
  bodyClass = '',
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || actions) && (
        <header className="panel-head">
          <div className="min-w-0">
            {title && <h3 className="truncate">{title}</h3>}
            {subtitle && <p className="text-xs" style={{ color: 'var(--ink-muted)', marginTop: 2 }}>{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-none">{actions}</div>}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  delta,
  deltaDirection,
  hint,
  tone = 'default',
  spark,
}: {
  label: string;
  value: string;
  delta?: number;
  deltaDirection?: 'up' | 'down' | 'flat';
  hint?: string;
  tone?: 'default' | 'success' | 'fail' | 'warn' | 'accent';
  spark?: React.ReactNode;
}) {
  const deltaColor =
    deltaDirection === 'up' ? 'var(--success)' : deltaDirection === 'down' ? 'var(--fail)' : 'var(--ink-muted)';
  const arrow = deltaDirection === 'up' ? '▲' : deltaDirection === 'down' ? '▼' : '';
  // good/bad inversion: for failure-ish metrics falling is good
  const invertGood = tone === 'fail' || tone === 'warn';
  const isGood =
    deltaDirection === 'flat' ? null : invertGood ? deltaDirection === 'down' : deltaDirection === 'up';

  return (
    <div className="stat-tile">
      <div className="stat-label">{label}</div>
      <div className="stat-value num" style={tone === 'fail' ? { color: 'var(--fail)' } : undefined}>
        {value}
      </div>
      <div className="stat-delta num" style={{ color: deltaColor }}>
        {arrow} {delta !== undefined && delta !== 0 ? `${Math.abs(delta)}%` : 'steady'}
        {hint && <span style={{ color: 'var(--ink-faint)', marginLeft: 8, fontFamily: 'var(--font-ui)' }}>{hint}</span>}
      </div>
      {spark && <div className="stat-spark">{spark}</div>}
      {isGood !== null && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            pointerEvents: 'none',
            boxShadow: isGood ? 'inset 0 1px 0 rgba(67,196,99,0.14)' : undefined,
          }}
        />
      )}
    </div>
  );
}

/* ============================================================
   Empty / Loading states
   ============================================================ */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="p-4 space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="w-8 h-8" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   Dropdown (controlled, click-outside)
   ============================================================ */

export function Dropdown({
  trigger,
  children,
  align = 'right',
  width = 240,
}: {
  trigger: (open: boolean) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: 'left' | 'right';
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} aria-expanded={open}>
        {trigger(open)}
      </button>
      {open && (
        <div
          className="absolute z-50 mt-1.5 rounded-[var(--r-md)] py-1.5 shadow-2xl"
          style={{
            [align]: 0,
            width,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            animation: 'palette-in 140ms var(--ease-out)',
          }}
          role="menu"
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  icon,
  label,
  sub,
  danger,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  sub?: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors"
      style={{ color: danger ? 'var(--fail)' : 'var(--ink-secondary)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      role="menuitem"
    >
      {icon}
      <span className="flex-1 min-w-0">
        <span className="block truncate font-medium">{label}</span>
        {sub && (
          <span className="block text-xs truncate" style={{ color: 'var(--ink-muted)' }}>
            {sub}
          </span>
        )}
      </span>
    </button>
  );
}

/* ============================================================
   Tabs
   ============================================================ */

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b" style={{ borderColor: 'var(--border)' }} role="tablist">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.key)}
            className="relative px-3 py-2 text-xs font-semibold transition-colors"
            style={{ color: on ? 'var(--ink)' : 'var(--ink-muted)' }}
          >
            <span className="inline-flex items-center gap-1.5">
              {t.label}
              {t.count !== undefined && (
                <span className="num text-[10px] px-1.5 rounded-full" style={{ background: 'var(--surface-3)', color: 'var(--ink-muted)' }}>
                  {t.count}
                </span>
              )}
            </span>
            {on && (
              <span
                className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full"
                style={{ background: 'var(--accent)' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   Modal + ConfirmDialog
   ============================================================ */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  large,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  large?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${large ? 'modal-lg' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <X size={15} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = 'Confirm',
  danger,
  requireText,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
  requireText?: string;
}) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (!open) setText('');
  }, [open]);
  const blocked = Boolean(requireText) && text !== requireText;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className="btn btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`}
            disabled={blocked}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm" style={{ color: 'var(--ink-secondary)' }}>
        {body}
      </p>
      {requireText && (
        <div className="mt-3">
          <label className="eyebrow block mb-1.5" htmlFor="confirm-input">
            Type <span className="mono" style={{ color: 'var(--ink)' }}>{requireText}</span> to confirm
          </label>
          <input
            id="confirm-input"
            className="input mono"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoComplete="off"
          />
        </div>
      )}
    </Modal>
  );
}

/* ============================================================
   Toasts
   ============================================================ */

interface Toast {
  id: number;
  title: string;
  sub?: string;
  tone: 'info' | 'success' | 'warn' | 'fail';
}

const ToastCtx = createContext<{ push: (t: Omit<Toast, 'id'>) => void }>({ push: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3800);
  }, []);

  const iconFor = (tone: Toast['tone']) => {
    const cls = { info: 'text-[var(--run)]', success: 'text-[var(--success)]', warn: 'text-[var(--warn)]', fail: 'text-[var(--fail)]' }[tone];
    if (tone === 'success') return <Check size={15} className={cls} />;
    if (tone === 'warn') return <AlertTriangle size={15} className={cls} />;
    if (tone === 'fail') return <AlertTriangle size={15} className={cls} />;
    return <Info size={15} className={cls} />;
  };

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="toast-region" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <span className="mt-0.5">{iconFor(t.tone)}</span>
            <div className="toast-msg">
              <span className="font-medium" style={{ color: 'var(--ink)' }}>
                {t.title}
              </span>
              {t.sub && <span className="toast-sub">{t.sub}</span>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

/* ============================================================
   Timeline
   ============================================================ */

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="timeline">
      {events.map((ev, i) => (
        <div key={i} className={`tl-item ${ev.state}`}>
          <span className="tl-dot" />
          <div className="tl-head">
            <span className="tl-title">{ev.label}</span>
            {ev.actor && <span className="chip">{ev.actor}</span>}
          </div>
          <p className="tl-sub">{ev.detail}</p>
          {ev.at && <p className="text-xs mt-0.5" style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{timeAgo(ev.at)}</p>}
        </div>
      ))}
    </div>
  );
}

import { timeAgo } from '../../lib/cerebro/mock-data';

/* ============================================================
   FilterBar
   ============================================================ */

export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="filter-bar flex items-center gap-2 flex-wrap mb-4">{children}</div>;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <input
      className={`input ${className}`}
      style={{ height: 30, maxWidth: 260 }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
    />
  );
}

/* ============================================================
   Segmented control
   ============================================================ */

export function Segmented({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button
          key={o.key}
          role="tab"
          aria-selected={o.key === value}
          className={o.key === value ? 'on' : ''}
          style={size === 'sm' ? { height: 26, padding: '0 10px' } : undefined}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
