'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Copy,
  Check,
  Download,
  Search,
  ArrowDown,
  FileCode,
  Radio,
} from 'lucide-react';

interface LogTerminalProps {
  planOutput?: string | null;
  applyOutput?: string | null;
  status: string;
}

export function LogTerminal({
  planOutput,
  applyOutput,
  status,
}: LogTerminalProps) {
  const [activeTab, setActiveTab] = useState<'apply' | 'plan'>(
    applyOutput ? 'apply' : 'plan'
  );
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const terminalRef = useRef<HTMLPreElement | null>(null);

  const rawLogs = activeTab === 'apply' ? applyOutput || '' : planOutput || '';

  // Auto-scroll to bottom if active and enabled
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [rawLogs, autoScroll, activeTab]);

  // Copy handler
  const handleCopy = () => {
    if (!rawLogs) return;
    navigator.clipboard.writeText(rawLogs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download logs handler
  const handleDownload = () => {
    if (!rawLogs) return;
    const blob = new Blob([rawLogs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terraform-${activeTab}-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter logs if search is present
  const displayedLogs = searchQuery.trim()
    ? rawLogs
        .split('\n')
        .filter((line) => line.toLowerCase().includes(searchQuery.toLowerCase()))
        .join('\n')
    : rawLogs;

  const isLive = status === 'RUNNING' || status === 'PLANNING';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden flex flex-col shadow-2xl">
      {/* Terminal Title Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
        <div className="flex items-center space-x-3">
          {/* Window dots */}
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>

          {/* Tab switcher */}
          <div className="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('apply')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                activeTab === 'apply'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Apply Output {applyOutput ? '✓' : ''}
            </button>
            <button
              onClick={() => setActiveTab('plan')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                activeTab === 'plan'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Plan Output {planOutput ? '✓' : ''}
            </button>
          </div>

          {isLive && (
            <span className="flex items-center space-x-1.5 text-[11px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40 animate-pulse">
              <Radio className="w-3 h-3" />
              <span>Live Streaming</span>
            </span>
          )}
        </div>

        {/* Action Controls: Search, Auto-Scroll, Copy, Download */}
        <div className="flex items-center space-x-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-32 sm:w-44 transition-all"
            />
          </div>

          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded-lg border text-xs transition-colors flex items-center space-x-1 ${
              autoScroll
                ? 'bg-indigo-950/60 border-indigo-700/50 text-indigo-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Auto-scroll to bottom"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            disabled={!rawLogs}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs transition-colors disabled:opacity-40"
            title="Copy all logs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={!rawLogs}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs transition-colors disabled:opacity-40"
            title="Download log file"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <pre
        ref={terminalRef}
        className="p-5 font-mono text-xs text-slate-300 overflow-x-auto overflow-y-auto max-h-[500px] min-h-[260px] leading-relaxed whitespace-pre-wrap selection:bg-indigo-600 selection:text-white bg-slate-950/95"
      >
        {displayedLogs ? (
          displayedLogs
        ) : (
          <span className="text-slate-600 italic">
            {activeTab === 'apply'
              ? status === 'RUNNING'
                ? 'Initializing execution workspace and executing terraform apply...'
                : status === 'QUEUED'
                ? 'Execution queued in RabbitMQ. Awaiting worker pickup...'
                : 'No apply logs available for this deployment.'
              : 'No plan logs available.'}
          </span>
        )}
      </pre>

      {/* Footer bar */}
      <div className="bg-slate-900/60 border-t border-slate-800/80 px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <div>
          <span>Lines: {rawLogs ? rawLogs.split('\n').length : 0}</span>
          {searchQuery && <span className="text-indigo-400 ml-2">(Filtered)</span>}
        </div>
        <div className="flex items-center space-x-2">
          <span>Worker: Isolated Ephemeral Directory</span>
          <span>&bull;</span>
          <span className="text-emerald-400">Secrets Sanitized</span>
        </div>
      </div>
    </div>
  );
}
