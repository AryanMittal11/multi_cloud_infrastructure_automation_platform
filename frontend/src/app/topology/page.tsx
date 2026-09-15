'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Edge,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Waypoints } from 'lucide-react';
import { api, TopologyGraph, TopologyNodeKind } from '../../lib/api';
import { useAuth } from '../../context/auth-context';
import { PageHeader } from '../../components/cerebro/app-shell';
import { Panel, EmptyState, Skeleton } from '../../components/cerebro/ui-kit';

/* greyscale ramp — kind is encoded by position in the legend, not hue */
const KIND_COLOR: Record<TopologyNodeKind, string> = {
  network: '#fafafa',
  compute: '#d4d4d4',
  database: '#a3a3a3',
  storage: '#737373',
  loadbalancer: '#525252',
  cluster: '#8b8b8b',
  other: '#404040',
};

const KIND_LABEL: Record<TopologyNodeKind, string> = {
  network: 'Network',
  compute: 'Compute',
  database: 'Database',
  storage: 'Storage',
  loadbalancer: 'Load balancer',
  cluster: 'Cluster',
  other: 'Other',
};

export default function TopologyPage() {
  const { user } = useAuth();
  const [projectFilter, setProjectFilter] = useState('');
  const [selected, setSelected] = useState<TopologyGraph['nodes'][number] | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['topology', projectFilter],
    queryFn: () => api.topology.get(projectFilter || undefined),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
    enabled: !!user,
  });

  const graph = data?.graph;

  const { nodes: rfNodes, edges: rfEdges, onNodesChange, onEdgesChange } = useMemo(() => {
    if (!graph) return { nodes: [] as Node[], edges: [] as Edge[], onNodesChange: undefined, onEdgesChange: undefined };

    // deterministic layered layout: group by kind rank, position within rank
    const rankOrder: TopologyNodeKind[] = ['loadbalancer', 'network', 'cluster', 'compute', 'database', 'storage', 'other'];
    const byKind = new Map<TopologyNodeKind, typeof graph.nodes>();
    for (const n of graph.nodes) {
      if (!byKind.has(n.kind)) byKind.set(n.kind, []);
      byKind.get(n.kind)!.push(n);
    }

    const nodes: Node[] = [];
    let x = 0;
    for (const kind of rankOrder) {
      const group = byKind.get(kind) ?? [];
      group.forEach((n, i) => {
        nodes.push({
          id: n.id,
          position: { x: x + i * 190, y: rankOrder.indexOf(kind) * 130 },
          data: {
            label: (
              <div className="text-left">
                <p className="text-[12px] font-semibold leading-tight">{n.label}</p>
                <p className="mono text-[9.5px] opacity-70">{n.resourceType}</p>
              </div>
            ),
          },
          style: {
            background: 'var(--bg-elevated)',
            border: `1.5px solid ${KIND_COLOR[n.kind]}`,
            borderRadius: 10,
            color: 'var(--ink)',
            padding: '8px 12px',
            minWidth: 150,
            fontSize: 12,
          },
        });
      });
      if (group.length) x += Math.max(group.length, 1) * 190 + 120;
    }

    const edges: Edge[] = graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: false,
      style: {
        stroke: e.kind === 'declared' ? 'var(--accent-strong)' : 'var(--ink-faint)',
        strokeDasharray: e.kind === 'inferred' ? '5 4' : undefined,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: e.kind === 'declared' ? 'var(--accent-strong)' : 'var(--ink-faint)' },
    }));

    return { nodes, edges, onNodesChange: undefined, onEdgesChange: undefined };
  }, [graph]);

  const [nodes, setNodes, onNodesChangeState] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChangeState] = useEdgesState(rfEdges);

  useEffect(() => {
    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [rfNodes, rfEdges, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const found = graph?.nodes.find((n) => n.id === node.id) ?? null;
      setSelected(found);
    },
    [graph]
  );

  if (!user) {
    return (
      <div>
        <PageHeader title="Topology" sub="Sign in to view the infrastructure dependency graph." />
        <Panel>
          <EmptyState
            icon={<Waypoints size={22} />}
            title="Authentication required"
            body="Connect an operator persona from the Projects page to view resource relationships."
          />
        </Panel>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Topology"
        sub="How your provisioned resources connect — declared dependencies from apply state, conservative inference for the rest"
        actions={
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="h-[32px] px-2.5 rounded-[var(--r-sm)] text-xs"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
            aria-label="Filter by project"
          >
            <option value="">All projects</option>
            {(projectsData?.projects ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        }
      />

      {/* legend */}
      <div className="flex items-center gap-2 flex-wrap mb-3 text-[11px]" style={{ color: 'var(--ink-muted)' }}>
        {Object.entries(KIND_LABEL).map(([kind, label]) => (
          <span key={kind} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: KIND_COLOR[kind as TopologyNodeKind] }} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 ml-3">
          <svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="var(--accent-strong)" strokeWidth="1.5" /></svg>
          declared
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="var(--ink-faint)" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
          inferred
        </span>
      </div>

      <Panel bodyClass="">
        {isLoading ? (
          <div className="p-4"><Skeleton className="h-[460px]" /></div>
        ) : !graph || graph.nodes.length === 0 ? (
          <EmptyState
            icon={<Waypoints size={22} />}
            title="No topology yet"
            body="Apply a deployment and its recorded resources (and their dependencies) render here as a live graph."
            action={<a href="/deployments/wizard" className="btn-primary">Run a deployment</a>}
          />
        ) : (
          <div style={{ height: 480 }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChangeState}
              onEdgesChange={onEdgesChangeState}
              onNodeClick={onNodeClick}
              fitView
              proOptions={{ hideAttribution: true }}
              nodesDraggable
              nodesConnectable={false}
              minZoom={0.4}
            >
              <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="var(--border)" />
              <Controls showInteractive={false} />
              <MiniMap
                pannable
                zoomable
                maskColor="color-mix(in srgb, var(--bg) 70%, transparent)"
                nodeColor={(n) => KIND_COLOR[(graph.nodes.find((g) => g.id === n.id)?.kind) ?? 'other']}
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }}
              />
            </ReactFlow>
          </div>
        )}
      </Panel>

      {/* selected resource detail */}
      {selected && (
        <Panel className="mt-4" title={selected.label} subtitle={`${KIND_LABEL[selected.kind]} · ${selected.provider}`}>
          <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <p style={{ color: 'var(--ink-muted)' }}>Terraform type</p>
              <p className="mono" style={{ color: 'var(--ink)' }}>{selected.resourceType}</p>
            </div>
            <div>
              <p style={{ color: 'var(--ink-muted)' }}>Provider ID</p>
              <p className="mono truncate" style={{ color: 'var(--ink)' }}>{selected.providerResourceId ?? '—'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--ink-muted)' }}>Status</p>
              <p style={{ color: 'var(--ink)' }}>{selected.status}</p>
            </div>
            <div>
              <p style={{ color: 'var(--ink-muted)' }}>Deployment</p>
              <a href={`/deployments/${selected.deploymentId}`} className="chip">open run</a>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
