# Project & Environment Management Subsystem

The Project & Environment Subsystem organizes cloud workloads into logical projects and scoped staging environments (`development`, `staging`, `production`), fulfilling Section 5.3 of the architecture documents.

---

## Architectural Model

```
Project (e.g. "Payment Gateway Service")
  ├── Environment: "development"  ──> Bound to AWS Sandbox Account
  ├── Environment: "staging"      ──> Bound to AWS Staging Account
  └── Environment: "production"   ──> Bound to AWS Production Account (Requires Admin Destructive Gate)
```

---

## REST API Endpoints

| Method | Endpoint | Required Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/projects` | `DEVELOPER` | Creates project and automatically provisions canonical environments (`dev`, `stage`, `prod`). |
| `GET` | `/api/projects` | `VIEWER` | Lists all projects with environment statuses and attached cloud accounts. |
| `GET` | `/api/projects/:id` | `VIEWER` | Retrieves detailed project metadata and deployment counts. |
| `PUT` | `/api/projects/:id` | `DEVELOPER` | Updates project name or description. |
| `DELETE` | `/api/projects/:id` | `ADMIN` (Confirmed) | Deletes project and environments (blocked if active deployments are running). |
| `POST` | `/api/projects/:id/environments` | `DEVELOPER` | Adds custom environment stage. |
| `PATCH` | `/api/projects/:id/environments/:envId/account` | `DEVELOPER` | Binds an approved cloud account to an environment. |

---

## Invariants Enforced
- **Deterministic Scoping**: Compound uniqueness constraint `@@unique([projectId, name])` guarantees unambiguous target paths for infrastructure operations.
- **Active Deployment Lock**: Projects with running or queued deployments cannot be deleted until workloads reach a terminal state.
