# DAGI Router Service

**Routes events to appropriate agents and services**

## Purpose

DAGI Router is the central orchestrator that routes various events (filter decisions, direct invocations, scheduled jobs) to agent-runtime for execution.

## Features

- **Filter Decision Routing**: Processes `agent.filter.decision` events
- **Agent Invocation**: Creates and publishes `router.invoke.agent` messages
- **Configurable**: YAML-based routing configuration
- **Test Mode**: HTTP endpoint for testing routing logic

## Architecture

```
agent.filter.decision (NATS)
    ↓
router: Create AgentInvocation
    ↓
router.invoke.agent (NATS)
    ↓
agent-runtime (subscribes)
```

## Routing Rules

### Messaging Inbound (Phase 2)

**Input**: `agent.filter.decision` (from agent-filter)  
**Output**: `router.invoke.agent` (to agent-runtime)

**Logic**:
1. Only process `decision == "allow"`
2. Ensure `target_agent_id` is present
3. Create `AgentInvocation` with channel context
4. Publish to NATS

### Future Rules (Phase 3+)

- Direct agent invocations (API calls)
- Scheduled/cron invocations
- Webhook-triggered invocations
- Agent-to-agent communication

## API

### Health Check
```http
GET /health

Response:
{
  "status": "ok",
  "service": "router",
  "version": "1.0.0",
  "nats_connected": true,
  "messaging_inbound_enabled": true
}
```

### Test Routing (Manual)
```http
POST /internal/router/test-messaging
Content-Type: application/json

{
  "channel_id": "test-channel",
  "matrix_event_id": "$event123",
  "microdao_id": "microdao:daarion",
  "decision": "allow",
  "target_agent_id": "agent:sofia"
}

Response:
{
  "agent_id": "agent:sofia",
  "entrypoint": "channel_message",
  "payload": {
    "channel_id": "test-channel",
    "matrix_event_id": "$event123",
    "microdao_id": "microdao:daarion",
    "rewrite_prompt": null
  }
}
```

## Configuration

**File**: `router_config.yaml`

```yaml
messaging_inbound:
  enabled: true
  source_subject: "agent.filter.decision"
  target_subject: "router.invoke.agent"
```

## Environment Variables

- `NATS_URL`: NATS server URL (default: `nats://nats:4222`)

## Running Locally

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Run Service
```bash
uvicorn main:app --reload --port 8000
```

### Test
```bash
# Health check
curl http://localhost:8000/health

# Test routing
curl -X POST http://localhost:8000/internal/router/test-messaging \
  -H "Content-Type: application/json" \
  -d '{
    "channel_id": "test-123",
    "matrix_event_id": "$test",
    "microdao_id": "microdao:daarion",
    "decision": "allow",
    "target_agent_id": "agent:sofia"
  }'
```

## Docker

### Build
```bash
docker build -t daarion/router:latest .
```

### Run
```bash
docker run -p 8000:8000 \
  -e NATS_URL=nats://nats:4222 \
  daarion/router:latest
```

## NATS Events

### Subscribes To
- **Subject**: `agent.filter.decision`
- **Payload**: `FilterDecision`

### Publishes To
- **Subject**: `router.invoke.agent`
- **Payload**: `AgentInvocation`

## Monitoring

### Logs

```bash
docker logs -f router

# Look for:
# ✅ Connected to NATS
# ✅ Subscribed to agent.filter.decision
# 🔀 Processing filter decision
# ✅ Decision: allow
# 🚀 Created invocation for agent:sofia
# ✅ Published invocation
```

## Troubleshooting

### Not Routing Messages

**Check**:
1. Is router subscribed to NATS?
2. Is agent-filter publishing decisions?
3. Are decisions "allow"?
4. Is target_agent_id present?

```bash
# Check NATS subscription
docker exec -it router cat /app/router_config.yaml

# Test routing logic
curl -X POST http://localhost:8000/internal/router/test-messaging \
  -d @test_decision.json
```

## Future Enhancements

- [ ] Multiple routing strategies
- [ ] Agent load balancing
- [ ] Priority queues
- [ ] Rate limiting per agent
- [ ] Retry logic
- [ ] Dead letter queue
- [ ] Routing analytics

## Version

**Current**: 1.0.0  
**Status**: Production Ready (Phase 2)  
**Last Updated**: 2025-11-24




