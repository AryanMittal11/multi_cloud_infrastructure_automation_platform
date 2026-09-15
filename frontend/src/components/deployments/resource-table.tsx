'use client';

import React, { useState } from 'react';
import { Resource } from '../../lib/api';
import {
  Server,
  Cloud,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Database,
  Globe,
  HardDrive,
  Shield,
  Layers,
} from 'lucide-react';

interface ResourceTableProps {
  resources: Resource[];
  isLoading?: boolean;
}

export function ResourceTable({ resources, isLoading }: ResourceTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getResourceIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('vpc') || t.includes('network') || t.includes('subnet')) {
      return Globe;
    }
    if (t.includes('db') || t.includes('database') || t.includes('rds')) {
      return Database;
    }
    if (t.includes('s3') || t.includes('bucket') || t.includes('storage')) {
      return HardDrive;
    }
    if (t.includes('security') || t.includes('firewall')) {
      return Shield;
    }
    return Server;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-white/5 text-neutral-300 border-neutral-500/30';
      case 'PROVISIONING':
        return 'bg-white/5 text-neutral-300 border-neutral-500/30 animate-pulse';
      case 'DESTROYED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'FAILED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center rounded-2xl border border-neutral-800 bg-neutral-900/40 space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-neutral-400 border-t-transparent animate-spin mx-auto" />
        <p className="text-xs text-neutral-400">Loading provisioned cloud assets...</p>
      </div>
    );
  }

  if (!resources || resources.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/40 space-y-2">
        <Layers className="w-8 h-8 text-neutral-600 mx-auto" />
        <h4 className="text-xs font-semibold text-neutral-300">No provisioned resources tracked</h4>
        <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
          Resources appear here in real-time as the Terraform worker applies module definitions.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden shadow-lg">
      <div className="p-4 border-b border-neutral-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Server className="w-4 h-4 text-neutral-300" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
            Provisioned Cloud Resources ({resources.length})
          </h3>
        </div>
        <span className="text-[10px] font-mono text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
          Provider: AWS Target
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-950/80 border-b border-neutral-800 text-neutral-400 uppercase text-[10px] tracking-wider font-semibold">
            <tr>
              <th className="py-3 px-4">Resource Type</th>
              <th className="py-3 px-4">Name / ID</th>
              <th className="py-3 px-4">Provider Reference</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Outputs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60 font-mono text-[11px]">
            {resources.map((res) => {
              const Icon = getResourceIcon(res.resourceType);
              const isExpanded = expandedRowId === res.id;
              const hasOutputs = res.outputs && Object.keys(res.outputs).length > 0;

              return (
                <React.Fragment key={res.id}>
                  <tr className="hover:bg-neutral-850/50 transition-colors">
                    {/* Resource Type */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-bold text-neutral-200">{res.resourceType}</span>
                          <div className="text-[10px] text-neutral-500">{res.provider}</div>
                        </div>
                      </div>
                    </td>

                    {/* Name */}
                    <td className="py-3 px-4 text-neutral-300 font-sans">
                      {res.name || 'unnamed'}
                    </td>

                    {/* Native Provider ID with copy */}
                    <td className="py-3 px-4">
                      {res.providerResourceId ? (
                        <div className="flex items-center space-x-1.5">
                          <span className="text-neutral-300 truncate max-w-[180px]" title={res.providerResourceId}>
                            {res.providerResourceId}
                          </span>
                          <button
                            onClick={() => handleCopy(res.providerResourceId!, res.id)}
                            className="p-1 text-neutral-400 hover:text-white"
                          >
                            {copiedId === res.id ? (
                              <Check className="w-3 h-3 text-neutral-300" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-neutral-600 italic font-sans text-xs">pending id</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 font-sans">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getStatusBadge(
                          res.status
                        )}`}
                      >
                        {res.status}
                      </span>
                    </td>

                    {/* Outputs trigger */}
                    <td className="py-3 px-4 text-right font-sans">
                      {hasOutputs ? (
                        <button
                          onClick={() => setExpandedRowId(isExpanded ? null : res.id)}
                          className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium inline-flex items-center space-x-1"
                        >
                          <span>{Object.keys(res.outputs).length} outputs</span>
                          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>
                      ) : (
                        <span className="text-neutral-600 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>

                  {/* Expanded Outputs Row */}
                  {isExpanded && hasOutputs && (
                    <tr className="bg-neutral-950/90 border-b border-neutral-800/80">
                      <td colSpan={5} className="py-3 px-6">
                        <div className="space-y-1 text-left font-mono">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-300 font-sans">
                            Resource Live Outputs & Endpoints:
                          </div>
                          <pre className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-[11px] overflow-x-auto max-h-36">
                            {JSON.stringify(res.outputs, null, 2)}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
