'use client';

import React from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  PlayCircle,
  Loader2,
  Cpu,
  Layers,
  Calendar,
  Lock,
} from 'lucide-react';

interface ExecutionStatusPipelineProps {
  status: string;
  operationType: string;
  createdAt: string;
  planTime?: string | null;
  applyTime?: string | null;
  executionReference?: string | null;
}

const PIPELINE_STAGES = [
  { key: 'PLANNING', label: 'Planning', desc: 'Dry-run evaluation' },
  { key: 'PLANNED', label: 'Planned', desc: 'Awaiting operator approval' },
  { key: 'QUEUED', label: 'Queued', desc: 'Dispatched to RabbitMQ' },
  { key: 'RUNNING', label: 'Applying', desc: 'Terraform worker execution' },
  { key: 'SUCCEEDED', label: 'Completed', desc: 'State verified & recorded' },
];

export function ExecutionStatusPipeline({
  status,
  operationType,
  createdAt,
  planTime,
  applyTime,
  executionReference,
}: ExecutionStatusPipelineProps) {
  const isFailed = status === 'FAILED';
  const isCancelled = status === 'CANCELLED';

  const getStageState = (stageKey: string) => {
    if (isFailed || isCancelled) {
      if (stageKey === 'SUCCEEDED') return 'failed';
    }

    const order = ['DRAFT', 'PLANNING', 'PLANNED', 'QUEUED', 'RUNNING', 'SUCCEEDED'];
    const currentIndex = order.indexOf(status);
    const stageIndex = order.indexOf(stageKey);

    if (status === stageKey) return 'active';
    if (currentIndex > stageIndex) return 'completed';
    return 'upcoming';
  };

  const getOperationBadge = (op: string) => {
    switch (op) {
      case 'DESTROY':
        return 'bg-rose-950/40 text-rose-400 border-rose-800/40';
      case 'MODIFY':
        return 'bg-amber-950/40 text-amber-400 border-amber-800/40';
      case 'CREATE':
      default:
        return 'bg-emerald-950/40 text-neutral-300 border-emerald-800/40';
    }
  };

  // Calculate duration if completed
  const formatDuration = () => {
    if (!applyTime || !createdAt) return null;
    const start = new Date(createdAt).getTime();
    const end = new Date(applyTime).getTime();
    const diffSec = Math.max(0, Math.round((end - start) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/40 space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-4">
        <div className="flex items-center space-x-3">
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider ${getOperationBadge(
              operationType
            )}`}
          >
            {operationType}
          </span>

          <div className="flex items-center space-x-2 text-xs text-neutral-300">
            <span className="text-neutral-400">Status:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded-full border uppercase text-[11px] ${
                status === 'SUCCEEDED'
                  ? 'bg-white/5 text-neutral-300 border-neutral-500/30'
                  : status === 'RUNNING'
                  ? 'bg-white/5 text-neutral-300 border-neutral-500/30 animate-pulse'
                  : status === 'FAILED'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  : 'bg-white/5 text-neutral-300 border-neutral-500/30'
              }`}
            >
              {status}
            </span>
          </div>
        </div>

        {/* Timing & Telemetry */}
        <div className="flex items-center space-x-4 text-xs text-neutral-400 font-mono">
          {formatDuration() && (
            <div className="flex items-center space-x-1.5 text-neutral-300">
              <Clock className="w-3.5 h-3.5 text-neutral-300" />
              <span>Duration: {formatDuration()}</span>
            </div>
          )}
          {executionReference && (
            <div className="flex items-center space-x-1 text-neutral-500 truncate max-w-[160px]" title={executionReference}>
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Lock: {executionReference.slice(0, 10)}...</span>
            </div>
          )}
        </div>
      </div>

      {/* Visual Pipeline Bar */}
      <div className="relative pt-2 pb-1">
        <div className="grid grid-cols-5 gap-2 sm:gap-4 relative">
          {PIPELINE_STAGES.map((stage, idx) => {
            const state = getStageState(stage.key);

            return (
              <div key={stage.key} className="flex flex-col items-center text-center space-y-2 relative">
                {/* Node indicator */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    state === 'completed'
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : state === 'active'
                      ? 'bg-white text-neutral-900 ring-4 ring-neutral-400/20 shadow-lg shadow-black/40 animate-pulse'
                      : state === 'failed'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                      : 'bg-neutral-950 border border-neutral-800 text-neutral-500'
                  }`}
                >
                  {state === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : state === 'active' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : state === 'failed' ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Stage labels */}
                <div className="space-y-0.5">
                  <div
                    className={`text-xs font-bold leading-tight ${
                      state === 'active'
                        ? 'text-white'
                        : state === 'completed'
                        ? 'text-neutral-200'
                        : state === 'failed'
                        ? 'text-rose-400'
                        : 'text-neutral-500'
                    }`}
                  >
                    {stage.label}
                  </div>
                  <div className="hidden sm:block text-[10px] text-neutral-500 font-normal leading-tight">
                    {stage.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
