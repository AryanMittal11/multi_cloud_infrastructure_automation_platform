# Multi-Cloud Platform Database Architecture

The data layer uses **PostgreSQL** managed through **Prisma ORM**, strictly implementing the domain model and invariants specified in Section 7 & 8 of the Technical Architecture Document.

---

## Entity Relationship Overview

```
User (1) ──────────< Project (N) ──────────< Environment (N)
 │                      │                          │
 │ (1)                  │ (1)                      │ (1)
 ├──────< CloudAccount (N)                         │
 │                      │                          │
 │ (1)                  │ (1)                      │ (1)
 ├──────< Deployment (N)<──────────────────────────┘
 │          │
 │          ├──────< Resource (N)
 │          │
 │ (1)      │ (1)
 └──────< AuditLog (N)
```

---

## Core Models Specification

### 1. `User`
- **Purpose**: System identity and role-based access control (RBAC).
- **Roles**: `ADMIN` (full privileges, approvals, destructive operations), `DEVELOPER` (create projects, plan & deploy non-destructive), `VIEWER` (read-only visibility).
- **Security**: Passwords hashed using bcrypt/argon2; never stored in plaintext.

### 2. `CloudAccount`
- **Purpose**: Multi-cloud provider credentials and account references (`AWS`, `AZURE`, `GCP`).
- **Invariants**:
  - Encrypted at rest using AES-256-GCM (`encryptedCredentialReference`).
  - Secrets are never exposed in logs or user-facing API responses.

### 3. `Project` & `Environment`
- **Purpose**: Logical segregation of cloud infrastructure workloads.
- **Environments**: Canonical stages: `development`, `staging`, `production`.
- **Constraint**: `@@unique([projectId, name])` guarantees unambiguous scoping for deployments.

### 4. `Template`
- **Purpose**: Approved reusable infrastructure definitions (e.g., VPC, EC2 Web, RDS Postgres, Cross-Cloud Web Stack).
- **Schema Validation**: `inputSchema` stores a JSONSchema specification defining allowable parameters, types, and defaults.

### 5. `Deployment`
- **Purpose**: Authoritative record of every infrastructure modification lifecycle.
- **Lifecycle States**: `DRAFT` $\to$ `PLANNING` $\to$ `PLANNED` $\to$ `QUEUED` $\to$ `RUNNING` $\to$ `SUCCEEDED` / `FAILED` / `CANCELLED`.
- **Operations**: `CREATE`, `MODIFY`, `DESTROY`.
- **Locking**: `executionReference` locks the environment during execution to prevent concurrent conflicts.

### 6. `Resource`
- **Purpose**: Inventory of provisioned cloud assets tracked back to their deployment.
- **Details**: Provider native IDs (e.g. AWS ARN, Azure Resource URI), status, outputs (IPs, endpoints), and relationship edges for dependency graph visualization.

### 7. `AuditLog`
- **Purpose**: Immutable compliance trail capturing `WHO`, `WHAT`, `WHERE`, and `WHEN`.
- **Invariants**: Independent log persistence for all planning, approval, apply, and destructive actions.

### 8. `Notification`
- **Purpose**: Event-driven alerts across configurable channels (`EMAIL`, `SLACK`, `DISCORD`, `WEBHOOK`).

---

## Migration & Seeding Commands

```bash
# Generate Prisma Client
npm run prisma:generate

# Run development migrations
npm run prisma:migrate

# Seed canonical templates and initial admin user
npm run prisma:seed
```
