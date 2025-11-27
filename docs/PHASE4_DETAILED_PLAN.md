# 📋 PHASE 4: SECURITY LAYER — Детальний План

**Мета:** Повноцінний безпековий шар для DAARION  
**Термін:** 4-6 тижнів (або 3-4 години automated)  
**Залежності:** Phase 1-3 complete

---

## 🎯 OVERVIEW

Phase 4 додає критичну інфраструктуру безпеки:

```
┌─────────────────────────────────────────┐
│ SECURITY LAYER (Phase 4)                │
├─────────────────────────────────────────┤
│                                         │
│  1. AUTH SERVICE                        │
│     └─ Identity & Sessions              │
│                                         │
│  2. PDP SERVICE (Policy Decision)       │
│     └─ Centralized access control       │
│                                         │
│  3. PEP HOOKS (Policy Enforcement)      │
│     └─ Enforce decisions in services    │
│                                         │
│  4. USAGE ENGINE                        │
│     └─ Track LLM/Tools/Agent usage      │
│                                         │
│  5. AUDIT LOG                           │
│     └─ Security events & compliance     │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📦 DELIVERABLES (40+ files)

### 1. **auth-service** (8 files) ✅ COMPLETE
```
services/auth-service/
├── models.py              ✅ ActorIdentity, SessionToken, ApiKey
├── actor_context.py       ✅ build_actor_context, require_actor
├── routes_sessions.py     ✅ /auth/login, /me, /logout
├── routes_api_keys.py     ✅ /auth/api-keys CRUD
├── main.py                ✅ FastAPI app + DB tables
├── requirements.txt       ✅
├── Dockerfile             ✅
└── README.md              ✅ Complete documentation
```

**Port:** 7011  
**Status:** ✅ Working  
**Features:**
- Mock login (3 test users)
- Session tokens (7-day expiry)
- API keys with optional expiration
- ActorContext helper for other services

---

### 2. **pdp-service** (8 files) 🔄 20% COMPLETE
```
services/pdp-service/
├── models.py              ✅ PolicyRequest, PolicyDecision
├── engine.py              🔜 Policy evaluation logic
├── policy_store.py        🔜 Config-based policy storage
├── main.py                🔜 FastAPI app
├── config.yaml            🔜 microDAO/channel policies
├── requirements.txt       🔜
├── Dockerfile             🔜
└── README.md              🔜 Complete documentation
```

**Port:** 7012  
**Purpose:** Centralized Policy Decision Point

**Key Features:**
- Evaluate access requests (actor + action + resource)
- Config-based policies (v1)
- Support for:
  - MicroDAO access (owner/admin/member)
  - Channel access (SEND_MESSAGE, READ)
  - Tool execution (EXEC_TOOL)
  - Agent management (MANAGE)
  - Usage viewing (VIEW_USAGE)

**Policy Types:**

#### MicroDAO Policies
```yaml
microdao_policies:
  - microdao_id: "microdao:daarion"
    owners: ["user:1"]
    admins: ["user:1", "user:93"]
    members: ["user:*"]  # All users
```

#### Channel Policies
```yaml
channel_policies:
  - channel_id: "channel-uuid-123"
    microdao_id: "microdao:daarion"
    allowed_roles: ["member", "admin", "owner"]
    blocked_users: []
```

#### Tool Policies
```yaml
tool_policies:
  - tool_id: "projects.list"
    allowed_agents: ["agent:sofia", "agent:pm"]
    allowed_user_roles: ["admin", "owner"]
```

**Policy Evaluation Logic:**

```python
def evaluate(request: PolicyRequest) -> PolicyDecision:
    # 1. System Admin bypass (careful!)
    if "system_admin" in request.actor.roles:
        return permit("system_admin")
    
    # 2. Resource-specific rules
    if request.resource.type == "microdao":
        if is_microdao_owner(actor, resource):
            return permit("microdao_owner")
        if is_microdao_admin(actor, resource):
            return permit("microdao_admin")
        if request.action == "read" and is_member(actor, resource):
            return permit("member")
        return deny("not_authorized")
    
    if request.resource.type == "channel":
        if not is_channel_member(actor, resource):
            return deny("not_channel_member")
        if request.action == "send_message":
            if is_blocked(actor, resource):
                return deny("blocked")
            return permit("channel_member")
    
    if request.resource.type == "tool":
        if actor.actor_id in tool.allowed_agents:
            return permit("allowed_agent")
        return deny("tool_not_allowed")
    
    # Default deny
    return deny("no_matching_policy")
```

---

### 3. **usage-engine** (8 files) 🔜 0% COMPLETE
```
services/usage-engine/
├── models.py              🔜 LlmUsageEvent, ToolUsageEvent
├── collectors.py          🔜 NATS listeners
├── aggregators.py         🔜 Aggregate stats
├── reporters.py           🔜 API endpoints
├── main.py                🔜 FastAPI app
├── requirements.txt       🔜
├── Dockerfile             🔜
└── README.md              🔜 Complete documentation
```

**Port:** 7013  
**Purpose:** Usage tracking & billing foundation

**NATS Subjects:**
- `usage.llm` — LLM calls (from llm-proxy)
- `usage.tool` — Tool executions (from toolcore)
- `usage.agent` — Agent invocations (from agent-runtime)

**Events:**

#### LLM Usage Event
```json
{
  "event_id": "evt-123",
  "timestamp": "2025-11-24T12:34:56Z",
  "actor": {
    "actor_id": "user:93",
    "actor_type": "human",
    "microdao_ids": ["microdao:7"]
  },
  "agent_id": "agent:sofia",
  "microdao_id": "microdao:7",
  "model": "gpt-4.1-mini",
  "provider": "openai",
  "prompt_tokens": 1234,
  "completion_tokens": 567,
  "total_tokens": 1801,
  "latency_ms": 2345,
  "cost_usd": 0.0234
}
```

#### Tool Usage Event
```json
{
  "event_id": "evt-456",
  "timestamp": "2025-11-24T12:35:00Z",
  "actor": {
    "actor_id": "agent:sofia",
    "actor_type": "agent"
  },
  "agent_id": "agent:sofia",
  "microdao_id": "microdao:7",
  "tool_id": "projects.list",
  "success": true,
  "latency_ms": 123,
  "result_size_bytes": 4567
}
```

**API Endpoints:**

```http
GET /internal/usage/summary?microdao_id=microdao:7&period=24h
→ Aggregate stats (tokens, calls, cost)

GET /internal/usage/agents?microdao_id=microdao:7&period=7d
→ Top agents by usage

GET /internal/usage/models?period=24h
→ Model distribution

GET /internal/usage/costs?microdao_id=microdao:7&period=30d
→ Cost breakdown
```

**Database Tables:**

```sql
CREATE TABLE usage_llm (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    actor_id TEXT NOT NULL,
    agent_id TEXT,
    microdao_id TEXT,
    model TEXT NOT NULL,
    provider TEXT NOT NULL,
    prompt_tokens INT NOT NULL,
    completion_tokens INT NOT NULL,
    total_tokens INT NOT NULL,
    latency_ms INT,
    cost_usd DECIMAL(10, 6)
);

CREATE TABLE usage_tool (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    actor_id TEXT NOT NULL,
    agent_id TEXT,
    microdao_id TEXT,
    tool_id TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    latency_ms INT,
    result_size_bytes INT
);

-- Indexes for fast queries
CREATE INDEX idx_usage_llm_microdao_time ON usage_llm(microdao_id, timestamp DESC);
CREATE INDEX idx_usage_llm_agent ON usage_llm(agent_id, timestamp DESC);
CREATE INDEX idx_usage_tool_microdao ON usage_tool(microdao_id, timestamp DESC);
```

---

### 4. **PEP Integration** (3 services) 🔜 0% COMPLETE

#### 4.1 messaging-service PEP
**File:** `services/messaging-service/pep_middleware.py`

```python
from auth_service_client import get_actor_context
from pdp_service_client import evaluate_policy

async def check_send_message_permission(
    actor_id: str,
    channel_id: str,
    db_pool: asyncpg.Pool
) -> bool:
    """Check if actor can send message to channel"""
    
    # 1. Get actor context
    actor = await get_actor_context(actor_id, db_pool)
    
    # 2. Evaluate policy
    decision = await evaluate_policy(
        actor=actor,
        action="send_message",
        resource={"type": "channel", "id": channel_id}
    )
    
    # 3. Return decision
    return decision.effect == "permit"
```

**Integration Points:**
- `POST /api/messaging/channels/{channel_id}/messages` — check before send
- `POST /api/messaging/channels` — check MANAGE permission
- `POST /api/messaging/channels/{channel_id}/members` — check INVITE permission

#### 4.2 agent-runtime PEP
**File:** `services/agent-runtime/pep_client.py`

```python
async def check_tool_execution_permission(
    agent_id: str,
    tool_id: str,
    microdao_id: str
) -> bool:
    """Check if agent can execute tool"""
    
    # Build agent actor
    actor = ActorIdentity(
        actor_id=agent_id,
        actor_type="agent",
        microdao_ids=[microdao_id],
        roles=["agent"]
    )
    
    # Evaluate
    decision = await evaluate_policy(
        actor=actor,
        action="exec_tool",
        resource={"type": "tool", "id": tool_id}
    )
    
    return decision.effect == "permit"
```

**Integration:** Before calling toolcore in `handle_invocation()`

#### 4.3 toolcore PEP
**Already has:** `allowed_agents` in registry  
**Additional:** Cross-check with PDP for user-initiated tool calls

---

### 5. **Audit Log** (1 migration) 🔜 0% COMPLETE

**File:** `migrations/004_create_security_audit.sql`

```sql
CREATE TABLE security_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id TEXT NOT NULL,
    actor_type TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    decision TEXT NOT NULL,  -- permit/deny
    reason TEXT,
    context JSONB,
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_audit_timestamp ON security_audit(timestamp DESC);
CREATE INDEX idx_audit_actor ON security_audit(actor_id, timestamp DESC);
CREATE INDEX idx_audit_decision ON security_audit(decision, timestamp DESC);
CREATE INDEX idx_audit_resource ON security_audit(resource_type, resource_id);
```

**PDP Integration:**
After every `evaluate()` call, write to audit log:

```python
async def log_audit_event(
    request: PolicyRequest,
    decision: PolicyDecision,
    context: dict = None
):
    """Write audit log entry"""
    await db.execute("""
        INSERT INTO security_audit
        (actor_id, actor_type, action, resource_type, resource_id, 
         decision, reason, context)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    """,
        request.actor.actor_id,
        request.actor.actor_type,
        request.action,
        request.resource.type,
        request.resource.id,
        decision.effect,
        decision.reason,
        json.dumps(context or {})
    )
```

**NATS Security Events:**
- `security.suspicious` — Publish on:
  - Multiple deny events (>5 in 1 min)
  - Unusual tool execution attempts
  - Privilege escalation attempts

---

### 6. **Infrastructure** (3 files) 🔜 0% COMPLETE

#### 6.1 docker-compose.phase4.yml
```yaml
services:
  auth-service:
    build: ./services/auth-service
    ports: ["7011:7011"]
    environment:
      - DATABASE_URL=postgresql://...
  
  pdp-service:
    build: ./services/pdp-service
    ports: ["7012:7012"]
    environment:
      - DATABASE_URL=postgresql://...
  
  usage-engine:
    build: ./services/usage-engine
    ports: ["7013:7013"]
    environment:
      - DATABASE_URL=postgresql://...
      - NATS_URL=nats://nats:4222
  
  # + All Phase 3 services
  llm-proxy:
    environment:
      - AUTH_SERVICE_URL=http://auth-service:7011
  
  # etc...
```

#### 6.2 scripts/start-phase4.sh
#### 6.3 scripts/stop-phase4.sh

---

### 7. **Documentation** (4 files) 🔜 0% COMPLETE

#### 7.1 docs/AUTH_SERVICE_SPEC.md
- Actor model
- Session management
- API keys
- Integration guide

#### 7.2 docs/PDP_SPEC.md
- Policy model
- Evaluation logic
- Policy configuration
- Adding new rules

#### 7.3 docs/USAGE_ENGINE_SPEC.md
- Event model
- NATS integration
- Aggregation queries
- Billing foundation

#### 7.4 PHASE4_READY.md
- Overview
- Quick start
- Testing guide
- Production readiness

---

## 📊 IMPLEMENTATION ROADMAP

### Week 1: Core Services
- ✅ auth-service (complete)
- 🔄 pdp-service (20% → 100%)
- 🔜 usage-engine (0% → 100%)

### Week 2: Integration
- 🔜 PEP hooks (messaging-service)
- 🔜 PEP hooks (agent-runtime)
- 🔜 PEP hooks (toolcore)

### Week 3: Audit & Testing
- 🔜 Audit log migration
- 🔜 Security events (NATS)
- 🔜 E2E testing

### Week 4: Documentation & Polish
- 🔜 All docs (4 files)
- 🔜 docker-compose
- 🔜 Scripts
- 🔜 PHASE4_READY.md

---

## 🎯 ACCEPTANCE CRITERIA

### Auth Service: ✅
- [x] Login works with mock users
- [x] Session tokens created & validated
- [x] API keys CRUD functional
- [x] actor_context helper ready

### PDP Service: 🔜
- [ ] /internal/pdp/evaluate works
- [ ] MicroDAO access rules
- [ ] Channel access rules
- [ ] Tool execution rules
- [ ] 10+ unit tests

### PEP Integration: 🔜
- [ ] messaging-service blocks unauthorized sends
- [ ] agent-runtime checks tool permissions
- [ ] toolcore enforces allowed_agents

### Usage Engine: 🔜
- [ ] usage.llm events collected
- [ ] usage.tool events collected
- [ ] /internal/usage/summary works
- [ ] Database tables created

### Audit Log: 🔜
- [ ] security_audit table exists
- [ ] PDP writes every decision
- [ ] Can query last 100 events
- [ ] security.suspicious events published

### Infrastructure: 🔜
- [ ] docker-compose.phase4.yml works
- [ ] All services healthy
- [ ] Start/stop scripts functional
- [ ] Documentation complete

---

## 🚀 QUICK START (After Complete)

```bash
# 1. Start Phase 4
./scripts/start-phase4.sh

# 2. Test Auth
curl -X POST http://localhost:7011/auth/login \
  -d '{"email": "user@daarion.city"}'

# 3. Test PDP
curl -X POST http://localhost:7012/internal/pdp/evaluate \
  -d '{
    "actor": {...},
    "action": "send_message",
    "resource": {"type": "channel", "id": "..."}
  }'

# 4. Check Usage
curl http://localhost:7013/internal/usage/summary?period=24h

# 5. View Audit
docker exec daarion-postgres psql -U postgres -d daarion \
  -c "SELECT * FROM security_audit ORDER BY timestamp DESC LIMIT 10;"
```

---

## 🔜 AFTER PHASE 4

### Phase 5: Advanced Features
- Real Passkey integration
- OAuth2 providers
- Advanced policy language (ABAC)
- Dynamic policy updates
- Cost allocation & billing
- Security analytics dashboard

### Phase 6: Production Hardening
- Rate limiting (Redis)
- DDoS protection
- Penetration testing
- Security audit
- Compliance certification

---

## 📚 RESOURCES

**Specs:**
- Phase 4 Master Task (user-provided)
- [PHASE4_STARTED.md](../PHASE4_STARTED.md)

**Related:**
- [PHASE3_IMPLEMENTATION_COMPLETE.md](../PHASE3_IMPLEMENTATION_COMPLETE.md)
- [ALL_PHASES_STATUS.md](../ALL_PHASES_STATUS.md)

**Standards:**
- RBAC (Role-Based Access Control)
- ABAC (Attribute-Based Access Control)
- OAuth 2.0 / OpenID Connect
- Audit logging best practices

---

**Status:** 📋 Detailed Plan Complete  
**Next:** Continue Implementation  
**Version:** 1.0.0  
**Last Updated:** 2025-11-24




