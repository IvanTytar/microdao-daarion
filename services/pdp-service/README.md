# PDP Service (Policy Decision Point)

**Port:** 7012  
**Purpose:** Centralized access control for DAARION

## Features

✅ **Policy Evaluation:**
- MicroDAO access (owner/admin/member)
- Channel access (SEND_MESSAGE, READ, MANAGE)
- Tool execution (allowed_agents + roles)
- Agent management
- Usage viewing

✅ **Policy Storage:**
- Config-based (Phase 4)
- Database-backed (Phase 5)

✅ **Audit Logging:**
- Every decision logged to security_audit
- Integration with audit service

## Policy Model

### Actor Identity
```json
{
  "actor_id": "user:93",
  "actor_type": "human",
  "microdao_ids": ["microdao:7"],
  "roles": ["member", "admin"]
}
```

### Policy Request
```json
{
  "actor": {...ActorIdentity...},
  "action": "send_message",
  "resource": {
    "type": "channel",
    "id": "channel-uuid"
  },
  "context": {}
}
```

### Policy Decision
```json
{
  "effect": "permit",
  "reason": "channel_member",
  "obligations": {}
}
```

## API

### POST /internal/pdp/evaluate

Evaluate access control policy:

```bash
curl -X POST http://localhost:7012/internal/pdp/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "actor": {
      "actor_id": "user:93",
      "actor_type": "human",
      "microdao_ids": ["microdao:7"],
      "roles": ["member"]
    },
    "action": "send_message",
    "resource": {
      "type": "channel",
      "id": "channel-general"
    }
  }'
```

**Response:**
```json
{
  "effect": "permit",
  "reason": "channel_member"
}
```

### GET /internal/pdp/policies

List loaded policies:
```bash
curl http://localhost:7012/internal/pdp/policies
```

## Policy Configuration

Edit `config.yaml`:

### MicroDAO Policies
```yaml
microdao_policies:
  - microdao_id: "microdao:daarion"
    owners: ["user:1"]
    admins: ["user:1", "user:93"]
    members: []  # All members
```

### Channel Policies
```yaml
channel_policies:
  - channel_id: "channel-general"
    microdao_id: "microdao:daarion"
    allowed_roles: ["member", "admin", "owner"]
    blocked_users: []
```

### Tool Policies
```yaml
tool_policies:
  - tool_id: "projects.list"
    enabled: true
    allowed_agents: ["agent:sofia"]
    allowed_user_roles: ["admin"]
```

### Agent Policies
```yaml
agent_policies:
  - agent_id: "agent:sofia"
    owner_id: "user:1"
    microdao_id: "microdao:daarion"
```

## Policy Rules

### MicroDAO Access
- **Owners:** Full access (all actions)
- **Admins:** READ, WRITE, INVITE
- **Members:** READ only

### Channel Access
1. Must be microDAO member
2. Must not be blocked
3. Must have required role
4. SEND_MESSAGE: Additional rate limit checks
5. MANAGE: Admin+ only

### Tool Execution
1. Tool must be enabled
2. Actor in allowed_agents list
3. OR actor has required role

### Agent Management
- Agent owner: Full access
- MicroDAO admin: Full access
- Same microDAO: READ only

### Usage Viewing
- Own usage: Always allowed
- MicroDAO usage: Admin only
- All usage: System admin only

## Evaluation Flow

```
Request → PDP Service
    ↓
1. System Admin Check (bypass)
    ↓
2. Service-to-Service Check (trust)
    ↓
3. Resource-Specific Rules
    ├─ MicroDAO → Owner/Admin/Member
    ├─ Channel → Membership + Role
    ├─ Tool → Allowlist + Role
    ├─ Agent → Ownership
    └─ Usage → Self + Admin
    ↓
4. Default Deny
    ↓
Decision (permit/deny + reason)
    ↓
Audit Log (security_audit table)
```

## Integration

### From Other Services

```python
import httpx

async def check_permission(actor, action, resource):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://pdp-service:7012/internal/pdp/evaluate",
            json={
                "actor": actor.dict(),
                "action": action,
                "resource": resource.dict()
            }
        )
        decision = response.json()
        return decision["effect"] == "permit"
```

### Example: messaging-service

```python
# Before sending message
permitted = await check_permission(
    actor=current_actor,
    action="send_message",
    resource={"type": "channel", "id": channel_id}
)

if not permitted:
    raise HTTPException(403, "Access denied")
```

## Setup

### Local Development
```bash
cd services/pdp-service
pip install -r requirements.txt
export DATABASE_URL="postgresql://..."
python main.py
```

### Docker
```bash
docker build -t pdp-service .
docker run -p 7012:7012 \
  -e DATABASE_URL="postgresql://..." \
  -v $(pwd)/config.yaml:/app/config.yaml \
  pdp-service
```

## Testing

### Unit Tests
```python
from engine import evaluate
from policy_store import PolicyStore
from models import *

store = PolicyStore()

# Test: Owner can manage microDAO
request = PolicyRequest(
    actor=ActorIdentity(
        actor_id="user:1",
        actor_type="human",
        roles=[]
    ),
    action="manage",
    resource=ResourceRef(
        type="microdao",
        id="microdao:daarion"
    )
)

decision = evaluate(request, store)
assert decision.effect == "permit"
assert decision.reason == "microdao_owner"
```

### Integration Tests
```bash
# Start service
python main.py &

# Test evaluation
curl -X POST http://localhost:7012/internal/pdp/evaluate \
  -d '{...}'

# Check policies
curl http://localhost:7012/internal/pdp/policies
```

## Audit Logging

Every policy decision is logged to `security_audit` table:

```sql
SELECT * FROM security_audit
WHERE actor_id = 'user:93'
ORDER BY timestamp DESC
LIMIT 10;
```

**Fields:**
- `actor_id`, `actor_type`
- `action`, `resource_type`, `resource_id`
- `decision` (permit/deny)
- `reason`
- `context` (JSONB)
- `timestamp`

## Roadmap

### Phase 4 (Current):
- ✅ Config-based policies
- ✅ 5+ policy types
- ✅ Audit logging
- ✅ Internal API

### Phase 5:
- 🔜 Database-backed policies
- 🔜 Dynamic policy updates
- 🔜 Policy versioning
- 🔜 ABAC (Attribute-Based Access Control)
- 🔜 Policy testing UI
- 🔜 Redis caching

## Troubleshooting

**Policies not loading?**
```bash
# Check config.yaml
cat config.yaml

# Check logs
docker logs pdp-service | grep "Loaded"
```

**Always deny?**
```bash
# Check actor has correct microDAO membership
# Check resource ID matches config
# Check audit log for reason
```

**Audit logging fails?**
```bash
# Check security_audit table exists
docker exec postgres psql -U postgres -d daarion \
  -c "SELECT * FROM security_audit LIMIT 1;"
```

---

**Status:** ✅ Phase 4 Ready  
**Version:** 1.0.0  
**Last Updated:** 2025-11-24





