'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Template } from '../../lib/api';
import { useAuth } from '../../context/auth-context';
import {
  Layers,
  RefreshCw,
  Code2,
  PlayCircle,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  FileCode,
  Key,
} from 'lucide-react';

export default function TemplatesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.templates.list(),
    enabled: !!user,
  });

  const syncMutation = useMutation({
    mutationFn: () => api.templates.sync(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setSyncFeedback(res.message);
      setTimeout(() => setSyncFeedback(null), 4000);
    },
    onError: (err: any) => {
      setSyncFeedback(err.message || 'Sync failed');
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-white/5 border border-neutral-500/30 text-neutral-300">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Template Catalog</h1>
              <p className="text-xs text-neutral-400">
                Curated, verified Terraform modules with dynamic JSONSchema parameter contracts
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {user ? (
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 font-semibold text-xs flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              <span>{syncMutation.isPending ? 'Syncing...' : 'Sync from Disk'}</span>
            </button>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Key className="w-4 h-4" />
              <span>Sign in to Access Catalog</span>
            </Link>
          )}
        </div>
      </div>

      {syncFeedback && (
        <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-500/30 text-neutral-200 text-xs flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-neutral-300" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Templates Grid */}
      {user && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-56 rounded-2xl border border-neutral-800 bg-neutral-900/40 animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-950/20 text-rose-300 text-xs flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Failed to fetch templates: {(error as Error).message}</span>
            </div>
          ) : data?.templates && data.templates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.templates.map((template: Template) => {
                const schemaProperties = template.inputSchema?.properties
                  ? Object.keys(template.inputSchema.properties).length
                  : 0;
                const providerBadgeClass = 'bg-white/5 text-neutral-300 border-neutral-500/30';

                return (
                  <div
                    key={template.id}
                    className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h2 className="text-base font-bold text-white tracking-tight">
                            {template.name}
                          </h2>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${providerBadgeClass}`}
                            >
                              {template.provider || 'CROSS-CLOUD'}
                            </span>
                            <span className="text-[10px] font-mono text-neutral-400">
                              v{template.version}
                            </span>
                          </div>
                        </div>

                        <div className="p-2 rounded-xl bg-neutral-950/60 border border-neutral-800 text-neutral-300">
                          <FileCode className="w-4 h-4 text-neutral-300" />
                        </div>
                      </div>

                      <p className="text-xs text-neutral-400 line-clamp-2">
                        {template.description || 'Modular infrastructure template definition.'}
                      </p>

                      <div className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 text-[11px] text-neutral-300 flex items-center justify-between">
                        <span className="text-neutral-400">Input Schema:</span>
                        <span className="font-mono text-neutral-200">
                          {schemaProperties} configurable parameter(s)
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-800/80 flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedTemplate(template)}
                        className="flex-1 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center justify-center space-x-1.5 transition-all"
                      >
                        <Code2 className="w-3.5 h-3.5 text-neutral-300" />
                        <span>Inspect Schema</span>
                      </button>

                      <Link
                        href={`/deployments/wizard?templateId=${template.id}`}
                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-neutral-200 border border-neutral-500/30 text-xs font-semibold flex items-center justify-center space-x-1 transition-all"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Launch</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/40 space-y-3">
              <Layers className="w-10 h-10 text-neutral-600 mx-auto" />
              <h2 className="text-sm font-semibold text-neutral-300">No templates cataloged</h2>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Sync templates from the repository disk storage to populate AWS and multi-cloud modules.
              </p>
              <button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-neutral-900 font-medium text-xs shadow-md shadow-black/30"
              >
                Sync Templates from Disk
              </button>
            </div>
          )}
        </>
      )}

      {/* Schema Inspector Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <Code2 className="w-5 h-5 text-neutral-300" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {selectedTemplate.name} — Schema Specification
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    Module ref: {selectedTemplate.templateReference}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="text-xs text-neutral-300">
                <div className="font-semibold text-white mb-2">Configurable Inputs:</div>
                <div className="space-y-2">
                  {selectedTemplate.inputSchema?.properties ? (
                    Object.entries(selectedTemplate.inputSchema.properties).map(
                      ([propKey, propVal]: [string, any]) => {
                        const isRequired = selectedTemplate.inputSchema?.required?.includes(propKey);
                        return (
                          <div
                            key={propKey}
                            className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-neutral-200">{propKey}</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                                  {propVal.type || 'string'}
                                </span>
                                {isRequired && (
                                  <span className="text-[10px] font-semibold text-rose-400">
                                    Required
                                  </span>
                                )}
                              </div>
                            </div>
                            {propVal.description && (
                              <p className="text-[11px] text-neutral-400">{propVal.description}</p>
                            )}
                            {propVal.default !== undefined && (
                              <div className="text-[10px] text-neutral-500 font-mono">
                                Default: {JSON.stringify(propVal.default)}
                              </div>
                            )}
                          </div>
                        );
                      }
                    )
                  ) : (
                    <div className="text-neutral-500 italic">No properties declared</div>
                  )}
                </div>
              </div>

              {/* Raw JSON viewer */}
              <div className="space-y-1">
                <div className="font-semibold text-xs text-neutral-300">Raw JSONSchema:</div>
                <pre className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-[11px] text-neutral-400 overflow-x-auto max-h-44">
                  {JSON.stringify(selectedTemplate.inputSchema, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800 flex justify-end">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
