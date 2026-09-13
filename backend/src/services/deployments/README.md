# Concurrency & Deployment Lock Management Subsystem

The Deployment Lock Subsystem prevents conflicting concurrent infrastructure operations from colliding on the same environment, implementing the invariants in Section 5.9, Section 9, and Section 15 of Document 1 and Document 2.

---

## Concurrency Lifecycle & Safety

```
New Job Request
       │
       ▼
[acquireLock(projectId, environmentId, deploymentId)]
       ├── Check for active deployment on (projectId, environmentId) in QUEUED or RUNNING
       │
       ├── Case 1: No active lock ────────> Grant lock [lock-<deploymentId>-<ts>]
       │
       ├── Case 2: Active lock < 30m ─────> 409 Conflict: "Environment is locked"
       │
       └── Case 3: Active lock > 30m ─────> Stale Lock Detected!
                                            ├── Mark abandoned job as FAILED
                                            ├── Emit STALE_LOCK_AUTO_RECOVERED audit log
                                            └── Grant lock to new job
```

---

## REST API Endpoints

| Method | Endpoint | Required Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/deployments/locks/:environmentId` | `VIEWER` | Inspects current lock status, active deployment ID, and duration held. |
| `POST` | `/api/deployments/locks/:environmentId/force-release` | `ADMIN` (Confirmed) | Emergency administrator intervention to break deadlocks caused by host/worker failure. |

---

## Safety Invariants Enforced
1. **Single Active Operation Mutex**: No two operations may plan, apply, or destroy resources on the same environment simultaneously.
2. **Automated Deadlock Recovery**: Long-abandoned worker jobs are auto-recovered after 30 minutes without requiring manual database editing.
3. **Auditability**: Lock acquisitions, releases, auto-recoveries, and admin overrides are recorded in the PostgreSQL `AuditLog` table.
