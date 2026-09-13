'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Network, Cpu, Database, HardDrive, Ship, Trash2, Settings2 } from 'lucide-react';
import { KIND_META } from '../../lib/designer-types';
import { ProviderIcon } from '../../lib/provider-icon';

const kindIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  network: Network,
  cpu: Cpu,
  database: Database,
  'hard-drive': HardDrive,
  ship: Ship,
};

export interface InfraNodeData {
  kind: 'network' | 'compute' | 'database' | 'storage' | 'kubernetes';
  label: string;
  provider: 'AWS' | 'AZURE' | 'GCP';
  templateRef: string;
  config: Record<string, any>;
  monthlyCost?: number;
  notes?: string;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  onConfigure?: (id: string) => void;
}

export const InfraNode = memo(({ id, data, selected }: NodeProps<InfraNodeData>) => {
  const meta = KIND_META[data.kind];
  const Icon = kindIcons[meta.icon];
  const configCount = Object.keys(data.config || {}).length;

  return (
    <div
      className={`w-56 rounded-2xl border-2 backdrop-blur-md transition-all cursor-grab active:cursor-grabbing ${
        selected
          ? 'border-indigo-400 shadow-[0_0_24px_rgba(99,102,241,0.35)]'
          : 'border-slate-700/80 hover:border-slate-500'
      } bg-slate-900/90`}
      onDoubleClick={() => data.onConfigure?.(id)}
    >
      <Handle type="target" position={Position.Top} className="!bg-indigo-400 !w-2.5 !h-2.5 !border-2 !border-slate-900" />
      
      <div className={`p-3 rounded-t-xl border-b ${meta.accent} border-b-slate-800`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon className={`w-4 h-4 ${meta.color}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${meta.color}`}>
              {meta.label}
            </span>
          </div>
          <ProviderIcon provider={data.provider} size={16} />
        </div>
      </div>

      <div className="p-3 space-y-2">
        <div className="text-sm font-bold text-white truncate">{data.label}</div>
        <div className="text-[10px] font-mono text-slate-500 truncate">{data.templateRef}</div>

        {data.monthlyCost !== undefined && data.monthlyCost > 0 && (
          <div className="text-[11px] font-semibold text-emerald-400">
            ~${data.monthlyCost.toFixed(2)}/mo
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-slate-500">
            {configCount > 0 ? `${configCount} config param${configCount > 1 ? 's' : ''}` : 'default config'}
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onConfigure?.(id);
              }}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-indigo-300"
              title="Configure resource"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onDelete?.(id);
              }}
              className="p-1 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-400"
              title="Remove resource"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-indigo-400 !w-2.5 !h-2.5 !border-2 !border-slate-900" />
    </div>
  );
});

InfraNode.displayName = 'InfraNode';
