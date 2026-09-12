# Middleware & Authorization Subsystem

This directory contains the central request processing pipeline, authorization gates, and safety guards for the **Multi-Cloud Infrastructure Automation Platform**, implementing the rules defined in Section 5.1, Section 5.17, and Section 10 of Document 2.

---

## Authorization & Guard Pipeline

```
Incoming Request
       │
       ▼
[1. authenticateToken] ──────> 401 Unauthorized (Invalid / Missing Bearer JWT)
       │ (attaches req.user: { userId, email, role })
       ▼
[2. requireRole / RBAC] ─────> 403 Forbidden (Insufficient role permissions)
       │
       ▼
[3. requireDestructivePermission] (For operations like teardown / destroy)
       ├──> 403 Forbidden (User is not ADMIN)
       └──> 400 Bad Request (Missing explicit 'CONFIRM_DESTROY' confirmation)
       │
       ▼
[4. validateBody] ────────────> 400 Validation Error (Invalid schema payload)
       │
       ▼
[Controller Handler]
```

---

## Role Matrix & Privileges

| Operation Category | Action Example | Allowed Roles |
| :--- | :--- | :--- |
| **System Administration** | Onboard cloud accounts, manage user roles | `ADMIN` |
| **Destructive Actions** | Destroy environments, teardown cloud clusters | `ADMIN` (with explicit confirmation) |
| **Provisioning** | Create project, generate plan, execute apply | `ADMIN`, `DEVELOPER` |
| **Visibility & Audit** | View deployments, inspect resources, view audit logs | `ADMIN`, `DEVELOPER`, `VIEWER` |

---

## Usage Examples

### 1. Enforcing Developer or Higher Role
```typescript
import { authenticateToken, requireDeveloper } from '../middleware';

router.post('/projects', authenticateToken, requireDeveloper, projectController.create);
```

### 2. Enforcing Admin Role on Privileged Actions
```typescript
import { authenticateToken, requireAdmin } from '../middleware';

router.post('/cloud-accounts', authenticateToken, requireAdmin, cloudController.create);
```

### 3. Guarding Destructive Infrastructure Teardown
```typescript
import { authenticateToken, requireDestructivePermission } from '../middleware';

router.post(
  '/deployments/:id/destroy',
  authenticateToken,
  requireDestructivePermission({ expectedKeyword: 'CONFIRM_DESTROY' }),
  deploymentController.destroy,
);
```

---

## Invariants Enforced
1. **Backend Authorization is Authoritative**: Frontend permissions are for user experience only; all endpoints strictly enforce backend guards.
2. **Confirmed Safe Destruction**: Direct, accidental, or automated single-click teardowns are prevented via the mandatory explicit confirmation guard.
