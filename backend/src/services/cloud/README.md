# Cloud Account Management Subsystem

The Cloud Account Subsystem manages the onboarding, verification, and protected persistence of cloud provider credentials across **AWS**, **Azure**, and **GCP**, implementing the specifications in Section 5.2 and Section 8 of the architecture documents.

---

## AWS Credential Onboarding & Verification

```
Admin Request: POST /api/cloud-accounts (credentials: accessKeyId, secretAccessKey)
       │
       ▼
[1. Format & Integrity Verification]
       ├── Validates AWS Access Key format (/^(AKIA|ASIA)[A-Z0-9]{16}$/)
       └── Validates secret key length >= 16 characters
       │
       ▼
[2. AWS STS GetCallerIdentity (SigV4)]
       ├── Authenticates against sts.amazonaws.com using native SigV4
       └── Extracts verified 12-digit Account ID, User ARN, and User ID
       │
       ▼
[3. AES-256-GCM Encryption]
       ├── Encrypts credentials with 12-byte random IV + 16-byte auth tag
       └── Persists encrypted reference in PostgreSQL
       │
       ▼
[4. Audit Logging & Sanitized Response]
       ├── Emits CLOUD_ACCOUNT_ONBOARDED audit log event
       └── Returns masked account reference (e.g. "••••••••9012") with ZERO secret leakage
```

---

## Security Invariants Enforced
1. **Zero Secret Exposure**: Plaintext credentials and encrypted blobs are never included in API responses or written to standard logs.
2. **Pre-Flight Usability Verification**: AWS accounts are verified against AWS STS before being saved.
3. **Safe Deletion Protection**: An account cannot be deleted while bound to active project environments.
4. **RBAC Guard**: Cloud account onboarding and deletion strictly require `ADMIN` role.
