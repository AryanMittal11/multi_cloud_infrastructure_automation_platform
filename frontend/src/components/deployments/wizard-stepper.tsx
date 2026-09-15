'use client';

import React from 'react';
import { Check, Layers, FolderGit2, Settings, FileSearch, ShieldCheck } from 'lucide-react';

interface Step {
  id: number;
  title: string;
  shortDesc: string;
  icon: React.ElementType;
}

const STEPS: Step[] = [
  { id: 1, title: 'Context', shortDesc: 'Project & Env', icon: FolderGit2 },
  { id: 2, title: 'Template', shortDesc: 'AWS Archetype', icon: Layers },
  { id: 3, title: 'Parameters', shortDesc: 'Schema Inputs', icon: Settings },
  { id: 4, title: 'Plan & Diff', shortDesc: 'Dry-Run Preview', icon: FileSearch },
  { id: 5, title: 'Approval', shortDesc: 'Role Signoff', icon: ShieldCheck },
];

interface WizardStepperProps {
  currentStep: number;
  onStepClick?: (stepId: number) => void;
  maxStepReached: number;
}

export function WizardStepper({
  currentStep,
  onStepClick,
  maxStepReached,
}: WizardStepperProps) {
  return (
    <div className="w-full py-4 border-b border-neutral-800/80 mb-8">
      <div className="flex items-center justify-between relative max-w-4xl mx-auto px-4">
        {/* Connecting Progress Line */}
        <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 h-0.5 bg-neutral-800 -z-0">
          <div
            className="h-full bg-gradient-to-r from-neutral-200 via-neutral-400 to-neutral-500 transition-all duration-300"
            style={{
              width: `${((Math.min(currentStep, 5) - 1) / 4) * 100}%`,
            }}
          />
        </div>

        {STEPS.map((step) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;
          const isClickable = step.id <= maxStepReached && onStepClick;
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={`flex flex-col items-center relative z-10 select-none ${
                isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
              }`}
              onClick={() => isClickable && onStepClick(step.id)}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 ${
                  isCompleted
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : isActive
                    ? 'bg-white text-neutral-900 ring-4 ring-neutral-400/20 shadow-lg shadow-black/40 scale-110'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-500'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>

              <div className="mt-2 text-center">
                <span
                  className={`block text-xs font-bold transition-colors ${
                    isActive
                      ? 'text-white'
                      : isCompleted
                      ? 'text-neutral-300'
                      : 'text-neutral-500'
                  }`}
                >
                  {step.title}
                </span>
                <span className="hidden sm:block text-[10px] text-neutral-500 font-normal">
                  {step.shortDesc}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
