# AUTH_SERVICE_FIX

## Overview

The auth-service (FastAPI + asyncpg) is responsible for registration, login, JWT
issuance and token introspection for the entire DAARION stack. A 500 error was
triggered because the configured Postgres database (`postgresql://.../daarion`)
did not exist on NODE1, so every `/api/auth/login` call failed with
`asyncpg.exceptions.InvalidCatalogNameError`. The fix introduced:

- creation of the `daarion` database inside `dagi-postgres`;
- execution of migration `011_create_auth_tables.sql` to provision the schema;
- addition of admin/test accounts via `/api/auth/register`;
- resilient configuration that supports both `AUTH_*` and legacy env names;
- smoke-tested register/login/refresh/me flows.

## Environment variables

| Name(s) | Purpose |
| --- | --- |
| `AUTH_DATABASE_URL` / `DATABASE_URL` | Postgres DSN (`postgresql://postgres:postgres@dagi-postgres:5432/daarion`) |
| `AUTH_JWT_SECRET` / `JWT_SECRET` | HMAC secret for both access & refresh tokens |
| `AUTH_JWT_ALGORITHM` / `JWT_ALGO` / `JWT_ALGORITHM` | JWT signing algorithm (`HS256`) |
| `AUTH_ACCESS_TOKEN_TTL` / `ACCESS_TOKEN_TTL` | Access token lifetime in seconds (default 1800) |
| `AUTH_REFRESH_TOKEN_TTL` / `REFRESH_TOKEN_TTL` | Refresh token lifetime in seconds (default 604800) |
| `AUTH_PORT` / `PORT` | Service port (default `7020`) |
| `AUTH_DEBUG` / `DEBUG` | Toggle FastAPI reload/logging |
| `AUTH_BCRYPT_ROUNDS` / `BCRYPT_ROUNDS` | Cost factor for password hashing |
| `SYNAPSE_ADMIN_URL` | Matrix admin endpoint (defaults to `http://daarion-synapse:8008`) |
| `SYNAPSE_REGISTRATION_SECRET` | Shared secret for Matrix auto-provisioning |

⚠️  The config module now checks both `AUTH_*` and legacy names so existing
docker-compose files continue to work.

## Database schema (minimal)

`migrations/011_create_auth_tables.sql` must be applied to the `daarion`
database. Core tables:

- `auth_users` — user profile + status flags (`is_active`, `is_admin`).
- `auth_roles` + `auth_user_roles` — role definitions/mapping (default roles
  inserted by migration).
- `auth_sessions` — refresh-token sessions (with `expires_at` & `revoked_at`).

Commands executed on NODE1:

```bash
docker exec dagi-postgres psql -U postgres -c "CREATE DATABASE daarion;"
docker cp migrations/011_create_auth_tables.sql dagi-postgres:/tmp/011.sql
docker exec dagi-postgres psql -U postgres -d daarion -f /tmp/011.sql
```

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/healthz` | Returns `{ "status": "ok" }` when DB + settings are valid |
| `POST` | `/api/auth/register` | Creates a user, hashes password, provisions Matrix user (`matrix_user_id` in response) |
| `POST` | `/api/auth/login` | Issues `access_token`, `refresh_token`, returns user payload + roles |
| `POST` | `/api/auth/refresh` | Validates refresh token/session and rotates tokens |
| `POST` | `/api/auth/logout` | Revokes refresh token/session |
| `GET` | `/api/auth/me` | Reads user profile using `Authorization: Bearer <access_token>` |
| `POST` | `/api/auth/introspect` | Validates any access token (for internal services) |

## JWT token

```json
{
  "sub": "e4ea9638-a845-49b8-bd84-41deb3971ee0",
  "email": "admin@daarion.space",
  "name": "Admin",
  "roles": ["user", "admin"],
  "type": "access",
  "iss": "daarion-auth",
  "exp": 1764244050
}
```

Gateway & frontend:

- Pass `Authorization: Bearer <access_token>` to protected endpoints.
- Extract `sub` as `user_id`, `roles` for RBAC, and (optionally) fetch
  `matrix_user_id` from `/api/auth/register` response or the user profile.

## Smoke test flow

1. **Register:**  
   `curl -X POST http://<auth-host>:7020/api/auth/register -d '{"email":"user@daarion.space","password":"Password123!","display_name":"User"}'`
2. **Login:**  
   `curl -X POST http://<auth-host>:7020/api/auth/login -d '{"email":"user@daarion.space","password":"Password123!"}'`
3. **Authorize requests:**  
   `curl http://<auth-host>:7020/api/auth/me -H "Authorization: Bearer <access_token>"`
4. **Matrix heartbeat:**  
   After login in the web UI, `usePresenceHeartbeat` calls
   `/api/internal/matrix/presence/online` with the issued token, and
   `matrix-presence-aggregator` sees non-zero online counts.

With these fixes the auth-service is stable, compatible with matrix-gateway, and
ready for the next milestone (2D City Map + Agent Presence).


