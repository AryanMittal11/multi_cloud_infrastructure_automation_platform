/**
 * Infrastructure Dependency Visualization — PDF section 5.12 / differentiator D.
 *
 * Builds a topology graph from the recorded Resource inventory:
 *  - nodes = provisioned resources (kind-grouped for cross-cloud display)
 *  - edges = declared dependencies captured at apply time, plus conservative
 *    kind-level "inferred" relationships (network → compute → database)
 *    so the graph stays meaningful before rich dependency capture exists.
 *
 * The frontend renders this directly with React Flow.
 */

import { Provider } from '@prisma/client';

export type TopologyNodeKind = 'network' | 'compute' | 'database' | 'storage' | 'loadbalancer' | 'cluster' | 'other';

export interface TopologyNode {
  id: string;
  label: string;
  kind: TopologyNodeKind;
  provider: Provider;
  resourceType: string;
  status: string;
  providerResourceId: string | null;
  deploymentId: string;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  kind: 'declared' | 'inferred';
}

export interface TopologyGraph {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  unlinkedCount: number;
}

interface ResourceLike {
  id: string;
  resourceType: string;
  name: string | null;
  status: string;
  provider: Provider;
  providerResourceId: string | null;
  deploymentId: string;
  dependencies?: unknown;
}

/** Map a Terraform resource type to a display kind. Mirrors the cost classifier. */
export function classifyTopologyKind(resourceType: string): TopologyNodeKind {
  const t = resourceType.toLowerCase();
  if (/(eks|gke|aks|kubernetes)/.test(t)) return 'cluster';
  if (/(db|database|sql|rds|cloudsql|cosmos)/.test(t)) return 'database';
  if (/(s3|bucket|storage_account|object)/.test(t)) return 'storage';
  if (/(lb|load_balancer|loadbalancer|frontend_ip)/.test(t)) return 'loadbalancer';
  if (/(instance|virtual_machine|compute|web_app|vm)/.test(t)) return 'compute';
  if (/(vpc|vnet|virtual_network|subnet|network|nat|route|firewall|router)/.test(t)) return 'network';
  return 'other';
}

const KIND_RANK: Record<TopologyNodeKind, number> = {
  loadbalancer: 0,
  network: 1,
  cluster: 2,
  compute: 3,
  database: 4,
  storage: 5,
  other: 6,
};

/** Conservative kind-level inference: edges flow from lower rank to higher rank. */
function inferEdgeAllowed(from: TopologyNodeKind, to: TopologyNodeKind): boolean {
  return KIND_RANK[from] < KIND_RANK[to];
}

export function buildTopologyGraph(resources: ResourceLike[]): TopologyGraph {
  const nodes: TopologyNode[] = resources.map((r) => ({
    id: r.id,
    label: r.name ?? r.resourceType,
    kind: classifyTopologyKind(r.resourceType),
    provider: r.provider,
    resourceType: r.resourceType,
    status: r.status,
    providerResourceId: r.providerResourceId ?? null,
    deploymentId: r.deploymentId,
  }));

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = new Map<string, TopologyEdge>();

  // 1. Declared dependencies (captured at apply time from Terraform state).
  for (const r of resources) {
    const deps = Array.isArray(r.dependencies) ? (r.dependencies as unknown[]) : [];
    for (const dep of deps) {
      let targetId: string | null = null;
      if (typeof dep === 'string') {
        // dependency entries may be resource UUIDs or `type.name` references
        targetId = byId.has(dep) ? dep : byId.get(dep)?.id ?? null;
      } else if (dep && typeof dep === 'object' && 'id' in (dep as Record<string, unknown>)) {
        const id = String((dep as Record<string, unknown>).id);
        targetId = byId.has(id) ? id : null;
      }
      if (!targetId || targetId === r.id) continue;
      const key = `${targetId}->${r.id}`;
      if (!edges.has(key)) {
        edges.set(key, { id: key, source: targetId, target: r.id, kind: 'declared' });
      }
    }
  }

  // 2. Inferred fallback edges: connect nodes whose kind ordering implies a
  //    relationship (e.g. network → compute), only when no declared edge
  //    already touches the node, so inference stays conservative.
  const declaredTouch = new Set<string>();
  for (const e of edges.values()) {
    declaredTouch.add(e.source);
    declaredTouch.add(e.target);
  }
  for (const node of nodes) {
    if (declaredTouch.has(node.id)) continue;
    for (const candidate of nodes) {
      if (candidate.id === node.id) continue;
      if (candidate.provider !== node.provider) continue;
      if (inferEdgeAllowed(candidate.kind, node.kind)) {
        const key = `${candidate.id}->${node.id}`;
        edges.set(key, { id: key, source: candidate.id, target: node.id, kind: 'inferred' });
        break; // one conservative inferred edge per orphaned node
      }
    }
  }

  // A node is unlinked only if no edge touches it after both passes.
  const linked = new Set<string>();
  for (const e of edges.values()) {
    linked.add(e.source);
    linked.add(e.target);
  }
  const unlinkedCount = nodes.filter((n) => !linked.has(n.id)).length;

  return { nodes, edges: [...edges.values()], unlinkedCount };
}
