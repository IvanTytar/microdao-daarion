# Usage Engine

**Port:** 7013  
**Purpose:** Collect and report usage metrics for DAARION

## Features

✅ **Collectors (NATS):**
- `usage.llm` — LLM call tracking
- `usage.tool` — Tool execution tracking
- `usage.agent` — Agent invocation tracking
- `messaging.message.created` — Message tracking

✅ **Aggregators (PostgreSQL):**
- Summary by microDAO, agent, time period
- Model usage breakdown
- Agent activity breakdown
- Tool usage breakdown

✅ **API:**
- `/internal/usage/summary` — Comprehensive usage report
- `/internal/usage/models` — Model-specific usage
- `/internal/usage/agents` — Agent-specific usage
- `/internal/usage/tools` — Tool-specific usage

## API

### GET /internal/usage/summary

Get comprehensive usage summary:

```bash
curl "http://localhost:7013/internal/usage/summary?microdao_id=microdao:7&period_hours=24"
```

**Response:**
```json
{
  "summary": {
    "period_start": "2025-11-23T12:00:00Z",
    "period_end": "2025-11-24T12:00:00Z",
    "microdao_id": "microdao:7",
    "llm_calls_total": 145,
    "llm_tokens_total": 87432,
    "tool_calls_total": 23,
    "agent_invocations_total": 56,
    "messages_sent": 342
  },
  "models": [
    {
      "model": "gpt-4.1-mini",
      "provider": "openai",
      "calls": 120,
      "tokens": 75000,
      "avg_latency_ms": 1250
    }
  ],
  "agents": [
    {
      "agent_id": "agent:sofia",
      "invocations": 45,
      "llm_calls": 120,
      "tool_calls": 15,
      "total_tokens": 60000
    }
  ],
  "tools": [
    {
      "tool_id": "projects.list",
      "tool_name": "List Projects",
      "calls": 12,
      "success_rate": 0.95,
      "avg_latency_ms": 450
    }
  ]
}
```

### Query Parameters

- `microdao_id` — Filter by microDAO (optional)
- `agent_id` — Filter by agent (optional)
- `period_hours` — Time period (1-720 hours, default 24)

### GET /internal/usage/models

Model usage breakdown:

```bash
curl "http://localhost:7013/internal/usage/models?period_hours=168"
```

### GET /internal/usage/agents

Agent activity breakdown:

```bash
curl "http://localhost:7013/internal/usage/agents?microdao_id=microdao:7"
```

### GET /internal/usage/tools

Tool execution breakdown:

```bash
curl "http://localhost:7013/internal/usage/tools?period_hours=24"
```

## NATS Integration

### Published Events (None)
Usage Engine only consumes events.

### Consumed Events

#### 1. usage.llm
From: `llm-proxy`

```json
{
  "event_id": "evt-123",
  "timestamp": "2025-11-24T12:00:00Z",
  "actor_id": "user:93",
  "actor_type": "human",
  "agent_id": "agent:sofia",
  "microdao_id": "microdao:7",
  "model": "gpt-4.1-mini",
  "provider": "openai",
  "prompt_tokens": 450,
  "completion_tokens": 120,
  "total_tokens": 570,
  "latency_ms": 1250,
  "success": true
}
```

#### 2. usage.tool
From: `toolcore`

```json
{
  "event_id": "evt-456",
  "timestamp": "2025-11-24T12:01:00Z",
  "actor_id": "agent:sofia",
  "actor_type": "agent",
  "agent_id": "agent:sofia",
  "microdao_id": "microdao:7",
  "tool_id": "projects.list",
  "tool_name": "List Projects",
  "success": true,
  "latency_ms": 450
}
```

#### 3. usage.agent
From: `agent-runtime`

```json
{
  "event_id": "evt-789",
  "timestamp": "2025-11-24T12:02:00Z",
  "agent_id": "agent:sofia",
  "microdao_id": "microdao:7",
  "channel_id": "channel-uuid",
  "trigger": "message",
  "duration_ms": 3450,
  "llm_calls": 2,
  "tool_calls": 1,
  "success": true
}
```

#### 4. messaging.message.created
From: `messaging-service`

```json
{
  "channel_id": "channel-uuid",
  "message_id": "msg-uuid",
  "sender_id": "user:93",
  "sender_type": "human",
  "microdao_id": "microdao:7",
  "created_at": "2025-11-24T12:03:00Z"
}
```

## Database Schema

### usage_llm
```sql
CREATE TABLE usage_llm (
  event_id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  agent_id TEXT,
  microdao_id TEXT,
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  prompt_tokens INT NOT NULL,
  completion_tokens INT NOT NULL,
  total_tokens INT NOT NULL,
  latency_ms INT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  error TEXT,
  metadata JSONB
);

CREATE INDEX idx_usage_llm_timestamp ON usage_llm(timestamp DESC);
CREATE INDEX idx_usage_llm_microdao ON usage_llm(microdao_id, timestamp DESC);
CREATE INDEX idx_usage_llm_agent ON usage_llm(agent_id, timestamp DESC);
```

### usage_tool
```sql
CREATE TABLE usage_tool (
  event_id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  agent_id TEXT,
  microdao_id TEXT,
  tool_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  latency_ms INT NOT NULL,
  error TEXT,
  metadata JSONB
);

CREATE INDEX idx_usage_tool_timestamp ON usage_tool(timestamp DESC);
CREATE INDEX idx_usage_tool_microdao ON usage_tool(microdao_id, timestamp DESC);
```

### usage_agent
```sql
CREATE TABLE usage_agent (
  event_id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  agent_id TEXT NOT NULL,
  microdao_id TEXT,
  channel_id TEXT,
  trigger TEXT NOT NULL,
  duration_ms INT NOT NULL,
  llm_calls INT DEFAULT 0,
  tool_calls INT DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  error TEXT,
  metadata JSONB
);

CREATE INDEX idx_usage_agent_timestamp ON usage_agent(timestamp DESC);
CREATE INDEX idx_usage_agent_id ON usage_agent(agent_id, timestamp DESC);
```

### usage_message
```sql
CREATE TABLE usage_message (
  event_id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  microdao_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_length INT NOT NULL,
  metadata JSONB
);

CREATE INDEX idx_usage_message_timestamp ON usage_message(timestamp DESC);
CREATE INDEX idx_usage_message_microdao ON usage_message(microdao_id, timestamp DESC);
```

## Setup

### Local Development
```bash
cd services/usage-engine
pip install -r requirements.txt
export DATABASE_URL="postgresql://..."
export NATS_URL="nats://localhost:4222"
python main.py
```

### Docker
```bash
docker build -t usage-engine .
docker run -p 7013:7013 \
  -e DATABASE_URL="postgresql://..." \
  -e NATS_URL="nats://nats:4222" \
  usage-engine
```

## Testing

### Publish Test Events
```bash
# LLM event
nats pub usage.llm '{"event_id":"test-1","timestamp":"2025-11-24T12:00:00Z",...}'

# Check aggregation
curl "http://localhost:7013/internal/usage/summary?period_hours=1"
```

## Integration

### llm-proxy Integration
After every LLM call:
```python
await publish_nats_event("usage.llm", {
    "event_id": str(uuid4()),
    "timestamp": datetime.utcnow().isoformat(),
    "model": model,
    "total_tokens": usage.total_tokens,
    # ...
})
```

### toolcore Integration
After every tool execution:
```python
await publish_nats_event("usage.tool", {
    "event_id": str(uuid4()),
    "tool_id": tool_id,
    "success": success,
    # ...
})
```

### agent-runtime Integration
After every agent invocation:
```python
await publish_nats_event("usage.agent", {
    "event_id": str(uuid4()),
    "agent_id": agent_id,
    "llm_calls": llm_call_count,
    "tool_calls": tool_call_count,
    # ...
})
```

## Roadmap

### Phase 4 (Current):
- ✅ NATS collectors
- ✅ PostgreSQL storage
- ✅ Basic aggregation API

### Phase 5:
- 🔜 Real-time dashboards (WebSockets)
- 🔜 Cost estimation (per model)
- 🔜 Billing integration
- 🔜 Quota management
- 🔜 Anomaly detection

---

**Status:** ✅ Phase 4 Ready  
**Version:** 1.0.0  
**Last Updated:** 2025-11-24




