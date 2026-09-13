# Authentication & Identity Subsystem

The Authentication Subsystem implements the secure identity layer for the **Multi-Cloud Infrastructure Automation Platform**, fulfilling the requirements from Section 5.1 and Section 10 of the architecture documents.

---

## Token Architecture & Refresh Rotation

```
Client (Web / CLI)                                     Control Plane API
       │                                                       │
       │─── 1. POST /api/auth/login { email, password } ──────>│
       │<── 2. 200 OK: { user, accessToken } ──────────────────│
       │       + Set-Cookie: multicloud_refresh_token          │
       │         (HttpOnly, Secure, SameSite)                  │
       │                                                       │
       │─── 3. GET /api/protected (Authorization: Bearer <JWT>)│
       │<── 4. 200 OK: Response Data ──────────────────────────│
       │                                                       │
       │─── 5. POST /api/auth/refresh (Cookie: refresh_token) ─>│
       │<── 6. 200 OK: { newAccessToken } ─────────────────────│
       │       + Set-Cookie: new_rotated_refresh_token         │
```

- **Short-Lived Access Token**: JWT signed with `JWT_SECRET`, default lifespan of 15 minutes. Carries `userId`, `email`, and `role`.
- **Rotated Refresh Token**: Stored in a strict `HttpOnly` secure cookie. Each `/api/auth/refresh` request invalidates the old token and issues a newly signed refresh token pair.

---

## REST API Endpoints

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | None | Registers a new user account with hashed password and returns initial token pair. |
| `POST` | `/api/auth/login` | None | Validates user credentials and issues tokens. |
| `POST` | `/api/auth/refresh` | None (Cookie/Body) | Validates refresh token and returns a newly rotated token pair. |
| `POST` | `/api/auth/logout` | None | Clears the `multicloud_refresh_token` HttpOnly cookie. |
| `GET` | `/api/auth/me` | Bearer Token | Returns the authenticated user profile. |

---

## Security Invariants Enforced
- **Zero Plaintext Passwords**: All passwords are one-way hashed using `bcrypt` with 10 salt rounds.
- **XSS Protection**: Refresh tokens are protected from browser JavaScript access via `HttpOnly`.
- **Payload Validation**: Registration and login payloads are strictly validated using `Zod` schemas before hitting the database.
- **Sanitized Outputs**: Passwords and secret hashes are never returned in responses or output logs.
