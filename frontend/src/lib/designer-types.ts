import { CloudProvider } from './provider-icon';

/**
 * Visual designer domain types.
 * A "design" is a canvas of resource nodes + dependency edges that maps onto
 * the platform's Terraform template catalog (templates/aws|azure|gcp/*).
 */

export type CanvasNodeKind =
  | 'network'
  | 'compute'
  | 'database'
  | 'storage'
  | 'kubernetes';

export interface CanvasNodeData {
  kind: CanvasNodeKind;
  label: string;
  provider: CloudProvider;
  /** Platform template reference (e.g. templates/aws/aws_ec2_web) */
  templateRef: string;
  /** JSONSchema-driven user configuration */
  config: Record<string, any>;
  /** Extra cost per month, resolved by the catalog pricing hints when available */
  monthlyCost?: number;
  notes?: string;
}

export interface CanvasNode {
  id: string;
  kind: CanvasNodeKind;
  position: { x: number; y: number };
  data: CanvasNodeData;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface ArchitectureDesign {
  id: string;
  name: string;
  description?: string | null;
  cloudProvider: CloudProvider | 'MULTI';
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DesignSummary {
  id: string;
  name: string;
  description?: string | null;
  cloudProvider: string;
  nodeCount: number;
  edgeCount: number;
  updatedAt?: string;
}

/** Terraform resource blocks produced by the generator, keyed by node id */
export interface GeneratedModule {
  nodeId: string;
  label: string;
  templateRef: string;
  terraform: string;
}

export interface GeneratedDesign {
  designName: string;
  modules: GeneratedModule[];
  tfvars: string;
  variables: string;
  fullFile: string;
}

export interface DesignFileAttachment {
  name: string;
  content: string;
}

/** Resource kind -> provider module mapping used by the code generator */
export const NODE_TEMPLATE_MAP: Record<CanvasNodeKind, Record<'AWS' | 'AZURE' | 'GCP', string>> = {
  network: {
    AWS: 'templates/aws/aws_vpc',
    AZURE: 'templates/azure/azure_vnet',
    GCP: 'templates/gcp/gcp_vpc',
  },
  compute: {
    AWS: 'templates/aws/aws_ec2_web',
    AZURE: 'templates/azure/azure_vm_web',
    GCP: 'templates/gcp/gcp_compute_web',
  },
  database: {
    AWS: 'templates/aws/aws_rds_postgres',
    AZURE: 'templates/azure/azure_postgres_flexible',
    GCP: 'templates/gcp/gcp_cloud_sql_postgres',
  },
  storage: {
    AWS: 'templates/aws/aws_s3_bucket',
    AZURE: 'templates/azure/azure_blob_storage',
    GCP: 'templates/gcp/gcp_storage_bucket',
  },
  kubernetes: {
    // Provisioned as a compute node with platform-managed clustering in Phase 3+
    AWS: 'templates/aws/aws_ec2_web',
    AZURE: 'templates/azure/azure_vm_web',
    GCP: 'templates/gcp/gcp_compute_web',
  },
};

export const KIND_META: Record<
  CanvasNodeKind,
  { label: string; color: string; accent: string; icon: string }
> = {
  network: {
    label: 'Network',
    color: 'text-sky-300',
    accent: 'border-sky-500/40 bg-sky-500/10',
    icon: 'network',
  },
  compute: {
    label: 'Compute',
    color: 'text-amber-300',
    accent: 'border-amber-500/40 bg-amber-500/10',
    icon: 'cpu',
  },
  database: {
    label: 'Database',
    color: 'text-indigo-300',
    accent: 'border-indigo-500/40 bg-indigo-500/10',
    icon: 'database',
  },
  storage: {
    label: 'Storage',
    color: 'text-emerald-300',
    accent: 'border-emerald-500/40 bg-emerald-500/10',
    icon: 'hard-drive',
  },
  kubernetes: {
    label: 'Kubernetes',
    color: 'text-violet-300',
    accent: 'border-violet-500/40 bg-violet-500/10',
    icon: 'ship',
  },
};
