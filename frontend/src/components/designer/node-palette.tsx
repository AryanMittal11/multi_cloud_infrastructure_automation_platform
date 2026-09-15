'use client';

import React from 'react';
import {
  Network,
  Cpu,
  Database,
  HardDrive,
  Ship,
  Cloud,
  ShieldCheck,
} from 'lucide-react';
import { CanvasNodeKind, KIND_META } from '../../lib/designer-types';
import { ProviderIcon } from '../../lib/provider-icon';

const PALETTE_ITEMS: Array<{ kind: CanvasNodeKind; description: string }> = [
  { kind: 'network', description: 'VPC / VNet / VPC foundation' },
  { kind: 'compute', description: 'Web server / VM instance' },
  { kind: 'database', description: 'Managed PostgreSQL' },
  { kind: 'storage', description: 'Encrypted object storage' },
  { kind: 'kubernetes', description: 'Container cluster host' },
];

export function NodePalette({ onAdd }: { onAdd: (kind: CanvasNodeKind) => void }) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    network: Network,
    cpu: Cpu,
    database: Database,
    'hard-drive': HardDrive,
    ship: Ship,
  };

  return (
    <div className="w-60 shrink-0 h-full overflow-y-auto p-3 space-y-4 bg-neutral-950/60 border-r border-neutral-800/80">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2 px-1">
          Resource Palette
        </div>
        <div className="space-y-2">
          {PALETTE_ITEMS.map((item) => {
            const meta = KIND_META[item.kind];
            const Icon = icons[meta.icon];
            return (
              <button
                key={item.kind}
                onClick={() => onAdd(item.kind)}
                className="w-full text-left p-3 rounded-xl border border-neutral-800 bg-neutral-900/60 hover:border-neutral-400/50 hover:bg-neutral-900 transition-all group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className={`p-2 rounded-lg border ${meta.accent}`}>
                    <Icon className={`w-4 h-4 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-neutral-200 group-hover:text-white">
                      {meta.label}
                    </div>
                    <div className="text-[10px] text-neutral-500 truncate">{item.description}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-500/20">
        <div className="flex items-center space-x-2 text-[11px] font-semibold text-neutral-200 mb-1.5">
          <Cloud className="w-3.5 h-3.5" />
          <span>Multi-Cloud Catalog</span>
        </div>
        <div className="space-y-1.5 text-[10px] text-neutral-400">
          {(['AWS', 'AZURE', 'GCP'] as const).map((p) => (
            <div key={p} className="flex items-center space-x-1.5">
              <ProviderIcon provider={p} size={12} />
              <span>
                {p === 'AWS' && 'VPC, EC2, RDS, S3'}
                {p === 'AZURE' && 'VNet, VM, Flexible PG, Blob'}
                {p === 'GCP' && 'VPC, GCE, Cloud SQL, GCS'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
        <div className="flex items-center space-x-2 text-[11px] font-semibold text-neutral-200 mb-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Embedded Guardrails</span>
        </div>
        <ul className="text-[10px] text-neutral-400 space-y-1 list-disc list-inside">
          <li>Encrypted storage enforced</li>
          <li>SSH guarded by CIDR allowlist</li>
          <li>Private-by-default databases</li>
        </ul>
      </div>
    </div>
  );
}
