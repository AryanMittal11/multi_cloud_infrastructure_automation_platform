import { CanvasEdge, CanvasNode } from './designer-types';

/**
 * Draft persistence for the visual designer.
 * Uses localStorage so in-progress work survives reloads even before the
 * design is saved to the backend (which requires authentication).
 */

const DRAFT_KEY = 'multicloud_design_drafts';
const ACTIVE_KEY = 'multicloud_design_active';

interface StoredDraft {
  id: string;
  name: string;
  cloudProvider: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  savedAt: string;
}

function readDrafts(): StoredDraft[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as StoredDraft[]) : [];
  } catch {
    return [];
  }
}

function writeDrafts(drafts: StoredDraft[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  } catch {
    // Storage quota exceeded — non-fatal for the design session
  }
}

export function saveDraft(design: {
  id: string;
  name: string;
  cloudProvider: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}): void {
  const drafts = readDrafts().filter((d) => d.id !== design.id);
  drafts.unshift({ ...design, savedAt: new Date().toISOString() });
  writeDrafts(drafts.slice(0, 20));
}

export function listDrafts(): StoredDraft[] {
  return readDrafts();
}

export function deleteDraft(id: string): void {
  writeDrafts(readDrafts().filter((d) => d.id !== id));
}

export function saveActiveDesignId(id: string | null): void {
  if (typeof window === 'undefined') return;
  if (id) {
    localStorage.setItem(ACTIVE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

export function getActiveDesignId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function downloadFile(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
