# Cross-Cloud Template Portability Layer

Phase 2, Sub-Phase 2.3 — the translation engine that lets one universal
infrastructure intent provision on AWS, Azure, or GCP.

## Components

### 1. Abstract Specification Framework (`portability.types.ts`)

Unified template archetypes (per plan 2.3.1):

| Archetype | Resource Layers | AWS Modules | Azure Modules | GCP Modules |
| :--- | :--- | :--- | :--- | :--- |
| `web-service-stack` | network → compute → database | `aws_vpc`, `aws_ec2_web`, `aws_rds_postgres` | `azure_vnet`, `azure_vm_web`, `azure_postgres_flexible` | `gcp_vpc`, `gcp_compute_web`, `gcp_cloud_sql_postgres` |
| `storage-backend` | network → storage | `aws_vpc`, `aws_s3_bucket` | `azure_vnet`, `azure_blob_storage` | `gcp_vpc`, `gcp_storage_bucket` |
| `secure-network` | network | `aws_vpc` | `azure_vnet` | `gcp_vpc` |

### 2. Cloud Translation Engine (`cloud.mapper.ts`)

Provider translation lookup per plan 2.3.2:

| Tier | AWS | Azure | GCP |
| :--- | :--- | :--- | :--- |
| `small` | `t3.micro` | `Standard_B1s` | `e2-micro` |
| `medium` | `t3.medium` | `Standard_B2s` | `e2-medium` |
| `large` | `t3.xlarge` | `Standard_B4ms` | `e2-standard-4` |

Regional mappings normalize universal regions across clouds:
`us-east-1` ↔ `eastus` ↔ `us-east1`, `europe-west` ↔ `westeurope` ↔ `europe-west1`, etc.

`cloudMapper.compareAcrossProviders(intent)` produces side-by-side plans for all
three clouds — the data source for the Phase 3 multi-cloud cost comparison tool.

### 3. Unified Resource Output Normalizer (`output.normalizer.ts`)

Normalizes heterogeneous provider outputs into common platform resource
descriptors (per plan 2.3.3):

- `compute_public_ip` (e.g. `54.210.10.1` / `20.101.5.22` / `34.73.200.10`)
- `database_endpoint` (RDS endpoint / Flexible Server FQDN / Cloud SQL IP)
- `storage_uri` (`s3` domain / blob endpoint / `gs://` URI)
- `network_id` (`vpc-*` / VNet resource ID / VPC self-link)

Provider-specific leftovers are preserved under `extras`.

## Usage

```ts
import { cloudMapper, outputNormalizer } from '../services/portability';

const plan = cloudMapper.mapIntent(
  { archetype: 'web-service-stack', tier: 'medium', region: 'us-east-1' },
  Provider.AZURE,
);
// -> { modules: ['azure_vnet', 'azure_vm_web', 'azure_postgres_flexible'], computeSku: 'Standard_B2s', region: 'eastus', ... }

const normalized = outputNormalizer.normalize({
  provider: Provider.GCP,
  outputs: { public_ip_address: '34.73.200.10', storage_uri: 'gs://my-bucket' },
});
// -> { compute_public_ip: '34.73.200.10', storage_uri: 'gs://my-bucket', extras: {} }
```
