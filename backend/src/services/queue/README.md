# Asynchronous Queue Subsystem (RabbitMQ)

The Asynchronous Queue Subsystem provides reliable, decoupled message brokering for long-running cloud infrastructure provisioning operations, implementing the architecture specified in Section 5.9 and Section 9 of Document 1 and Document 2.

---

## Topology Architecture

```
Control Plane API
       │
       ▼ (Publish with deliveryMode: 2)
[multicloud.deployments (Topic Exchange)]
       ├── routing: deployment.job.plan    ──> [multicloud.deployment_jobs (Queue)]
       ├── routing: deployment.job.apply   ──> [multicloud.deployment_jobs (Queue)]
       ├── routing: deployment.job.destroy ──> [multicloud.deployment_jobs (Queue)]
       │                                           │
       │                                           │ prefetch: 1 (Fair Dispatch)
       │                                           ▼
       │                                    Terraform Worker
       │                                           │
       │                                           │ Emits Events
       │                                           ▼
       ├── routing: deployment.event.*    ──> [multicloud.deployment_events (Queue)]
       │
[multicloud.deployments.dlx (DLX Exchange)]
       └── routing: #                     ──> [multicloud.deployment_jobs.dlq (Dead Letter Queue)]
```

---

## Key Reliability Invariants

1. **Decoupled API Responsiveness**: HTTP endpoints never execute synchronous Terraform commands. Requests transition state to `QUEUED` and dispatch a job to RabbitMQ within milliseconds.
2. **Durable Messaging**: All queues and exchanges are created with `durable: true`. Job messages are published with `persistent: true` (`deliveryMode: 2`), ensuring zero job loss during broker restarts.
3. **Worker Fair Dispatching**: Worker channels enforce `prefetch(1)`, guaranteeing that each worker process handles strictly one active infrastructure operation at a time.
4. **Explicit Acknowledgement**: Jobs must be explicitly acknowledged (`ack()`) only upon successful operation or fatal validation failure. In transient crashes, unacknowledged messages are requeued or routed to the Dead Letter Queue (`dlq`).
5. **Resilient Fallback Mode**: When running in offline or test environments without an active RabbitMQ broker, the subsystem switches to an in-memory event-driven queue fallback, ensuring development continuity.
