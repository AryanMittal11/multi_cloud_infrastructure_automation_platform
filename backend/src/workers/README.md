# Terraform Provisioning Worker Subsystem

The Terraform Worker Subsystem is an isolated execution engine that consumes deployment jobs from RabbitMQ and runs infrastructure orchestration tasks (`PLAN`, `APPLY`, `DESTROY`), implementing Section 5.9, Section 9, and Section 15 of the architecture documents.

---

## Worker Execution Lifecycle

```
RabbitMQ (multicloud.deployment_jobs)
       │
       ▼ (prefetch: 1)
[1. Job Ingestion & Record Lookup]
       ├── Authoritative deployment record retrieved from PostgreSQL
       └── Abort if deployment does not exist
       │
       ▼
[2. Concurrency Lock Acquisition]
       ├── deploymentLockManager.acquireLock(projectId, environmentId)
       └── Rejects conflicting simultaneous operations (409 Conflict)
       │
       ▼
[3. Transition State: RUNNING]
       ├── Emits STARTED event to deployment_events queue
       └── Updates status in PostgreSQL
       │
       ▼
[4. Credential Resolution & Workspace Isolation]
       ├── cloudService.getDecryptedCredentials(cloudAccountId)
       ├── Injects credentials into process environment (AWS_ACCESS_KEY_ID, etc.)
       └── Prepares ephemeral directory: ./terraform_workspaces/<deploymentId>/
       │
       ▼
[5. Subprocess Execution & Stream Capture]
       ├── Runs: terraform init -> terraform (plan | apply | destroy)
       ├── Sanitizes output stream via sanitizeLogs()
       └── Emits real-time LOG_CHUNK events to deployment_events queue
       │
       ▼
[6. State Parsing & Inventory Recording]
       ├── Parses terraform.tfstate via stateParser
       └── Records provisioned assets into the PostgreSQL "Resource" table
       │
       ▼
[7. Completion & Cleanup]
       ├── Transitions status to SUCCEEDED or FAILED
       ├── Writes immutable audit log
       ├── Releases concurrency lock
       └── Explicitly acknowledges RabbitMQ message (ack())
```

---

## Security & Reliability Invariants Enforced

1. **Process Isolation**: Terraform CLI commands execute exclusively inside worker child processes; they are never run inside API request threads.
2. **Ephemeral Workspaces**: Each deployment runs in an isolated workspace (`./terraform_workspaces/<deploymentId>/`).
3. **Stream Sanitization**: All stdout/stderr lines are sanitized to ensure cloud secrets (access keys, private keys, bearer tokens) are redacted before being persisted or streamed.
4. **Environment Concurrency Locking**: Only one operation can run on a given `(Project, Environment)` tuple at a time.
5. **Authoritative State Synchronization**: Resources, provider IDs, outputs, and dependencies are parsed directly from the resulting state file into PostgreSQL.
