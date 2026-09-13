# GCP Terraform Templates

Canonical reusable Terraform modules for Google Cloud Platform, ingested into the platform
template catalog by `TemplateService.syncTemplatesFromDisk()` (provider `GCP`).

## Modules

| Module | Purpose | Security Invariants |
| :--- | :--- | :--- |
| `gcp_vpc` | Custom VPC, regional public/private subnetworks, Cloud Router + Cloud NAT, firewall rules | SSH firewall created only when `allowed_ssh_cidrs` is non-empty; VPC flow logs enabled |
| `gcp_compute_web` | Ubuntu Compute Engine instance with Nginx, reserved static IP | Shielded VM (secure boot, vTPM, integrity monitoring); guarded SSH; OS Login enabled |
| `gcp_cloud_sql_postgres` | Cloud SQL PostgreSQL with private IP, application database and user | `ssl_mode = ENCRYPTED_ONLY`; private IP via Service Networking peering; IAM authentication enabled; authorized networks empty by default |
| `gcp_storage_bucket` | Cloud Storage bucket with lifecycle tiering and soft-delete policy | `public_access_prevention = enforced`; `uniform_bucket_level_access = true`; optional customer-managed KMS key |

## Chain Deployment Order

GCP modules compose via outputs:

1. `gcp_vpc` produces `network_name`, `public_subnet_self_link`, `private_subnet_self_link`
2. `gcp_compute_web` consumes `network_name` + `subnet_self_link`
3. `gcp_cloud_sql_postgres` consumes `network_self_link`
4. `gcp_storage_bucket` is project-scoped (no network dependency)

## Credential Injection

GCP provider authentication is never written to HCL. The worker injects the
decrypted Service Account via the `GOOGLE_CREDENTIALS` environment variable
(plus `GOOGLE_PROJECT` for project resolution) at execution time. No credential
file is persisted inside the workspace.
