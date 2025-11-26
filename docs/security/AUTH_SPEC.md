# AUTH SPEC — DAARION.city
Version: 1.0.0

---

## 0. PURPOSE

Цей документ описує базову систему автентифікації та авторизації для DAARION.city:

- єдину модель користувача (`user_id`) для:
  - фронтенду (web/PWA),
  - Matrix/chat інтеграції,
  - MicroDAO governance,
  - Agents Service,
  - SecondMe.
- механізм логіну/логауту (JWT access + refresh tokens),
- базову RBAC (roles/permissions),
- інтеграцію з існуючими сервісами (agents, microdao, city, secondme).

Фокус цієї версії — **MVP-рівень**:

- Password-based login (email + password) + готовність до OAuth (Google/Telegram) як наступний крок.
- JWT токени (access + refresh).
- Мінімальний набір ролей (`user`, `admin`, `agent-system`).
- Захист основних API (governance, agents, secondme private).

---

## 1. ARCHITECTURE OVERVIEW

### 1.1. Auth Service

Окремий сервіс `auth-service` (порт: **7020**):

```text
[ Web / PWA / Matrix Gateway ]
          ↓
     [ Auth Service (7020) ]
          ↓
[ PostgreSQL (auth tables) + Redis (sessions cache) ]
          ↓
[ JWT токени для інших сервісів ]
```

Auth Service:

* реєструє користувачів,
* зберігає хеші паролів,
* видає JWT access/refresh токени,
* перевіряє токени (через shared secret / public key),
* надає API для інших сервісів (`/auth/introspect`).

### 1.2. Інші сервіси

* `Agents Service`, `MicroDAO Service`, `SecondMe`, `City Service`:
  * отримують JWT у `Authorization: Bearer <token>`,
  * валідують його (прямо або через Auth Service),
  * витягують `user_id`, `roles`, `scopes`.

---

## 2. DATA MODEL (PostgreSQL)

### 2.1. auth_users

```sql
CREATE TABLE auth_users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name  TEXT,
    avatar_url    TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
    locale        TEXT DEFAULT 'uk',
    timezone      TEXT DEFAULT 'Europe/Kyiv',
    meta          JSONB DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_auth_users_email ON auth_users(email);
```

### 2.2. auth_roles

```sql
CREATE TABLE auth_roles (
    id          TEXT PRIMARY KEY,  -- 'user' | 'admin' | 'agent-system'
    description TEXT
);

INSERT INTO auth_roles (id, description) VALUES
    ('user', 'Regular user'),
    ('admin', 'Administrator'),
    ('agent-system', 'System agent');
```

### 2.3. auth_user_roles

```sql
CREATE TABLE auth_user_roles (
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    role_id TEXT NOT NULL REFERENCES auth_roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);
```

### 2.4. auth_sessions

```sql
CREATE TABLE auth_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    user_agent  TEXT,
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    meta        JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX ix_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX ix_auth_sessions_expires ON auth_sessions(expires_at);
```

---

## 3. TOKEN MODEL (JWT)

### 3.1. Access token

* Формат: JWT (HS256).
* Термін дії: 30 хвилин.
* Payload:

```json
{
  "sub": "user_id-uuid",
  "email": "user@example.com",
  "name": "Display Name",
  "roles": ["user"],
  "iat": 1732590000,
  "exp": 1732591800,
  "iss": "daarion-auth",
  "type": "access"
}
```

### 3.2. Refresh token

* Формат: JWT (HS256).
* Термін дії: 7 днів.
* Payload:

```json
{
  "sub": "user_id-uuid",
  "session_id": "session-uuid",
  "iat": 1732590000,
  "exp": 1733194800,
  "iss": "daarion-auth",
  "type": "refresh"
}
```

---

## 4. HTTP API (PUBLIC)

Базовий шлях: `/api/auth/...`.

### 4.1. `POST /api/auth/register`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "StrongPassword123",
  "display_name": "Alex"
}
```

**Response (201):**
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "display_name": "Alex",
  "roles": ["user"]
}
```

### 4.2. `POST /api/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "StrongPassword123"
}
```

**Response (200):**
```json
{
  "access_token": "<JWT_ACCESS>",
  "refresh_token": "<JWT_REFRESH>",
  "token_type": "Bearer",
  "expires_in": 1800,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "Alex",
    "roles": ["user"]
  }
}
```

### 4.3. `POST /api/auth/refresh`

**Request:**
```json
{
  "refresh_token": "<JWT_REFRESH>"
}
```

**Response (200):**
```json
{
  "access_token": "<NEW_JWT_ACCESS>",
  "refresh_token": "<NEW_JWT_REFRESH>",
  "token_type": "Bearer",
  "expires_in": 1800
}
```

### 4.4. `POST /api/auth/logout`

**Request:**
```json
{
  "refresh_token": "<JWT_REFRESH>"
}
```

**Response:**
```json
{
  "status": "ok"
}
```

### 4.5. `GET /api/auth/me`

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "display_name": "Alex",
  "avatar_url": null,
  "roles": ["user"],
  "created_at": "2025-11-26T10:00:00Z"
}
```

---

## 5. HTTP API (INTERNAL)

### 5.1. `POST /api/auth/introspect`

**Request:**
```json
{
  "token": "<JWT_ACCESS>"
}
```

**Response (200, valid):**
```json
{
  "active": true,
  "sub": "user_id-uuid",
  "email": "user@example.com",
  "roles": ["user"],
  "exp": 1732591800
}
```

**Response (200, invalid):**
```json
{
  "active": false
}
```

---

## 6. HEALTHCHECK

### `GET /healthz`

```json
{
  "status": "ok",
  "service": "auth-service",
  "version": "1.0.0"
}
```

---

## 7. CONFIGURATION (ENV)

```env
AUTH_SERVICE_PORT=7020
AUTH_DB_DSN=postgresql://user:pass@postgres:5432/daarion
AUTH_JWT_SECRET=your-very-long-secret-key-here
AUTH_ACCESS_TOKEN_TTL=1800
AUTH_REFRESH_TOKEN_TTL=604800
AUTH_BCRYPT_ROUNDS=12
```

---

## 8. SECURITY NOTES

* Паролі зберігати тільки як `bcrypt` hash.
* JWT secret — довгий (мінімум 32 символи), збережений у `.env`.
* Rate limiting для `/auth/login` (захист від brute force).
* Логи не повинні писати паролі / токени.
* HTTPS обов'язковий у production.

---

## 9. ROADMAP (POST-MVP)

* OAuth2 / OIDC (Google, GitHub, Telegram).
* WebAuthn / passkeys.
* Device-level identity (звʼязок із Matrix devices).
* On-chain identity (wallet + DID).
* Email verification.
* Password reset flow.

