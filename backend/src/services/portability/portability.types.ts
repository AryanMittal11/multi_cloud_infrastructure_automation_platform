import { Provider } from '@prisma/client';

// ==========================================
// Universal Configuration Contract
// ==========================================

/** Normalized compute tier sizing, translated per provider by the mapping engine */
export type ComputeTier = 'small' | 'medium' | 'large';

/** Canonical universal region identifiers (normalized to AWS-style names) */
export type UniversalRegion =
  | 'us-east-1'
  | 'us-west-1'
  | 'us-central'
  | 'europe-west'
  | 'europe-north'
  | 'asia-southeast';

// ==========================================
// Provider SKU Translation Tables
// ==========================================

export interface ProviderSkuSet {
  compute: string;
  database: string;
}

/** Abstract compute tier -> provider SKU mapping (per implementation plan 2.3.2) */
export const COMPUTE_TIER_SKU_MAP: Record<Provider, Record<ComputeTier, ProviderSkuSet>> = {
  AWS: {
    small: { compute: 't3.micro', database: 'db.t3.micro' },
    medium: { compute: 't3.medium', database: 'db.t3.medium' },
    large: { compute: 't3.xlarge', database: 'db.r6g.large' },
  },
  AZURE: {
    small: { compute: 'Standard_B1s', database: 'B_Standard_B1ms' },
    medium: { compute: 'Standard_B2s', database: 'B_Standard_B2s' },
    large: { compute: 'Standard_B4ms', database: 'GP_Standard_D4ds_v4' },
  },
  GCP: {
    small: { compute: 'e2-micro', database: 'db-f1-micro' },
    medium: { compute: 'e2-medium', database: 'db-custom-2-7680' },
    large: { compute: 'e2-standard-4', database: 'db-custom-4-15360' },
  },
};

// ==========================================
// Regional Mapping Tables
// ==========================================

export interface RegionMappingEntry {
  AWS: string;
  AZURE: string;
  GCP: string;
}

/** Universal region -> provider-native region normalization (per implementation plan 2.3.2) */
export const REGION_MAP: Record<UniversalRegion, RegionMappingEntry> = {
  'us-east-1': { AWS: 'us-east-1', AZURE: 'eastus', GCP: 'us-east1' },
  'us-west-1': { AWS: 'us-west-2', AZURE: 'westus2', GCP: 'us-west1' },
  'us-central': { AWS: 'us-east-2', AZURE: 'centralus', GCP: 'us-central1' },
  'europe-west': { AWS: 'eu-west-1', AZURE: 'westeurope', GCP: 'europe-west1' },
  'europe-north': { AWS: 'eu-north-1', AZURE: 'northeurope', GCP: 'europe-north1' },
  'asia-southeast': { AWS: 'ap-southeast-1', AZURE: 'southeastasia', GCP: 'asia-southeast1' },
};

// ==========================================
// Archetype Framework (per implementation plan 2.3.1)
// ==========================================

/** Unified template archetypes supported by the portability layer */
export type TemplateArchetype = 'web-service-stack' | 'storage-backend' | 'secure-network';

export interface ArchetypeSpec {
  archetype: TemplateArchetype;
  description: string;
  /** Ordered resource layer stack instantiated per provider */
  resourceLayers: string[];
  /** Provider module directory names for each provider */
  moduleMap: Record<Provider, string[]>;
}

export const ARCHETYPE_SPECS: Record<TemplateArchetype, ArchetypeSpec> = {
  'web-service-stack': {
    archetype: 'web-service-stack',
    description:
      'Public-facing web application: network foundation, public compute endpoint, and optional managed database tier',
    resourceLayers: ['network', 'compute', 'database'],
    moduleMap: {
      AWS: ['aws_vpc', 'aws_ec2_web', 'aws_rds_postgres'],
      AZURE: ['azure_vnet', 'azure_vm_web', 'azure_postgres_flexible'],
      GCP: ['gcp_vpc', 'gcp_compute_web', 'gcp_cloud_sql_postgres'],
    },
  },
  'storage-backend': {
    archetype: 'storage-backend',
    description: 'Object storage backend: network foundation plus secure encrypted object storage',
    resourceLayers: ['network', 'storage'],
    moduleMap: {
      AWS: ['aws_vpc', 'aws_s3_bucket'],
      AZURE: ['azure_vnet', 'azure_blob_storage'],
      GCP: ['gcp_vpc', 'gcp_storage_bucket'],
    },
  },
  'secure-network': {
    archetype: 'secure-network',
    description: 'Isolated network foundation with public/private subnet segmentation and guarded egress',
    resourceLayers: ['network'],
    moduleMap: {
      AWS: ['aws_vpc'],
      AZURE: ['azure_vnet'],
      GCP: ['gcp_vpc'],
    },
  },
};

// ==========================================
// Unified Output Normalizer Contract (per implementation plan 2.3.3)
// ==========================================

export type NormalizedOutputKey =
  | 'compute_public_ip'
  | 'database_endpoint'
  | 'storage_uri'
  | 'network_id';

export interface NormalizedResourceDescriptor {
  key: NormalizedOutputKey;
  provider: Provider;
  providerResourceId: string | null;
  value: any;
}

export interface NormalizedOutputSet {
  compute_public_ip?: string;
  database_endpoint?: string;
  storage_uri?: string;
  network_id?: string;
  /** Additional provider-specific passthrough values */
  extras: Record<string, any>;
}

/** Terraform output key synonyms per normalized descriptor, in resolution priority order */
export const OUTPUT_KEY_SYNONYMS: Record<NormalizedOutputKey, string[]> = {
  compute_public_ip: ['public_ip_address', 'public_ip', 'ip_address', 'public_ip_address_value'],
  database_endpoint: ['database_endpoint', 'fqdn', 'endpoint', 'db_instance_endpoint', 'private_ip_address'],
  storage_uri: ['storage_uri', 'bucket_url', 'bucket_domain_name', 'primary_blob_endpoint', 'bucket_url_2'],
  network_id: ['network_id', 'vpc_id', 'vnet_id', 'vpc_name', 'network_self_link'],
};
