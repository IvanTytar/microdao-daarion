# TASK: PHASE 4.5 — REAL PASSKEY AUTH (WebAuthn) + ACTOR CONTEXT INTEGRATION

**Goal:**
Замість stub-автентифікації додати повноцінний WebAuthn Passkey login/registration.
Підключити це до auth-service, PDP та всього DAARION фронтенду (onboarding + dashboards + agent hub).

**Result:**
Після виконання task користувач заходить у DAARION повністю через Passkey (FaceID/TouchID), без паролів, без сторонніх логінів. ActorIdentity формується автоматично.

---

## 1) BACKEND — AUTH-SERVICE (FastAPI)

**Directory:** `services/auth-service/`

**Add new files:**
- `routes_passkey.py`
- `webauthn_utils.py`
- `schemas_passkey.py`
- `passkey_store.py` (PostgreSQL logic)

**Update:**
- `main.py`
- `models.py`
- `actor_context.py`
- `Dockerfile`
- `README.md`

---

### 1.1 Passkey Backend Endpoints (WebAuthn Standard)

Implement these endpoints:

#### POST /auth/passkey/register/start
→ Генерує challenge + options для WebAuthn credential creation

**Response:**
```json
{
  "challenge": "...",
  "rp": { "name": "DAARION", "id": "localhost" },
  "user": {
      "id": "base64url(user_id)",
      "name": "user:93",
      "displayName": "@username"
  },
  "pubKeyCredParams": [ { "type": "public-key", "alg": -7 } ],
  "timeout": 60000
}
```

#### POST /auth/passkey/register/finish
→ Валідує client attestation + зберігає credential в базу

**Request:**
```json
{
  "id": "...",
  "rawId": "...",
  "type": "public-key",
  "response": { "attestationObject": "...", "clientDataJSON": "..." }
}
```

#### POST /auth/passkey/authenticate/start
→ Генерує challenge для login

#### POST /auth/passkey/authenticate/finish
→ Валідує assertion, повертає session_token

**Response:**
```json
{
  "session_token": "...",
  "actor": { ...ActorIdentity... }
}
```

All validation strictly follows WebAuthn spec.

---

### 1.2 passkey_store.py — Database tables

**Add migrations:**

```sql
CREATE TABLE passkeys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  sign_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  device_name TEXT
);

CREATE INDEX idx_passkeys_user_id ON passkeys(user_id);
CREATE INDEX idx_passkeys_credential_id ON passkeys(credential_id);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE passkey_challenges (
  challenge TEXT PRIMARY KEY,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  challenge_type TEXT NOT NULL  -- 'register' or 'authenticate'
);

CREATE INDEX idx_passkey_challenges_expires_at ON passkey_challenges(expires_at);
```

**Implement functions:**
- `create_passkey(user_id, credential_id, public_key, ...)`
- `get_passkeys_by_user_id(user_id)`
- `update_sign_count(credential_id, new_counter)`
- `store_challenge(challenge, user_id, type)`
- `verify_challenge(challenge)`

---

### 1.3 actor_context.py

**Extend:**

```python
def build_actor_context(request):
    - if session_token → load user
    - resolve all microDAO memberships
    - resolve all roles (microdao_owner, admin, member)
    - return ActorIdentity
```

This will be used by:
- messaging-service (PEP)
- agent-runtime
- toolcore
- pdp-service

---

## 2) FRONTEND — REACT + VITE

**Directory:**
- `src/features/onboarding/scenes/PasskeyScene.tsx`
- `src/features/auth/passkey/`

**Add files:**
- `src/features/auth/hooks/usePasskeyRegister.ts`
- `src/features/auth/hooks/usePasskeyLogin.ts`
- `src/api/auth/passkey.ts`
- `src/store/authStore.ts`

**Fix onboarding flow:**
1. User arrives at PasskeyScene
2. Calls `/auth/passkey/register/start`
3. `navigator.credentials.create(...)`
4. Calls `/auth/passkey/register/finish`
5. Receives `session_token`
6. Store `session_token` in localStorage
7. Update global auth state

---

### 2.1 API calls (frontend)

```typescript
POST /auth/passkey/register/start
POST /auth/passkey/register/finish

POST /auth/passkey/authenticate/start
POST /auth/passkey/authenticate/finish
```

**Global auth store:**
```typescript
interface AuthStore {
  sessionToken: string | null;
  actor: ActorIdentity | null;
  isAuthenticated: boolean;
  setSession: (token: string, actor: ActorIdentity) => void;
  clearSession: () => void;
}
```

**Add helpers:**
- `setSession(token)`
- `clearSession()`

---

## 3) INTEGRATION: PDP + AUTH + UI

### 3.1 PDP
No changes required — Passkey login provides ActorIdentity → PDP already works.

### 3.2 messaging-service
Update PEP middleware to:
```python
actor = auth_service.build_actor_context()
```
Make no stub assumptions.

### 3.3 agent-runtime
Replace old stub:
```python
agent_identity = get_identity_from_stub()
```
With:
```python
actor_identity = call auth_service /auth/me
```

### 3.4 All frontend pages:
Wrap:
- `/city-v2`
- `/space`
- `/messenger`
- `/agent-hub` (future)

With:
```typescript
if (!isAuthenticated) → redirect("/onboarding")
```

---

## 4) SECURITY RULES (WebAuthn Compliance)

**Implement:**
- Challenge stored per-user + expires in 5 min
- RPID: `"localhost"` for dev; `"daarion.city"` for prod
- Allowed origins:
  - `http://localhost:3000`
  - `https://daarion.city`
- Counter validation (sign_count)
- Token rotation

---

## 5) DOCKER + ENV

**auth-service must expose:**
```yaml
port: 7011
env:
  RP_ID: localhost
  RP_NAME: DAARION
  ORIGIN: http://localhost:3000
```

**Add to docker-compose.phase4.yml:**
```yaml
auth-service:
  build: ./services/auth-service
  ports: ["7011:7011"]
  environment:
    RP_ID: "localhost"
    RP_NAME: "DAARION"
    ORIGIN: "http://localhost:3000"
    JWT_SECRET: "your-secret-key"
```

---

## 6) ACCEPTANCE CRITERIA

- [PASS] User can register Passkey in onboarding
- [PASS] User can login via Passkey (no passwords)
- [PASS] auth-service returns ActorIdentity
- [PASS] PDP uses correct actor roles
- [PASS] messenger-service prevents unauthorized send_message
- [PASS] agent-runtime resolves agent identity correctly
- [PASS] UI prevents access without auth
- [PASS] Audit logs show passkey login events

---

## 7) LIBRARIES & DEPENDENCIES

### Backend (Python):
```
webauthn==1.11.1
cryptography==41.0.7
```

### Frontend (TypeScript):
```typescript
@simplewebauthn/browser
@simplewebauthn/typescript-types
```

---

**END OF TASK**

**Status:** Ready for implementation  
**Time Estimate:** 2-4 days  
**Priority:** High (blocks Agent Hub UI)





