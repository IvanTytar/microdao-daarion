# Agents Service

**Port:** 7014  
**Purpose:** Agent management, metrics, context, and events for DAARION Agent Hub

## Features

✅ **Agent Management:**
- List all agents (with filters)
- Get agent details
- Update agent settings (model, tools)

✅ **Metrics Integration:**
- Real-time usage stats from usage-engine
- LLM calls, tokens, latency
- Tool usage statistics

✅ **Context Integration:**
- Agent memory from memory-orchestrator
- Short-term, mid-term, knowledge

✅ **Events (Phase 6):**
- Agent activity feed
- Reply, tool calls, errors

✅ **Security:**
- Authentication via auth-service
- Authorization via PDP
- PEP enforcement

## API

### GET /agents
List all agents with optional filters.

**Query Parameters:**
- `microdao_id` — Filter by microDAO
- `kind` — Filter by agent kind

**Response:**
```json
[
  {
    "id": "agent:sofia",
    "name": "Sofia",
    "kind": "assistant",
    "model": "gpt-4.1-mini",
    "microdao_id": "microdao:daarion",
    "status": "active"
  }
]
```

### GET /agents/{agent_id}
Get full agent details.

**Response:**
```json
{
  "id": "agent:sofia",
  "name": "Sofia",
  "kind": "assistant",
  "model": "gpt-4.1-mini",
  "owner_user_id": "user:1",
  "microdao_id": "microdao:daarion",
  "tools": ["projects.list", "task.create"],
  "system_prompt": "...",
  "status": "active"
}
```

### GET /agents/{agent_id}/metrics
Get agent usage metrics.

**Query Parameters:**
- `period_hours` — Time period (default: 24)

**Response:**
```json
{
  "agent_id": "agent:sofia",
  "llm_calls_total": 145,
  "llm_tokens_total": 87432,
  "tool_calls_total": 23,
  "invocations_total": 56,
  "messages_sent": 342
}
```

### GET /agents/{agent_id}/context
Get agent memory context.

**Response:**
```json
{
  "agent_id": "agent:sofia",
  "short_term": [],
  "mid_term": [],
  "knowledge_items": []
}
```

### POST /agents/{agent_id}/settings/model
Update agent's LLM model.

**Request:**
```json
{
  "model": "gpt-4.1-mini"
}
```

### POST /agents/{agent_id}/settings/tools
Update agent's enabled tools.

**Request:**
```json
{
  "tools_enabled": ["projects.list", "task.create"]
}
```

## Setup

### Local Development
```bash
cd services/agents-service
pip install -r requirements.txt
python main.py
```

### Docker
```bash
docker build -t agents-service .
docker run -p 7014:7014 \
  -e AUTH_URL="http://auth-service:7011" \
  -e PDP_URL="http://pdp-service:7012" \
  -e USAGE_URL="http://usage-engine:7013" \
  agents-service
```

## Integration

Connects to:
- **auth-service** (7011) — Authentication
- **pdp-service** (7012) — Authorization
- **usage-engine** (7013) — Metrics
- **memory-orchestrator** (7008) — Context
- **toolcore** (7009) — Tool info

## Roadmap

### Phase 5 (Current):
- ✅ Mock agent data
- ✅ Metrics integration
- ✅ Basic context
- ✅ Settings update

### Phase 6:
- 🔜 Database-backed agents
- 🔜 Event store
- 🔜 Agent creation
- 🔜 Avatar upload
- 🔜 System prompt editor

---

**Status:** ✅ Phase 5 MVP Ready  
**Version:** 1.0.0  
**Last Updated:** 2025-11-24





