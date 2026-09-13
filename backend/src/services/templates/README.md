# Template Catalog & Dynamic Validation Subsystem

The Template Catalog Subsystem ingests, indexes, and provides dynamic parameter validation for reusable infrastructure modules across supported cloud providers, implementing Section 5.4 and Section 5.6 of the architecture documents.

---

## Dynamic JSONSchema Validation Flow

```
Developer Configuration Payload
       │
       ▼
POST /api/templates/:id/validate { configuration: { ... } }
       │
       ▼
[1. Template Lookup] ─────────> 404 Not Found (if template ID is invalid)
       │
       ▼
[2. JSONSchema Validator]
       ├── Required Fields Check (schema.required)
       ├── Type Assertions (string, number, boolean, array, object)
       ├── Enum Allowlist Validation (schema.properties[k].enum)
       ├── Regex Pattern Matching (schema.properties[k].pattern)
       ├── Numeric Boundary Enforcement (minimum, maximum)
       └── Default Value Injection (for omitted optional properties)
       │
       ├── Validation Failed ──> 400 Bad Request { valid: false, errors: [...] }
       │
       ▼
200 OK { valid: true, sanitizedConfiguration: { ...withDefaults } }
```

---

## REST API Endpoints

| Method | Endpoint | Required Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/templates` | `VIEWER` | Lists all active infrastructure templates. Supports `?provider=AWS` filtering. |
| `GET` | `/api/templates/:id` | `VIEWER` | Retrieves complete template metadata and full `inputSchema` for form rendering. |
| `POST` | `/api/templates/:id/validate` | `VIEWER` | Validates proposed configuration values against template schema before deployment planning. |
| `POST` | `/api/templates/sync` | `ADMIN` | Scans disk directory (`templates/aws/`, etc.) and syncs template metadata into PostgreSQL. |

---

## Invariants Enforced
- **Allowlist & Schema Strictness**: Arbitrary or unvetted parameters are checked before reaching the planning worker.
- **Automated Default Injection**: Optional variables with defined defaults are normalized into the deployment payload.
- **Frontend Agnostic**: The frontend can render forms dynamically using the JSONSchema contract without hardcoding provider forms.
