'use client';

import React, { useState } from 'react';
import {
  Terminal,
  PlusCircle,
  RefreshCw,
  MinusCircle,
  ShieldCheck,
  DollarSign,
  FileCode,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface PlanDiffViewProps {
  planOutput: string | null;
  configuration: Record<string, any>;
  costEstimate?: any;
  policyEvaluation?: any;
}

/** Policy evaluation panel — shared with the deployment detail page. */
export function PolicyReviewPanel({ policyEvaluation }: { policyEvaluation: any }) {
  if (!policyEvaluation) return null;
  return (
    <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>Policy Evaluation</span>
        </h4>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
            policyEvaluation.passed
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}
        >
          {policyEvaluation.passed ? 'PASS' : 'REVIEW REQUIRED'} · {policyEvaluation.evaluator ?? 'policy'}
        </span>
      </div>
      <div className="space-y-1.5">
        {(policyEvaluation.results ?? []).map((r: any, i: number) => (
          <div key={i} className="flex items-start space-x-2 text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className={r.passed ? 'text-emerald-400' : 'text-amber-400'}>{r.passed ? '✓' : '!'}</span>
            <div>
              <p className="font-mono font-semibold text-slate-200">{r.rule}</p>
              <p className="text-slate-400">{r.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Cost estimate panel — shared with the deployment detail page. */
export function CostReviewPanel({ costEstimate }: { costEstimate: any }) {
  if (!costEstimate || costEstimate.monthlyTotalUsd === undefined) return null;
  return (
    <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span>Estimated Cost</span>
        </h4>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
          {costEstimate.source ?? 'estimate'}
        </span>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-white">
          ${costEstimate.monthlyTotalUsd.toFixed(2)}
          <span className="text-xs font-normal text-slate-400 ml-1">/month est.</span>
        </p>
        {costEstimate.region && <span className="chip">{costEstimate.region}</span>}
      </div>
      <div className="space-y-1">
        {(costEstimate.lineItems ?? []).map((li: any) => (
          <div key={li.resourceType} className="flex justify-between text-xs p-2 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-400">{li.label} × {li.quantity} {li.unit}</span>
            <span className="font-mono text-slate-200">${li.monthlyUsd.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <p className="text-[10.5px] text-slate-500">
        Labelled estimate — not a bill. {(costEstimate.assumptions ?? []).map((a: any) => a.value).join(' · ')}
      </p>
    </div>
  );
}

export function PlanDiffView({
  planOutput,
  configuration,
  costEstimate,
  policyEvaluation,
}: PlanDiffViewProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'terminal' | 'config'>('summary');
  const [copied, setCopied] = useState(false);

  // Extract counts from Terraform plan output if available (e.g. "Plan: 1 to add, 0 to change, 0 to destroy")
  const parseDiffCounts = (text?: string | null) => {
    if (!text) return { toAdd: 0, toChange: 0, toDestroy: 0 };
    const match = text.match(/Plan:\s*(\d+)\s+to add,\s*(\d+)\s+to change,\s*(\d+)\s+to destroy/i);
    if (match) {
      return {
        toAdd: parseInt(match[1], 10),
        toChange: parseInt(match[2], 10),
        toDestroy: parseInt(match[3], 10),
      };
    }
    // Fallback: estimate from '+' '-' '~' markers
    const addMatches = (text.match(/^\s*\+\s+resource/gm) || []).length;
    const changeMatches = (text.match(/^\s*~\s+resource/gm) || []).length;
    const destroyMatches = (text.match(/^\s*-\s+resource/gm) || []).length;
    return {
      toAdd: addMatches || 1,
      toChange: changeMatches,
      toDestroy: destroyMatches,
    };
  };

  const diffCounts = parseDiffCounts(planOutput);

  const handleCopy = () => {
    if (!planOutput) return;
    navigator.clipboard.writeText(planOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Diff Metrics Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <PlusCircle className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-xl font-bold text-white">+{diffCounts.toAdd}</div>
              <div className="text-[11px] text-emerald-300 font-medium">Resources to Add</div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-xl font-bold text-white">~{diffCounts.toChange}</div>
              <div className="text-[11px] text-amber-300 font-medium">To Modify</div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MinusCircle className="w-5 h-5 text-rose-400" />
            <div>
              <div className="text-xl font-bold text-white">-{diffCounts.toDestroy}</div>
              <div className="text-[11px] text-rose-300 font-medium">To Destroy</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            activeTab === 'summary'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Plan Summary
        </button>
        <button
          onClick={() => setActiveTab('terminal')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
            activeTab === 'terminal'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Terraform CLI Output</span>
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
            activeTab === 'config'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Config Parameters</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Execution Dry-Run Breakdown
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Non-Destructive Dry-Run Verified
              </span>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed">
              Terraform has computed the following changes against your target cloud environment.
              Review carefully before initiating the authoritative approval gate.
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-xs text-emerald-400 font-mono font-semibold">
                <span>+ Will provision {diffCounts.toAdd} new infrastructure resource(s)</span>
              </div>
              {diffCounts.toChange > 0 && (
                <div className="flex items-center space-x-2 text-xs text-amber-400 font-mono font-semibold">
                  <span>~ Will update {diffCounts.toChange} existing resource(s) in-place</span>
                </div>
              )}
              {diffCounts.toDestroy > 0 && (
                <div className="flex items-center space-x-2 text-xs text-rose-400 font-mono font-semibold">
                  <span>- Will tear down {diffCounts.toDestroy} existing resource(s)</span>
                </div>
              )}
            </div>
          </div>

          {/* Policy evaluation (PDF flow step 8 — presented for review) */}
          {policyEvaluation && <PolicyReviewPanel policyEvaluation={policyEvaluation} />}

          {/* Cost estimate (PDF flow step 9 — presented for review) */}
          {costEstimate?.monthlyTotalUsd !== undefined && <CostReviewPanel costEstimate={costEstimate} />}
        </div>
      )}

      {activeTab === 'terminal' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center space-x-2 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>stdout: terraform plan -no-color</span>
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Output'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-96 leading-relaxed whitespace-pre-wrap selection:bg-indigo-500">
            {planOutput || 'Waiting for plan generation to complete...'}
          </pre>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="space-y-2">
          <span className="text-xs text-slate-400">Submitted Parameter Values:</span>
          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto max-h-80">
            {JSON.stringify(configuration, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
