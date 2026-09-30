'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import {
  Sparkles,
  Rocket,
  PenTool,
  Check,
  Copy,
  Layers,
  DollarSign,
  Cloud,
  Network,
  Cpu,
  Database,
  HardDrive,
  FileCode2,
  ArrowRight,
  ShieldCheck,
  Wand2,
} from 'lucide-react';
import { api, GeneratedArchitecture } from '../../lib/api';
import { useAuth } from '../../context/auth-context';
import { useToast } from '../../components/cerebro/ui-kit';
import { DeployDialog } from '../../components/designer/deploy-dialog';
import { saveActiveDesignId } from '../../lib/design-storage';

const QUICK_PROMPTS = [
  {
    title: 'AWS Three-Tier Web Stack',
    desc: 'VPC with public/private subnets, EC2 auto-scaled web cluster, and RDS PostgreSQL database.',
    provider: 'AWS' as const,
  },
  {
    title: 'Azure Enterprise Microservices',
    desc: 'Virtual Network with security rules, Linux VM workloads, and scalable Blob Storage container.',
    provider: 'AZURE' as const,
  },
  {
    title: 'GCP Analytics & Data Backend',
    desc: 'Google Compute Engine instances with VPC network and Cloud SQL PostgreSQL database.',
    provider: 'GCP' as const,
  },
  {
    title: 'High-Availability WordPress Cluster',
    desc: 'Fault-tolerant web tier attached to private managed relational database and S3 media storage.',
    provider: 'AWS' as const,
  },
];

export default function AiArchitectPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { push } = useToast();

  const [prompt, setPrompt] = useState('');
  const [cloudProvider, setCloudProvider] = useState<'AWS' | 'AZURE' | 'GCP' | 'MULTI'>('AWS');
  const [architecture, setArchitecture] = useState<GeneratedArchitecture | null>(null);
  const [activeTab, setActiveTab] = useState<'topology' | 'resources' | 'terraform'>('topology');
  const [copied, setCopied] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const [savedDesignId, setSavedDesignId] = useState<string | null>(null);
  const [isSavingDesign, setIsSavingDesign] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async (payload: { prompt: string; cloudProvider: 'AWS' | 'AZURE' | 'GCP' | 'MULTI' }) => {
      const res = await api.ai.generateArchitecture(payload);
      return res.architecture;
    },
    onSuccess: (data) => {
      setArchitecture(data);
      setSavedDesignId(null);
      push({
        title: 'Architecture Generated',
        sub: `Created ${data.nodes.length} resources for ${data.cloudProvider}`,
        tone: 'success',
      });
    },
    onError: (err: any) => {
      push({
        title: 'Generation Failed',
        sub: err.message || 'Unable to generate architecture from prompt',
        tone: 'fail',
      });
    },
  });

  const handleGenerate = (customPrompt?: string, customProvider?: 'AWS' | 'AZURE' | 'GCP' | 'MULTI') => {
    const text = customPrompt || prompt;
    const provider = customProvider || cloudProvider;
    if (!text.trim()) {
      push({ title: 'Please describe your infrastructure requirements first', tone: 'warn' });
      return;
    }
    generateMutation.mutate({ prompt: text.trim(), cloudProvider: provider });
  };

  const handleOpenInDesigner = async () => {
    if (!architecture) return;
    if (!user) {
      router.push('/login');
      return;
    }

    setIsSavingDesign(true);
    try {
      let targetId = savedDesignId;
      if (!targetId) {
        const res = await api.designs.create({
          name: architecture.name,
          description: architecture.description,
          cloudProvider: architecture.cloudProvider,
          nodes: architecture.nodes as any,
          edges: architecture.edges as any,
        });
        targetId = res.design.id;
        setSavedDesignId(targetId);
      }
      saveActiveDesignId(targetId);
      push({ title: 'Opening in Visual Designer', sub: architecture.name, tone: 'success' });
      router.push(`/designer?id=${targetId}`);
    } catch (err: any) {
      push({
        title: 'Failed to create design draft',
        sub: err.message || 'Try again or log in',
        tone: 'fail',
      });
    } finally {
      setIsSavingDesign(false);
    }
  };

  const handleCopyCode = () => {
    if (!architecture?.terraformCode) return;
    navigator.clipboard.writeText(architecture.terraformCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    push({ title: 'Terraform code copied to clipboard', tone: 'success' });
  };

  const getKindIcon = (kind: string) => {
    switch (kind) {
      case 'network':
        return <Network className="w-4 h-4 text-cyan-400" />;
      case 'compute':
      case 'kubernetes':
        return <Cpu className="w-4 h-4 text-indigo-400" />;
      case 'database':
        return <Database className="w-4 h-4 text-emerald-400" />;
      case 'storage':
        return <HardDrive className="w-4 h-4 text-amber-400" />;
      default:
        return <Layers className="w-4 h-4 text-neutral-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800/80 pb-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Infrastructure Studio</span>
            <span className="text-[10px] text-indigo-400/80 font-mono">Gemini 2.0</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Natural Language &rarr; Deployable Infrastructure
          </h1>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
            Describe your application in plain words. Google Gemini builds the multi-cloud topology, wires
            module dependencies, writes production Terraform, and prepares it for 1-click cloud deployment.
          </p>
        </div>

        {architecture && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenInDesigner}
              disabled={isSavingDesign}
              className="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-white font-semibold text-xs flex items-center space-x-2 transition-all shadow-md"
            >
              <PenTool className="w-4 h-4 text-indigo-400" />
              <span>{isSavingDesign ? 'Preparing Canvas…' : 'Open in Visual Designer'}</span>
            </button>
            <button
              onClick={() => setDeployOpen(true)}
              className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-neutral-950 font-bold text-xs flex items-center space-x-2 transition-all shadow-lg shadow-black/40"
            >
              <Rocket className="w-4 h-4 text-neutral-950" />
              <span>Deploy Now</span>
            </button>
          </div>
        )}
      </div>

      {/* Prompt Card */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 md:p-6 backdrop-blur space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <label className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center space-x-2">
            <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Describe your desired infrastructure</span>
          </label>

          {/* Provider selector */}
          <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-neutral-950 border border-neutral-800 text-xs self-start md:self-auto">
            {(['AWS', 'AZURE', 'GCP', 'MULTI'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setCloudProvider(p)}
                className={`px-3 py-1 rounded-lg font-bold transition-all text-[11px] ${
                  cloudProvider === p
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {p === 'MULTI' ? 'Auto-Detect' : p}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleGenerate();
              }
            }}
            placeholder="e.g. A scalable 3-tier e-commerce backend on AWS with an isolated VPC, an EC2 web tier, an RDS PostgreSQL database, and an encrypted S3 bucket for product images..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-neutral-950/80 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-all resize-none font-sans leading-relaxed"
          />

          <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
            <span className="text-[11px] text-neutral-500 flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-300 font-mono">
                Ctrl + Enter
              </kbd>
              <span>to generate</span>
            </span>

            <button
              onClick={() => handleGenerate()}
              disabled={generateMutation.isPending || !prompt.trim()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-2 transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50"
            >
              {generateMutation.isPending ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  <span>Synthesizing Architecture…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                  <span>Generate Architecture</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="pt-2 border-t border-neutral-800/60">
          <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block mb-2">
            Or pick an architectural pattern:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPrompt(qp.desc);
                  setCloudProvider(qp.provider);
                  handleGenerate(qp.desc, qp.provider);
                }}
                className="p-2.5 rounded-xl bg-neutral-950/40 border border-neutral-800 hover:border-indigo-500/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-neutral-200 group-hover:text-indigo-300">
                    {qp.title}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                    {qp.provider}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 line-clamp-2 leading-snug">{qp.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Generated Architecture Preview Area */}
      {architecture && (
        <div className="space-y-6">
          {/* Architecture Meta Summary Banner */}
          <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/20 via-neutral-900 to-neutral-900 p-6 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2.5">
                  <h2 className="text-xl font-bold text-white">{architecture.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {architecture.cloudProvider}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1">{architecture.description}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-center">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Resources</span>
                  <span className="text-sm font-mono font-bold text-neutral-200">
                    {architecture.nodes.length} nodes
                  </span>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-center">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Est. Monthly</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    ${architecture.estimatedCostMonthlyUsd}/mo
                  </span>
                </div>
              </div>
            </div>

            {/* AI Architectural Rationale */}
            {architecture.rationale && (
              <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 text-xs text-neutral-300 space-y-1">
                <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>AI Architecture Rationale &amp; Security Boundary</span>
                </div>
                <p className="text-neutral-400 leading-relaxed text-[11px]">{architecture.rationale}</p>
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-2 border-b border-neutral-800 pb-2">
            <button
              onClick={() => setActiveTab('topology')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all ${
                activeTab === 'topology'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Interactive Topology ({architecture.nodes.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all ${
                activeTab === 'resources'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Resource Specifications</span>
            </button>
            <button
              onClick={() => setActiveTab('terraform')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all ${
                activeTab === 'terraform'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Generated Terraform HCL</span>
            </button>
          </div>

          {/* Tab 1: Topology */}
          {activeTab === 'topology' && (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 space-y-4">
              <div className="flex items-center justify-between text-xs text-neutral-400 border-b border-neutral-800/60 pb-3">
                <span>Visual Architecture Flow (Tiered Top-to-Bottom Layout)</span>
                <span>{architecture.edges.length} Dependency Link(s)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                {/* Column 1: Network Foundation */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    <Network className="w-4 h-4" />
                    <span>Network Tier</span>
                  </div>
                  {architecture.nodes
                    .filter((n) => n.kind === 'network')
                    .map((node) => (
                      <div
                        key={node.id}
                        className="p-4 rounded-xl bg-neutral-950 border border-cyan-500/30 space-y-2 shadow-md hover:border-cyan-500/60 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{node.data.label}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300">
                            {node.data.provider}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400">
                          {node.data.notes || 'Isolated network foundation'}
                        </p>
                        {node.data.config && Object.keys(node.data.config).length > 0 && (
                          <div className="pt-2 border-t border-neutral-800/80 font-mono text-[10px] text-neutral-400 space-y-0.5">
                            {Object.entries(node.data.config).map(([k, v]) => (
                              <div key={k} className="flex justify-between">
                                <span className="text-neutral-500">{k}:</span>
                                <span className="text-neutral-300">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>

                {/* Column 2: Compute Workloads */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    <Cpu className="w-4 h-4" />
                    <span>Compute Tier</span>
                  </div>
                  {architecture.nodes
                    .filter((n) => n.kind === 'compute' || n.kind === 'kubernetes')
                    .map((node) => (
                      <div
                        key={node.id}
                        className="p-4 rounded-xl bg-neutral-950 border border-indigo-500/30 space-y-2 shadow-md hover:border-indigo-500/60 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{node.data.label}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950/60 text-indigo-300">
                            {node.data.provider}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400">
                          {node.data.notes || 'Workload application instance'}
                        </p>
                        {node.data.config && Object.keys(node.data.config).length > 0 && (
                          <div className="pt-2 border-t border-neutral-800/80 font-mono text-[10px] text-neutral-400 space-y-0.5">
                            {Object.entries(node.data.config).map(([k, v]) => (
                              <div key={k} className="flex justify-between">
                                <span className="text-neutral-500">{k}:</span>
                                <span className="text-neutral-300">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>

                {/* Column 3: Data & Storage */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    <Database className="w-4 h-4" />
                    <span>Data &amp; Storage Tier</span>
                  </div>
                  {architecture.nodes
                    .filter((n) => n.kind === 'database' || n.kind === 'storage')
                    .map((node) => (
                      <div
                        key={node.id}
                        className="p-4 rounded-xl bg-neutral-950 border border-emerald-500/30 space-y-2 shadow-md hover:border-emerald-500/60 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            {getKindIcon(node.kind)}
                            <span className="text-xs font-bold text-white">{node.data.label}</span>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300">
                            {node.data.provider}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400">{node.data.notes || node.kind}</p>
                        {node.data.config && Object.keys(node.data.config).length > 0 && (
                          <div className="pt-2 border-t border-neutral-800/80 font-mono text-[10px] text-neutral-400 space-y-0.5">
                            {Object.entries(node.data.config).map(([k, v]) => (
                              <div key={k} className="flex justify-between">
                                <span className="text-neutral-500">{k}:</span>
                                <span className="text-neutral-300">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Resource Specs */}
          {activeTab === 'resources' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {architecture.nodes.map((node) => (
                <div
                  key={node.id}
                  className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center">
                        {getKindIcon(node.kind)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{node.data.label}</h4>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {node.data.templateRef}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      ${node.data.monthlyCost || 15}/mo
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 text-[11px] font-mono space-y-1">
                    {node.data.config && Object.keys(node.data.config).length > 0 ? (
                      Object.entries(node.data.config).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="text-neutral-500">{k}</span>
                          <span className="text-neutral-300">{String(v)}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-neutral-500 italic">Default cloud parameters applied</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Terraform HCL */}
          {activeTab === 'terraform' && (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 text-xs">
                <span className="font-mono text-neutral-400">main.tf — Production Architecture Code</span>
                <button
                  onClick={handleCopyCode}
                  className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center space-x-1.5 transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy HCL'}</span>
                </button>
              </div>
              <pre className="p-5 text-xs font-mono text-neutral-300 overflow-x-auto max-h-[500px] leading-relaxed">
                <code>{architecture.terraformCode}</code>
              </pre>
            </div>
          )}

          {/* Bottom Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Ready to inspect or deploy?</h4>
                <p className="text-[11px] text-neutral-400">
                  Open in the Visual Designer to adjust canvas nodes or trigger an immediate deployment plan.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                onClick={handleOpenInDesigner}
                disabled={isSavingDesign}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition-all shadow"
              >
                <PenTool className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isSavingDesign ? 'Opening…' : 'Customize in Designer'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setDeployOpen(true)}
                className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-white hover:bg-neutral-200 text-neutral-950 font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-black/40"
              >
                <Rocket className="w-3.5 h-3.5 text-neutral-950" />
                <span>Deploy Architecture</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deploy Dialog */}
      {architecture && (
        <DeployDialog
          open={deployOpen}
          onClose={() => setDeployOpen(false)}
          designId={savedDesignId}
          designName={architecture.name}
          nodeCount={architecture.nodes.length}
          cloudProvider={architecture.cloudProvider}
          nodes={architecture.nodes}
          edges={architecture.edges}
          onSaveBeforeDeploy={async () => {
            const res = await api.designs.create({
              name: architecture.name,
              description: architecture.description,
              cloudProvider: architecture.cloudProvider,
              nodes: architecture.nodes as any,
              edges: architecture.edges as any,
            });
            setSavedDesignId(res.design.id);
            return res.design.id;
          }}
        />
      )}
    </div>
  );
}
