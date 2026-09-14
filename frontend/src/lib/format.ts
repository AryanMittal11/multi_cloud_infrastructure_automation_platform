/**
 * Shared time/number formatting helpers (frontend-only, dependency-free).
 * Extracted from the retired demo dataset so live pages reuse one vocabulary.
 */

const sec = 1000;
const min = 60 * sec;
const hr = 60 * min;
const day = 24 * hr;

export function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < min) return `${Math.max(1, Math.round(diff / sec))}s ago`;
  if (diff < hr) return `${Math.round(diff / min)}m ago`;
  if (diff < day) return `${Math.round(diff / hr)}h ago`;
  return `${Math.round(diff / day)}d ago`;
}

export function clockTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function dateShort(ts: string): string {
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

export function formatUsd(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return rounded.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}
