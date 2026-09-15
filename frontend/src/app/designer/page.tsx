'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useQuery } from '@tanstack/react-query';
import {
  Save,
  Rocket,
  Trash2,
  FileCode2,
  Network,
  LayoutGrid,
  Loader2,
  CheckCircle2,
  Wand2,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/auth-context';
import {
  CanvasNodeKind,
  NODE_TEMPLATE_MAP,
  KIND_META,
} from '../../lib/designer-types';
import { generateTerraform } from '../../lib/tf-generator';
import { saveDraft, saveActiveDesignId, getActiveDesignId } from '../../lib/design-storage';
import { NodePalette } from '../../components/designer/node-palette';
import { InfraNode, InfraNodeData } from '../../components/designer/infra-node';
import { NodeInspector } from '../../components/designer/node-inspector';
import { TfCodePanel } from '../../components/designer/tf-code-panel';
import { DeployDialog } from '../../components/designer/deploy-dialog';
import { useToast } from '../../components/cerebro/ui-kit';

const nodeTypes = { infra: InfraNode };

let nodeCounter = 0;
function nextNodeId(): string {
  nodeCounter += 1;
  return `node_${Date.now()}_${nodeCounter}`;
}

interface CanvasNodeData extends InfraNodeData {}

function DesignerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [designId, setDesignId] = useState<string | null>(null);
  const [designName, setDesignName] = useState('Untitled Architecture');
  const [cloudProvider, setCloudProvider] = useState<'AWS' | 'AZURE' | 'GCP'>('AWS');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [deployOpen, setDeployOpen] = useState(false);
  const [showInspector, setShowInspector] = useState(true);
  const [showCode, setShowCode] = useState(true);

  // Load an existing design when ?id= is present, or restore last active design
  useEffect(() => {
    const idParam = searchParams.get('id');
    const targetId = idParam || getActiveDesignId();
    if (!targetId) return;

    (async () => {
      try {
        const res = await api.designs.get(targetId);
        const d = res.design;
        setDesignId(d.id);
        setDesignName(d.name);
        setCloudProvider((d.cloudProvider as any) || 'AWS');
        setNodesWithCallbacks(
          (d.nodes || []).map((n: any) => ({
            id: n.id,
            type: 'infra',
            position: n.position,
            data: { ...n.data, onSelect: undefined, onDelete: undefined, onConfigure: undefined },
          })),
        );
        setEdges(d.edges || []);
      } catch {
        // Not authenticated yet or design missing — start fresh
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
  const setNodesWithCallbacks = useCallback(
    (
      updater:
        | Node<CanvasNodeData>[]
        | ((current: Node<CanvasNodeData>[]) => Node<CanvasNodeData>[]),
    ) => {
      setNodes((current) => {
        const next = typeof updater === 'function' ? updater(current) : updater;
        return next.map((n) => ({
          ...n,
          data: {
            ...n.data,
            onSelect: setSelectedNodeId,
            onDelete: (id: string) => {
              setNodes((ns) => ns.filter((x) => x.id !== id));
              setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
              setSelectedNodeId((sel) => (sel === id ? null : sel));
            },
            onConfigure: setSelectedNodeId,
          },
        }));
      });
    },
    [setNodes, setEdges],
  );

  const designPayload = useMemo(
    () => ({
      id: designId || 'draft',
      name: designName,
      cloudProvider,
      nodes: nodes.map((n) => ({
        id: n.id,
        kind: n.data.kind,
        position: n.position,
        data: {
          kind: n.data.kind,
          label: n.data.label,
          provider: n.data.provider,
          templateRef: n.data.templateRef,
          config: n.data.config,
          monthlyCost: n.data.monthlyCost,
        },
      })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label as string | undefined })),
    }),
    [designId, designName, cloudProvider, nodes, edges],
  );

  // Live Terraform generation
  const generated = useMemo(
    () => generateTerraform(designName, cloudProvider, designPayload.nodes, designPayload.edges),
    [designName, cloudProvider, designPayload.nodes, designPayload.edges],
  );

  // Draft autosave (localStorage, survives reload pre-auth)
  useEffect(() => {
    if (nodes.length === 0 && edges.length === 0) return;
    saveDraft({ ...designPayload, id: designId || 'draft' });
  }, [designPayload, designId]);

  const addNode = useCallback(
    (kind: CanvasNodeKind) => {
      const provider = cloudProvider;
      const id = nextNodeId();
      const count = nodes.filter((n) => n.data.kind === kind).length + 1;
      const meta = KIND_META[kind];

      const newNode: Node<CanvasNodeData> = {
        id,
        type: 'infra',
        position: {
          x: 160 + (nodes.length % 4) * 240 + Math.random() * 40,
          y: 120 + Math.floor(nodes.length / 4) * 190,
        },
        data: {
          kind,
          label: `${meta.label}-${String(count).padStart(2, '0')}`,
          provider,
          templateRef: NODE_TEMPLATE_MAP[kind][provider],
          config: {},
        },
      };
      setNodesWithCallbacks((nds) => nds.concat(newNode));
      setSelectedNodeId(id);
    },
    [cloudProvider, nodes, setNodesWithCallbacks],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `edge_${Date.now()}`,
            animated: true,
            style: { stroke: '#6366f1', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const updateSelectedNode = useCallback(
    (
      id: string,
      patch: { label?: string; provider?: 'AWS' | 'AZURE' | 'GCP'; config?: Record<string, any> },
    ) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== id) return n;
          const newProvider = patch.provider || n.data.provider;
          const templateRef =
            patch.provider && patch.provider !== n.data.provider
              ? NODE_TEMPLATE_MAP[n.data.kind][newProvider]
              : n.data.templateRef;
          return {
            ...n,
            data: {
              ...n.data,
              label: patch.label ?? n.data.label,
              provider: newProvider,
              templateRef,
              config: patch.config ?? n.data.config,
            },
          };
        }),
      );
    },
    [setNodes],
  );

  // Fetch JSONSchema for the selected node's template to drive the inspector form
  const { data: templateData, isLoading: schemaLoading } = useQuery({
    queryKey: ['template-by-ref', selectedNode?.data.templateRef],
    queryFn: async () => {
      const list = await api.templates.list();
      const match = list.templates.find(
        (t) => t.templateReference === selectedNode!.data.templateRef,
      );
      return match || null;
    },
    enabled: !!selectedNode,
  });

  const selectedTemplateSchema = (templateData as any)?.inputSchema || null;

  const { push } = useToast();

  const handleSave = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!designName.trim()) {
      push({ title: 'Name your design before saving', tone: 'warn' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: designName.trim(),
        description: `Visual architecture with ${nodes.length} resources across ${cloudProvider}`,
        cloudProvider,
        nodes: designPayload.nodes,
        edges: designPayload.edges,
      };
      const res = designId
        ? await api.designs.update(designId, payload)
        : await api.designs.create(payload);
      setDesignId(res.design.id);
      saveActiveDesignId(res.design.id);
      setSavedAt(new Date().toLocaleTimeString());
      push({ title: 'Design saved', sub: res.design.name, tone: 'success' });
    } catch (err: any) {
      push({
        title:
          err?.status === 403
            ? 'Saving designs requires the Developer role or above'
            : err?.status === 404
              ? 'This design was deleted or is not yours to edit'
              : err?.message || 'Failed to save design',
        tone: 'fail',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    if (nodes.length === 0) return;
    if (!confirm('Clear the entire canvas? Unsaved work will be lost.')) return;
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
  };

  const dirty = savedAt === null && nodes.length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* Designer toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800/80 bg-neutral-950/70 backdrop-blur flex-wrap gap-2">
        <div className="flex items-center space-x-3">
          <input
            value={designName}
            onChange={(e) => setDesignName(e.target.value)}
            className="bg-transparent text-sm font-bold text-white focus:outline-none focus:bg-neutral-900 rounded-lg px-2 py-1 w-56 border border-transparent focus:border-neutral-700"
          />
          <div className="flex items-center rounded-xl border border-neutral-800 overflow-hidden">
            {(['AWS', 'AZURE', 'GCP'] as const).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setCloudProvider(p);
                  // Re-map all node template refs to the new provider
                  setNodes((nds) =>
                    nds.map((n) => ({
                      ...n,
                      data: { ...n.data, provider: p, templateRef: NODE_TEMPLATE_MAP[n.data.kind][p] },
                    })),
                  );
                }}
                className={`px-3 py-1.5 text-[10px] font-bold transition-all ${
                  cloudProvider === p
                    ? 'bg-white/15 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-neutral-500 hidden md:inline">
            {nodes.length} resources · {edges.length} links
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-semibold hover:border-neutral-600 flex items-center space-x-1.5 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-neutral-300" />}
            <span>{designId ? 'Saved' : 'Save'} Design</span>
            {savedAt && <span className="text-[9px] text-neutral-300">✓ {savedAt}</span>}
          </button>
          <button
            onClick={() => setShowCode(!showCode)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 ${
              showCode
                ? 'bg-white/5 border-neutral-500/30 text-neutral-200'
                : 'bg-neutral-900 border-neutral-800 text-neutral-300'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Terraform</span>
          </button>
          <button
            onClick={() => setDeployOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-200 text-neutral-900 text-xs font-semibold shadow-md shadow-black/30 flex items-center space-x-1.5"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>Deploy</span>
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-rose-400 hover:border-rose-500/40"
            title="Clear canvas"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main canvas layout */}
      <div className="flex flex-1 min-h-0">
        <NodePalette onAdd={addNode} />

        <div className="flex-1 min-w-0 flex flex-col" ref={wrapperRef}>
          <div className="flex-1 min-h-0 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              fitView
              minZoom={0.2}
              defaultEdgeOptions={{
                animated: true,
                style: { stroke: '#6366f1', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
              }}
            >
              <Background color="#1e293b" gap={22} variant={BackgroundVariant.Dots} />
              <Controls className="!bg-neutral-900 !border-neutral-800 !rounded-xl [&>button]:!bg-neutral-900 [&>button]:!border-neutral-800 [&>button]:!fill-neutral-300" />
              <MiniMap
                pannable
                zoomable
                className="!bg-neutral-950 !border !border-neutral-800 !rounded-xl"
                nodeColor={() => '#6366f1'}
                maskColor="rgba(2, 6, 23, 0.75)"
              />
            </ReactFlow>

            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center space-y-3 max-w-sm pointer-events-auto">
                  <Network className="w-12 h-12 text-neutral-700 mx-auto" />
                  <h3 className="text-base font-bold text-neutral-300">Canvas is empty</h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Click a resource in the palette to place it. Connect nodes bottom-to-top to
                    define dependency order — Terraform code generates live as you design.
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-[10px] text-neutral-600 font-mono">
                    <Wand2 className="w-3 h-3" />
                    <span>design → terraform → deploy</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side: inspector + code panel */}
        <div className="w-96 shrink-0 hidden lg:flex flex-col border-l border-neutral-800/80 bg-neutral-950/50">
          <div className="flex-1 min-h-0">
            {selectedNode ? (
              <NodeInspector
                node={{
                  id: selectedNode.id,
                  kind: selectedNode.data.kind,
                  label: selectedNode.data.label,
                  provider: selectedNode.data.provider,
                  templateRef: selectedNode.data.templateRef,
                  config: selectedNode.data.config,
                }}
                schema={selectedTemplateSchema}
                loadingSchema={schemaLoading}
                onClose={() => setSelectedNodeId(null)}
                onChange={updateSelectedNode}
              />
            ) : (
              <TfCodePanel code={generated.fullFile} designName={designName} dirty={dirty} />
            )}
          </div>
        </div>
      </div>

      <DeployDialog
        open={deployOpen}
        onClose={() => setDeployOpen(false)}
        designName={designName}
        nodeCount={nodes.length}
        templateRef={nodes[0]?.data?.templateRef ?? null}
      />

      {/* Mobile fallback note */}
      <div className="lg:hidden px-4 py-2 bg-neutral-950/70 border-t border-neutral-800/80 text-[10px] text-neutral-500 text-center">
        Open on a larger screen to use the inspector and Terraform code panel.
      </div>
    </div>
  );
}

export default function DesignerPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center h-64 text-xs text-neutral-500">
          Loading designer workspace...
        </div>
      }
    >
      <ReactFlowProvider>
        <DesignerInner />
      </ReactFlowProvider>
    </React.Suspense>
  );
}
