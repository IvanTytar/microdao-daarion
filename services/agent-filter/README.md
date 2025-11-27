# Agent Filter Service

**Security & routing layer for DAARION agents in Messenger**

## Purpose

Agent Filter decides when and which agents should respond to messages based on configurable rules.

## Features

- **Loop Prevention**: Blocks agent→agent message loops
- **Quiet Hours**: Modifies agent behavior during specified times (23:00–07:00)
- **Agent Mapping**: Maps microDAOs to default agents
- **Channel Permissions**: Respects allowed/disabled agents per channel
- **NATS Integration**: Subscribes to message events, publishes filter decisions

## Architecture

```
messaging.message.created (NATS)
    ↓
agent-filter: Apply Rules
    ↓
agent.filter.decision (NATS)
```

## Rules

### 1. Loop Prevention
- **Rule**: Block messages from agents
- **Reason**: Prevent infinite agent→agent conversations

### 2. Quiet Hours
- **Time**: 23:00 – 07:00 (configurable in `config.yaml`)
- **Effect**: Adds rewrite prompt for concise responses
- **Purpose**: Reduce agent activity during off-hours

### 3. Agent Mapping
- **Default Agents**: Defined per microDAO in `config.yaml`
- **Channel Override**: Channels can specify `allowed_agents`
- **Fallback**: If no agent found, deny

### 4. Disabled Agents
- **Check**: Ensures target agent is not in `disabled_agents` list
- **Source**: From channel context

## API

### Health Check
```http
GET /health

Response:
{
  "status": "ok",
  "service": "agent-filter",
  "version": "1.0.0",
  "nats_connected": true
}
```

### Test Filtering (Manual)
```http
POST /internal/agent-filter/test
Content-Type: application/json

{
  "channel_id": "test-channel-id",
  "matrix_event_id": "$event123:matrix.daarion.city",
  "sender_id": "user:93",
  "sender_type": "human",
  "microdao_id": "microdao:daarion",
  "created_at": "2025-11-24T12:00:00Z"
}

Response:
{
  "channel_id": "test-channel-id",
  "matrix_event_id": "$event123:matrix.daarion.city",
  "microdao_id": "microdao:daarion",
  "decision": "allow",
  "target_agent_id": "agent:sofia"
}
```

## Configuration

**File**: `config.yaml`

```yaml
nats:
  servers: ["nats://nats:4222"]
  messaging_subject: "messaging.message.created"
  decision_subject: "agent.filter.decision"

rules:
  quiet_hours:
    start: "23:00"
    end: "07:00"
  
  default_agents:
    "microdao:daarion": "agent:sofia"
    "microdao:7": "agent:sofia"
```

## Environment Variables

- `MESSAGING_SERVICE_URL`: URL of messaging-service (default: `http://messaging-service:7004`)
- `NATS_URL`: NATS server URL (default: `nats://nats:4222`)

## Running Locally

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Run Service
```bash
uvicorn main:app --reload --port 7005
```

### Test
```bash
# Health check
curl http://localhost:7005/health

# Test filtering
curl -X POST http://localhost:7005/internal/agent-filter/test \
  -H "Content-Type: application/json" \
  -d '{
    "channel_id": "test-123",
    "matrix_event_id": "$test:matrix.daarion.city",
    "sender_id": "user:1",
    "sender_type": "human",
    "microdao_id": "microdao:daarion",
    "created_at": "2025-11-24T12:00:00Z"
  }'
```

## Docker

### Build
```bash
docker build -t daarion/agent-filter:latest .
```

### Run
```bash
docker run -p 7005:7005 \
  -e MESSAGING_SERVICE_URL=http://messaging-service:7004 \
  -e NATS_URL=nats://nats:4222 \
  daarion/agent-filter:latest
```

## NATS Events

### Subscribes To
- **Subject**: `messaging.message.created`
- **Payload**: `MessageCreatedEvent`
```json
{
  "channel_id": "uuid",
  "message_id": "uuid",
  "matrix_event_id": "$event:server",
  "sender_id": "user:X or agent:Y",
  "sender_type": "human | agent",
  "microdao_id": "microdao:X",
  "created_at": "2025-11-24T12:00:00Z"
}
```

### Publishes To
- **Subject**: `agent.filter.decision`
- **Payload**: `FilterDecision`
```json
{
  "channel_id": "uuid",
  "message_id": "uuid",
  "matrix_event_id": "$event:server",
  "microdao_id": "microdao:X",
  "decision": "allow | deny | modify",
  "target_agent_id": "agent:sofia",
  "rewrite_prompt": "Optional prompt modification"
}
```

## Development

### Adding New Rules

Edit `rules.py`:

```python
def decide(self, event: MessageCreatedEvent, ctx: FilterContext) -> FilterDecision:
    # Add your rule here
    if some_condition:
        return FilterDecision(
            decision="deny",
            # ... other fields
        )
    
    # Continue with existing rules
    ...
```

### Testing Rules

Use the test endpoint:

```bash
curl -X POST http://localhost:7005/internal/agent-filter/test \
  -H "Content-Type: application/json" \
  -d @test_event.json
```

## Monitoring

### Logs

```bash
# Docker
docker logs -f agent-filter

# Look for:
# ✅ Connected to NATS
# ✅ Subscribed to messaging.message.created
# 📨 Received message.created event
# 🎯 Decision: allow/deny/modify
# ✅ Published decision to NATS
```

### Metrics (Future)

- Total messages processed
- Decisions per type (allow/deny/modify)
- Average processing time
- NATS connection status

## Troubleshooting

### NATS Not Connected

```
⚠️ NATS not available: [error]
⚠️ Running in test mode (HTTP only)
```

**Solution**: Check NATS is running and accessible:
```bash
docker ps | grep nats
docker logs nats
```

### No Decisions Published

**Check**:
1. Is messaging-service publishing events?
2. Is channel context endpoint working?
3. Are rules correctly configured?

```bash
# Test channel context
curl http://localhost:7004/internal/messaging/channels/{channel_id}/context
```

### Always Denying

**Common causes**:
1. Sender is agent (loop prevention)
2. No target agent found
3. Target agent is disabled
4. Channel context not accessible

**Debug**: Use test endpoint and check logs

## Future Enhancements

- [ ] Keyword-based triggers ("@sofia", "@assistant")
- [ ] Per-user permissions
- [ ] Rate limiting per agent
- [ ] Sentiment analysis for filtering
- [ ] ML-based spam detection
- [ ] Custom rule scripting (Lua/Python)

## Version

**Current**: 1.0.0  
**Status**: Production Ready  
**Last Updated**: 2025-11-24





