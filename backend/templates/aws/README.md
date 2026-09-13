# Canonical AWS Infrastructure Templates

This directory contains the production-grade, approved Terraform templates for Amazon Web Services (AWS), implementing the catalog requirements from Section 5.4 and Section 8 of the architecture documents.

---

## Template Catalog

| Template | Module Path | Purpose | Key Security Invariants |
| :--- | :--- | :--- | :--- |
| **AWS Modular VPC** | `aws_vpc/` | Multi-AZ VPC with public/private subnets, IGW, and optional NAT | Explicit subnet isolation, DNS hostnames enabled. |
| **AWS EC2 Web Server** | `aws_ec2_web/` | Scalable Linux instance running Nginx with Elastic IP | Encrypted EBS root volume (`gp3`), closed SSH by default. |
| **AWS RDS PostgreSQL** | `aws_rds_postgres/` | Managed PostgreSQL database instance | `storage_encrypted = true`, non-public endpoint, automated passwords. |
| **AWS S3 Secure Storage** | `aws_s3_bucket/` | High-availability cloud object storage bucket | Complete public access block, default AES-256 SSE encryption. |

---

## Structure per Template

Each template conforms to the standard platform contract:
```
template_name/
├── main.tf        # Cloud resource definitions & provider blocks
├── variables.tf   # Typed input parameters with sensible defaults
├── outputs.tf     # Exported attributes (IPs, ARNs, endpoints, IDs)
└── schema.json    # JSONSchema specification consumed by UI/API catalog
```

---

## Usage in Platform Deployments

When a deployment is initiated:
1. The platform validates user-supplied parameters against `schema.json`.
2. The orchestrator instantiates the module in an ephemeral worker workspace.
3. Outputs are captured upon successful apply and recorded in the `Resource` table for topology and dependency mapping.
