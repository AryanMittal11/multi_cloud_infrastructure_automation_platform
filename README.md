# Multi-Cloud Infrastructure Automation Platform

A centralized control plane and orchestration platform for managing, planning, and safely provisioning cloud infrastructure across **AWS**, **Azure**, and **GCP** — with a cross-cloud template portability layer that maps one universal infrastructure intent onto any provider.

---

## Architecture Overview

```
Browser
  ↓ HTTPS
Next.js Frontend (App Router, Tailwind CSS, TanStack Query, React Flow)
  ↓ REST API
Express Backend (TypeScript, Node.js)
  ├── Auth / RBAC (Admin, Developer, Viewer)
  ├── Projects / Environments / Cloud Accounts
  ├── Templates / Cross-Cloud Mapping
  ├── Policy Safety Engine
  ├── Cost Estimation
  ├── Deployment Orchestration
  ├── State & Resource Tracking
  └── Audit & Notifications
   ├── PostgreSQL (via Prisma ORM)
   └── RabbitMQ (Asynchronous Task Broker)
        ↓
    Terraform Worker (Isolated execution workspaces)
        ↓
    AWS / Azure / GCP
```

---

## Canonical Lifecycle

$$\text{Request} \to \text{Validate} \to \text{Plan} \to \text{Cost/Policy Check} \to \text{Review} \to \text{Explicit Approval} \to \text{Queue} \to \text{Deploy} \to \text{Observe} \to \text{Manage} \to \text{Safely Destroy}$$

1. **Frontend Request**: User selects template, inputs variables, targets cloud account.
2. **Authoritative Backend Validation**: Input schema validated against template JSONSchema.
3. **Dry-Run Planning**: Terraform creates plan artifact without modifying cloud resources.
4. **Policy & Cost Verification**: Pre-deployment safety rules and monthly delta cost calculated.
5. **Explicit Approval Gate**: Authorized role signs off on deployment.
6. **Asynchronous Worker Execution**: RabbitMQ queues job $\to$ worker processes Terraform in an ephemeral workspace.
7. **Resource State & Topology**: Outputs and provider IDs saved to PostgreSQL for visual dependency mapping.
8. **Confirmed Safe Destruction**: Requires explicit re-confirmation dialog and high-privilege permission.

---

## Monorepo Layout

```
.
├── backend/                  # Express REST API & Control Plane
│   ├── src/
│   │   ├── app.ts            # App entry point
│   │   ├── config/           # Environment & zod validation
│   │   ├── middleware/       # Auth, RBAC & error handlers
│   │   ├── routes/           # REST endpoints
│   │   ├── controllers/      # Request handlers
│   │   ├── services/         # Domain business logic
│   │   │   └── portability/  # Cross-cloud mapper & output normalizer (Phase 2)
│   │   ├── workers/          # RabbitMQ Terraform workers
│   │   └── utils/            # Logger, crypto & helpers
│   ├── prisma/               # Prisma database schema & migrations
│   ├── templates/            # Provider-specific Terraform modules
│   │   ├── aws/              # AWS VPC, EC2, RDS, S3
│   │   ├── azure/            # Azure VNet, VM, PostgreSQL Flexible, Blob Storage
│   │   └── gcp/              # GCP VPC, GCE, Cloud SQL, GCS
│   └── package.json
├── frontend/                 # Next.js 14+ Web Application
│   ├── src/
│   │   ├── app/              # App router pages & layouts
│   │   ├── components/       # Reusable UI components & React Flow graphs
│   │   └── config/           # Client configuration
│   └── package.json
├── shared/                   # Shared TypeScript contracts, enums & zod schemas
│   ├── src/index.ts
│   └── package.json
├── package.json              # Root monorepo orchestration scripts
├── .prettierrc
└── .gitignore
```

---

## Quick Start

### 1. Prerequisites
- Node.js >= 18 (recommended >= 20)
- PostgreSQL database
- RabbitMQ broker
- Terraform CLI >= 1.5

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` in `backend/` and configure database connection and secrets:
```bash
cp backend/.env.example backend/.env
```

### 4. Run Development Servers
```bash
# Start backend API (http://localhost:4000)
npm run dev:backend

# Start Next.js frontend (http://localhost:3000)
npm run dev:frontend

# Start async provisioning worker
npm run dev:worker
```

---

## Cloud Provider Support Status

| Capability | AWS | Azure | GCP |
| :--- | :--- | :--- | :--- |
| Credential onboarding & live validation | ✅ STS `GetCallerIdentity` | ✅ ARM `Subscriptions - Get` | ✅ Resource Manager `projects.get` |
| Terraform modules (network / compute / database / storage) | ✅ | ✅ | ✅ |
| Worker credential injection | ✅ `AWS_*` env vars | ✅ `ARM_*` env vars | ✅ `GOOGLE_CREDENTIALS` |
| Cross-cloud portability (tier & region mapping) | ✅ | ✅ | ✅ |

### Azure Onboarding
Service Principal credentials: `clientId`, `clientSecret`, `tenantId`, `subscriptionId` — validated
against Azure AD (client credentials flow) and the Azure Resource Manager REST API before being
encrypted with AES-256-GCM.

### GCP Onboarding
Service Account credentials: `projectId`, `clientEmail`, `privateKey` — validated by signing a JWT
(RS256) exchanged for an OAuth2 token and calling the Cloud Resource Manager `projects.get` API
before being encrypted with AES-256-GCM.

### Cross-Cloud Portability
The `portability` service (`backend/src/services/portability/`) defines universal template
archetypes (`web-service-stack`, `storage-backend`, `secure-network`), translates abstract compute
tiers (`small`/`medium`/`large`) into provider SKUs, normalizes regions across clouds
(`us-east-1` ↔ `eastus` ↔ `us-east1`), and unifies provider outputs into common descriptors
(`compute_public_ip`, `database_endpoint`, `storage_uri`).
