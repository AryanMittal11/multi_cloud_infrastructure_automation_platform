'use client';

import React from 'react';
import { X, Package, FileCode2 } from 'lucide-react';
import { KIND_META } from '../../lib/designer-types';
import { ProviderIcon } from '../../lib/provider-icon';

export interface InspectorField {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object';
  title: string;
  description?: string;
  default?: any;
  enumValues?: any[];
  minimum?: number;
  maximum?: number;
  required?: boolean;
}

export interface InspectableNode {
  id: string;
  kind: 'network' | 'compute' | 'database' | 'storage' | 'kubernetes';
  label: string;
  provider: 'AWS' | 'AZURE' | 'GCP';
  templateRef: string;
  config: Record<string, any>;
}

interface NodeInspectorProps {
  node: InspectableNode | null;
  schema?: Record<string, any> | null;
  loadingSchema?: boolean;
  onClose: () => void;
  onChange: (id: string, patch: { label?: string; provider?: 'AWS' | 'AZURE' | 'GCP'; config?: Record<string, any> }) => void;
}

export function NodeInspector({ node, schema, loadingSchema, onClose, onChange }: NodeInspectorProps) {
  if (!node) return null;

  const meta = KIND_META[node.kind];
  const properties: Record<string, any> = schema?.properties || {};
  const requiredKeys: string[] = schema?.required || [];

  const setConfig = (key: string, value: any) => {
    onChange(node.id, { config: { ...node.config, [key]: value } });
  };

  return (
    <div className="w-80 shrink-0 h-full overflow-y-auto bg-neutral-950/70 border-l border-neutral-800/80 flex flex-col">
      <div className="p-4 border-b border-neutral-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`p-1.5 rounded-lg border ${meta.accent}`}>
            <Package className={`w-3.5 h-3.5 ${meta.color}`} />
          </div>
          <span className="text-xs font-bold text-white">Resource Inspector</span>
        </div>
        <button onClick={onClose} className="text-neutral-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Label */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Resource Name
          </label>
          <input
            value={node.label}
            onChange={(e) => onChange(node.id, { label: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-neutral-400"
          />
        </div>

        {/* Provider switcher */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Target Provider
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['AWS', 'AZURE', 'GCP'] as const).map((p) => (
              <button
                key={p}
                onClick={() => onChange(node.id, { provider: p })}
                className={`flex items-center justify-center space-x-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                  node.provider === p
                    ? 'bg-white/10 border-neutral-400 text-white'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <ProviderIcon provider={p} size={12} />
                <span>{p}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Template reference */}
        <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800 space-y-1">
          <div className="text-[10px] font-semibold text-neutral-400 flex items-center space-x-1.5">
            <FileCode2 className="w-3 h-3" />
            <span>Module Reference</span>
          </div>
          <div className="text-[11px] font-mono text-neutral-200 break-all">{node.templateRef}</div>
        </div>

        {/* Schema-driven config form */}
        <div className="space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Configuration {schema ? `(${Object.keys(properties).length} params)` : ''}
          </div>

          {loadingSchema && (
            <div className="text-[11px] text-neutral-500">Loading schema contract...</div>
          )}

          {!loadingSchema && Object.keys(properties).length === 0 && (
            <div className="text-[11px] text-neutral-500 italic">
              This module uses platform defaults.
            </div>
          )}

          {Object.entries(properties).map(([key, prop]: [string, any]) => {
            const value = node.config?.[key] ?? prop.default ?? '';
            const isRequired = requiredKeys.includes(key);

            const inputClass =
              'w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-white font-mono focus:outline-none focus:border-neutral-400';

            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-neutral-300 font-mono">
                    {key}
                    {isRequired && <span className="text-rose-400 ml-1">*</span>}
                  </label>
                  <span className="text-[9px] text-neutral-600 uppercase">{prop.type}</span>
                </div>

                {prop.enum ? (
                  <select
                    value={String(value)}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const parsed =
                        prop.type === 'number' ? Number(raw) : raw;
                      setConfig(key, parsed);
                    }}
                    className={inputClass}
                  >
                    {prop.enum.map((opt: any) => (
                      <option key={String(opt)} value={String(opt)}>
                        {String(opt)}
                      </option>
                    ))}
                  </select>
                ) : prop.type === 'boolean' ? (
                  <select
                    value={value === true || value === 'true' ? 'true' : 'false'}
                    onChange={(e) => setConfig(key, e.target.value === 'true')}
                    className={inputClass}
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : prop.type === 'number' ? (
                  <input
                    type="number"
                    value={value === '' ? '' : Number(value)}
                    min={prop.minimum}
                    max={prop.maximum}
                    onChange={(e) =>
                      setConfig(key, e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className={inputClass}
                  />
                ) : prop.type === 'array' || prop.type === 'object' ? (
                  <textarea
                    rows={2}
                    value={typeof value === 'string' ? value : JSON.stringify(value ?? [])}
                    onChange={(e) => {
                      try {
                        setConfig(key, JSON.parse(e.target.value || '[]'));
                      } catch {
                        setConfig(key, e.target.value);
                      }
                    }}
                    className={inputClass}
                  />
                ) : prop.description?.toLowerCase().includes('private key') ? (
                  <textarea
                    rows={3}
                    value={value}
                    onChange={(e) => setConfig(key, e.target.value)}
                    className={inputClass}
                  />
                ) : (
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setConfig(key, e.target.value)}
                    placeholder={prop.description ? prop.description.slice(0, 60) : ''}
                    className={inputClass}
                  />
                )}

                {prop.description && (
                  <p className="text-[10px] text-neutral-500 leading-snug">{prop.description}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
