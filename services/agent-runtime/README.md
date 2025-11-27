# Agent Runtime Service

**Executes agent logic: reads context, calls LLM, posts replies**

## Purpose

Agent Runtime is the execution engine for DAARION agents. It processes agent invocations by:
1. Loading agent blueprints
2. Reading channel history for context
3. Querying agent memory (RAG)
4. Building prompts for LLM
5. Generating responses
6. Posting back to channels
7. Storing interactions in memory

## Architecture

```
router.invoke.agent (NATS)
    ↓
agent-runtime: Execute Agent Logic
    ↓
├─ Load Blueprint
├─ Read Channel History
├─ Query Memory (RAG)
├─ Call LLM
└─ Post Reply
    ↓
messaging-service → Matrix → Frontend
```

## Features

- **NATS Integration**: Subscribes to `router.invoke.agent`
- **Context Loading**: Fetches last 50 messages from channel
- **Memory Integration**: Queries agent memory for relevant context
- **LLM Integration**: Calls LLM Proxy with full context
- **Mock LLM**: Falls back to mock responses when LLM Proxy unavailable (Phase 2)
- **Message Posting**: Posts replies via messaging-service
- **Memory Writeback**: Stores interactions for future RAG

## API

### Health Check
```http
GET /health

Response:
{
  "status": "ok",
  "service": "agent-runtime",
  "version": "1.0.0",
  "nats_connected": true
}
```

### Test Invocation (Manual)
```http
POST /internal/agent-runtime/test-channel
Content-Type: application/json

{
  "agent_id": "agent:sofia",
  "entrypoint": "channel_message",
  "payload": {
    "channel_id": "7c72d497-27aa-4e75-bb2f-4a4a21d4f91f",
    "microdao_id": "microdao:daarion",
    "rewrite_prompt": null
  }
}

Response:
{
  "status": "processed",
  "agent_id": "agent:sofia"
}
```

## Configuration

**File**: `config.yaml`

```yaml
nats:
  servers: ["nats://nats:4222"]
  invocation_subject: "router.invoke.agent"

services:
  messaging: "http://messaging-service:7004"
  agent_memory: "http://agent-memory:7008"
  llm_proxy: "http://llm-proxy:7007"

llm:
  default_model: "gpt-4"
  max_tokens: 1000
  temperature: 0.7

memory:
  query_top_k: 5
  enable_writeback: true
```

## Environment Variables

- `NATS_URL`: NATS server URL (default: `nats://nats:4222`)
- `MESSAGING_SERVICE_URL`: messaging-service URL (default: `http://messaging-service:7004`)
- `AGENT_MEMORY_URL`: agent-memory URL (default: `http://agent-memory:7008`)
- `LLM_PROXY_URL`: LLM Proxy URL (default: `http://llm-proxy:7007`)

## Running Locally

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Run Service
```bash
uvicorn main:app --reload --port 7006
```

### Test
```bash
# Health check
curl http://localhost:7006/health

# Test invocation
curl -X POST http://localhost:7006/internal/agent-runtime/test-channel \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent:sofia",
    "entrypoint": "channel_message",
    "payload": {
      "channel_id": "7c72d497-27aa-4e75-bb2f-4a4a21d4f91f",
      "microdao_id": "microdao:daarion"
    }
  }'
```

## Docker

### Build
```bash
docker build -t daarion/agent-runtime:latest .
```

### Run
```bash
docker run -p 7006:7006 \
  -e MESSAGING_SERVICE_URL=http://messaging-service:7004 \
  -e NATS_URL=nats://nats:4222 \
  daarion/agent-runtime:latest
```

## Agent Execution Flow

### 1. Receive Invocation
From NATS subject `router.invoke.agent`:
```json
{
  "agent_id": "agent:sofia",
  "entrypoint": "channel_message",
  "payload": {
    "channel_id": "uuid",
    "message_id": "uuid",
    "matrix_event_id": "$event:server",
    "microdao_id": "microdao:X",
    "rewrite_prompt": "Optional prompt modification"
  }
}
```

### 2. Load Blueprint
Currently mock (Phase 2), will call `agents-service` in Phase 3:
```python
blueprint = {
  "name": "Sofia-Prime",
  "model": "gpt-4",
  "instructions": "System prompt...",
  "capabilities": {...},
  "tools": ["create_task", "summarize_channel"]
}
```

### 3. Load Context
Fetch last 50 messages from `messaging-service`:
```http
GET /api/messaging/channels/{channel_id}/messages?limit=50
```

### 4. Query Memory
RAG query to `agent-memory`:
```http
POST /internal/agent-memory/query
{
  "agent_id": "agent:sofia",
  "microdao_id": "microdao:daarion",
  "query": "last user message",
  "k": 5
}
```

### 5. Build Prompt
Combine:
- System prompt (from blueprint)
- Rewrite prompt (if quiet hours)
- Memory context (top-K results)
- Recent messages (last 10)

### 6. Generate Response
Call LLM Proxy:
```http
POST /internal/llm/proxy
{
  "model": "gpt-4",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."},
    ...
  ]
}
```

Falls back to mock response if unavailable.

### 7. Post Reply
Post to messaging-service:
```http
POST /internal/agents/{agent_id}/post-to-channel
{
  "channel_id": "uuid",
  "text": "Agent response..."
}
```

### 8. Store Memory
(Optional) Store interaction:
```http
POST /internal/agent-memory/store
{
  "agent_id": "agent:sofia",
  "microdao_id": "microdao:daarion",
  "content": {
    "user_message": "...",
    "agent_reply": "..."
  }
}
```

## Mock LLM (Phase 2)

When LLM Proxy is not available, agent-runtime uses mock responses based on keywords:

- "привіт" / "hello" → Greeting
- "допомож" / "help" → Help menu
- "дяку" / "thank" → Thanks acknowledgment
- "phase 2" → Phase 2 explanation
- "?" → Question response

This allows testing the full flow without real LLM in Phase 2.

## NATS Events

### Subscribes To
- **Subject**: `router.invoke.agent`
- **Payload**: `AgentInvocation`

### Publishes To
None directly (replies via messaging-service HTTP)

## Monitoring

### Logs

```bash
# Docker
docker logs -f agent-runtime

# Look for:
# ✅ Connected to NATS
# ✅ Subscribed to router.invoke.agent
# 🤖 Processing agent invocation
# 📝 Agent: agent:sofia
# ✅ Loaded blueprint
# ✅ Fetched N messages
# 💬 User message: ...
# 🤔 Generating response...
# ✅ Generated response
# ✅ Posted message to channel
# ✅ Agent replied successfully
```

### Metrics (Future)

- Total invocations processed
- Average response time
- LLM calls per agent
- Success/failure rate
- Memory query latency

## Troubleshooting

### Agent Not Responding

**Check logs**:
```bash
docker logs agent-runtime | tail -50
```

**Common issues**:
1. Not receiving invocations from router
2. Cannot fetch channel messages
3. LLM error (check mock fallback)
4. Cannot post to channel

### Cannot Post to Channel

```
❌ HTTP error posting message: 404
   Endpoint not found. You may need to add it to messaging-service.
```

**Solution**: Ensure messaging-service has internal endpoint:
```python
POST /internal/agents/{agent_id}/post-to-channel
```

### Memory Errors

```
⚠️ Agent Memory service not available (Phase 2 - OK)
```

This is expected in Phase 2. Agent continues without memory.

## Phase 2 vs Phase 3

### Phase 2 (Current)
- ✅ NATS subscription
- ✅ Channel history reading
- ✅ Mock LLM responses
- ✅ Message posting
- ⚠️ Mock agent blueprint
- ⚠️ Memory service optional

### Phase 3 (Future)
- Real agent blueprint loading from agents-service
- Real LLM via LLM Proxy (OpenAI, Anthropic, DeepSeek)
- Full RAG with vector DB
- Tool invocation (create_task, etc.)
- Advanced prompt engineering
- Multi-agent coordination

## Development

### Adding New Capabilities

Edit `load_agent_blueprint()` in `main.py`:

```python
async def load_agent_blueprint(agent_id: str) -> AgentBlueprint:
    return AgentBlueprint(
        id=agent_id,
        name="Sofia-Prime",
        model="gpt-4",
        instructions="Your custom instructions...",
        capabilities={
            "can_create_tasks": True,
            "can_use_tools": True,  # NEW
            "can_access_docs": True  # NEW
        },
        tools=["new_tool", ...]  # NEW
    )
```

### Testing Locally

1. Start messaging-service (or mock it)
2. Start NATS (or run in test mode)
3. Run agent-runtime
4. Send test invocation via HTTP

```bash
curl -X POST http://localhost:7006/internal/agent-runtime/test-channel \
  -H "Content-Type: application/json" \
  -d @test_invocation.json
```

## Future Enhancements

- [ ] Tool invocation support
- [ ] Multi-turn conversations
- [ ] Streaming responses
- [ ] Context window management
- [ ] Agent personality customization
- [ ] A/B testing for prompts
- [ ] Agent analytics dashboard

## Version

**Current**: 1.0.0  
**Status**: Production Ready (Phase 2)  
**Last Updated**: 2025-11-24





