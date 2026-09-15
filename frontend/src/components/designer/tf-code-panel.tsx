'use client';

import React, { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { downloadFile } from '../../lib/design-storage';

interface TfCodePanelProps {
  code: string;
  designName: string;
  dirty: boolean;
}

export function TfCodePanel({ code, designName, dirty }: TfCodePanelProps) {
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(true);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable (non-secure context) — fall back to download
      downloadFile('main.tf', code);
    }
  };

  const handleDownload = () => {
    downloadFile(
      `${designName.toLowerCase().replace(/\s+/g, '-') || 'design'}-main.tf`,
      code,
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800/80 bg-neutral-950/60">
        <div className="flex items-center space-x-2 text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
          <span className="text-neutral-300">Terraform</span>
          <span className="text-neutral-600">|</span>
          <span className="font-mono normal-case text-neutral-400">main.tf</span>
          {dirty && (
            <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-semibold normal-case">
              unsaved changes
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-600"
            title="Copy Terraform code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-neutral-300" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-600"
            title="Download main.tf"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showCode && (
        <pre className="flex-1 overflow-auto p-3 text-[11px] leading-relaxed font-mono text-neutral-300 bg-neutral-950/80">
          {code}
        </pre>
      )}
    </div>
  );
}
