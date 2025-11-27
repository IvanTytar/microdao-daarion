# Auth Service

**Port:** 7011  
**Purpose:** Identity & session management for DAARION

## Features

✅ **Session Management:**
- Login with email (Phase 4: mock users)
- Session tokens (7-day expiry)
- Logout

✅ **API Keys:**
- Create API keys for programmatic access
- List/delete keys
- Optional expiration

✅ **Actor Context:**
- Unified ActorIdentity model
- Supports: human, agent, service actors
- MicroDAO membership + roles

## Actor Model

### ActorIdentity
```json
{
  "actor_id": "user:93",
  "actor_type": "human",
  "microdao_ids": ["microdao:daarion", "microdao:7"],
  "roles": ["member", "microdao_owner"]
}
```

**Actor Types:**
- `human` — Real users
- `agent` — AI agents
- `service` — Internal services (llm-proxy, etc.)

**Roles:**
- `system_admin` — Full system access
- `microdao_owner` — Owner of a microDAO
- `admin` — Admin in a microDAO
- `member` — Regular member
- `agent` — Agent role

## API

### POST /auth/login
```bash
curl -X POST http://localhost:7011/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@daarion.city",
    "password": "any"
  }'
```

**Response:**
```json
{
  "session_token": "...",
  "actor": {
    "actor_id": "user:93",
    "actor_type": "human",
    "microdao_ids": ["microdao:daarion"],
    "roles": ["member"]
  },
  "expires_at": "2025-12-01T12:00:00Z"
}
```

**Mock Users (Phase 4):**
- `admin@daarion.city` → system_admin
- `user@daarion.city` → regular user
- `sofia@agents.daarion.city` → agent

### GET /auth/me
Get current actor:
```bash
curl http://localhost:7011/auth/me \
  -H "Authorization: Bearer <session_token>"
```

### POST /auth/logout
```bash
curl -X POST http://localhost:7011/auth/logout \
  -H "Authorization: Bearer <session_token>"
```

### POST /auth/api-keys
Create API key:
```bash
curl -X POST http://localhost:7011/auth/api-keys \
  -H "Authorization: Bearer <session_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "My API key",
    "expires_days": 30
  }'
```

**Response:**
```json
{
  "id": "key-123",
  "key": "dk_abc123...",
  "actor_id": "user:93",
  "description": "My API key",
  "created_at": "...",
  "expires_at": "..."
}
```

⚠️ **Key shown only once!**

### GET /auth/api-keys
List keys:
```bash
curl http://localhost:7011/auth/api-keys \
  -H "Authorization: Bearer <session_token>"
```

### DELETE /auth/api-keys/{key_id}
```bash
curl -X DELETE http://localhost:7011/auth/api-keys/key-123 \
  -H "Authorization: Bearer <session_token>"
```

## Integration

### In Other Services

```python
from actor_context import require_actor
from models import ActorIdentity

@app.get("/protected")
async def protected_route(
    actor: ActorIdentity = Depends(require_actor)
):
    # actor.actor_id, actor.roles, etc.
    ...
```

### Authentication Priority

1. **X-API-Key header** (for services)
2. **Authorization: Bearer <token>** (for API clients)
3. **session_token cookie** (for web UI)

## Database Schema

### sessions
```sql
CREATE TABLE sessions (
    token TEXT PRIMARY KEY,
    actor_id TEXT NOT NULL,
    actor_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_valid BOOLEAN DEFAULT true
);
```

### api_keys
```sql
CREATE TABLE api_keys (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    actor_id TEXT NOT NULL,
    actor_data JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    last_used TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);
```

## Setup

### Local Development
```bash
cd services/auth-service
pip install -r requirements.txt
python main.py
```

### Docker
```bash
docker build -t auth-service .
docker run -p 7011:7011 \
  -e DATABASE_URL="postgresql://..." \
  auth-service
```

## Roadmap

### Phase 4 (Current):
- ✅ Mock login
- ✅ Session tokens
- ✅ API keys
- ✅ ActorContext helper

### Phase 5:
- 🔜 Real Passkey integration
- 🔜 OAuth2 providers
- 🔜 Multi-factor auth
- 🔜 Session refresh tokens

---

**Status:** ✅ Phase 4 Ready  
**Version:** 1.0.0  
**Last Updated:** 2025-11-24





