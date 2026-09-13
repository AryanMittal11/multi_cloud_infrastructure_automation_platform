# Azure Terraform Templates

Canonical reusable Terraform modules for Microsoft Azure, ingested into the platform
template catalog by `TemplateService.syncTemplatesFromDisk()` (provider `AZURE`).

## Modules

| Module | Purpose | Security Invariants |
| :--- | :--- | :--- |
| `azure_vnet` | Resource Group, Virtual Network, public/private subnets, NSG, route table | Deny-by-default NSG (`DenyAllInbound` at priority 4096); guarded SSH via `allowed_ssh_cidr` |
| `azure_vm_web` | Ubuntu Linux VM with Nginx (cloud-init), static public IP, NIC/NSG association | SSH public key auth only; guarded SSH ingress; Premium_LRS OS disk |
| `azure_postgres_flexible` | Azure Database for PostgreSQL Flexible Server, private DNS zone, firewall rule | Public network access disabled; password auto-generation via `random_password`; private DNS resolution |
| `azure_blob_storage` | StorageV2 account with blob container, versioning lifecycle policy | `allow_nested_items_to_be_public = false`; infrastructure double-encryption; TLS 1.2 minimum; shared key auth off by default; private container |

## Chain Deployment Order

Azure modules compose via outputs:

1. `azure_vnet` produces `resource_group_name`, `public_subnet_id`, `private_subnet_id`, `vnet_id`
2. `azure_vm_web` consumes `resource_group_name` + `subnet_id`
3. `azure_postgres_flexible` consumes `resource_group_name` + `vnet_id`
4. `azure_blob_storage` consumes `resource_group_name`

## Credential Injection

Azure provider authentication is never written to HCL. The worker injects the
decrypted Service Principal as `ARM_CLIENT_ID`, `ARM_CLIENT_SECRET`,
`ARM_TENANT_ID`, and `ARM_SUBSCRIPTION_ID` environment variables at execution time.
