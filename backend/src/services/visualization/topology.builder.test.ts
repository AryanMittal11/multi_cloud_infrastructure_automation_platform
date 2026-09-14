import { buildTopologyGraph, classifyTopologyKind } from './topology.builder';
import { Provider } from '@prisma/client';

const base = {
  name: null as string | null,
  status: 'ACTIVE',
  provider: 'AWS' as Provider,
  providerResourceId: null as string | null,
  deploymentId: 'dep-1',
  dependencies: [] as unknown,
};

describe('topology.builder (dependency visualization)', () => {
  it('classifies provider-specific resource types into display kinds', () => {
    expect(classifyTopologyKind('aws_instance')).toBe('compute');
    expect(classifyTopologyKind('aws_vpc')).toBe('network');
    expect(classifyTopologyKind('aws_db_instance')).toBe('database');
    expect(classifyTopologyKind('azurerm_kubernetes_cluster')).toBe('cluster');
    expect(classifyTopologyKind('google_storage_bucket')).toBe('storage');
    expect(classifyTopologyKind('aws_lb')).toBe('loadbalancer');
  });

  it('uses declared dependencies as edges when recorded', () => {
    const graph = buildTopologyGraph([
      { id: 'vpc', resourceType: 'aws_vpc', ...base, dependencies: [] },
      { id: 'web', resourceType: 'aws_instance', ...base, dependencies: ['vpc'] },
    ]);

    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toMatchObject({ source: 'vpc', target: 'web', kind: 'declared' });
    expect(graph.unlinkedCount).toBe(0); // both endpoints are connected by the declared edge
  });

  it('adds one conservative inferred edge per orphaned node', () => {
    const graph = buildTopologyGraph([
      { id: 'vpc', resourceType: 'aws_vpc', ...base, dependencies: [] },
      { id: 'web', resourceType: 'aws_instance', ...base, dependencies: [] },
      { id: 'db', resourceType: 'aws_db_instance', ...base, dependencies: [] },
    ]);

    const declared = graph.edges.filter((e) => e.kind === 'declared');
    const inferred = graph.edges.filter((e) => e.kind === 'inferred');
    expect(declared).toHaveLength(0);
    // web and db are orphans; vpc links to web (first lower-ranked candidate),
    // then web links to db.
    expect(inferred.length).toBeGreaterThanOrEqual(2);
    expect(graph.nodes.every((n) => graph.edges.some((e) => e.source === n.id || e.target === n.id))).toBe(true);
  });

  it('never infers cross-provider edges', () => {
    const graph = buildTopologyGraph([
      { id: 'vpc', resourceType: 'aws_vpc', ...base, dependencies: [], provider: 'AWS' as Provider },
      { id: 'vm', resourceType: 'azurerm_linux_virtual_machine', ...base, dependencies: [], provider: 'AZURE' as Provider },
    ]);

    expect(graph.edges).toHaveLength(0);
    expect(graph.unlinkedCount).toBe(2);
  });
});
