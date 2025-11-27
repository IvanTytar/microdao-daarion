# 🚀 START PHASE 2 — Quick Guide

**One-command start for Agent Integration**

---

## ✅ Pre-flight Check

### Phase 1 Status:
- ✅ Messenger Module complete
- ✅ messaging-service running
- ✅ matrix-gateway spec ready
- ✅ Database schema created
- ✅ Frontend /messenger working

### What we're building:
- 🔜 agent-filter service
- 🔜 DAGI Router extension
- 🔜 agent-runtime service

---

## 🎯 Option A: Use Cursor AI (RECOMMENDED)

### Step 1: Copy Master Task

```bash
# Copy entire task file
cat docs/tasks/PHASE2_MASTER_TASK.md | pbcopy

# Or open in Cursor
code docs/tasks/PHASE2_MASTER_TASK.md
```

### Step 2: Paste into Cursor

1. Open Cursor AI chat
2. Paste entire PHASE2_MASTER_TASK.md
3. Press Enter
4. Let Cursor implement step-by-step

### Step 3: Review & Test

```bash
# After Cursor completes, start services
docker-compose -f docker-compose.agents.yml up -d

# Check health
curl http://localhost:7005/health  # agent-filter
curl http://localhost:7006/health  # agent-runtime
```

---

## 🛠️ Option B: Manual Implementation

### Step 1: Create agent-filter

```bash
mkdir -p services/agent-filter
cd services/agent-filter

# Copy specs from PHASE2_MASTER_TASK.md
# Create files:
touch main.py models.py rules.py config.yaml
touch Dockerfile requirements.txt README.md

# Implement according to specs
```

### Step 2: Extend Router

```bash
cd services/router  # or wherever router lives

# Add filter decision subscription
# Add AgentInvocation creation
# Add test endpoint
```

### Step 3: Create agent-runtime

```bash
mkdir -p services/agent-runtime
cd services/agent-runtime

# Copy specs from PHASE2_MASTER_TASK.md
# Create files:
touch main.py models.py llm_client.py messaging_client.py memory_client.py
touch config.yaml Dockerfile requirements.txt README.md

# Implement according to specs
```

### Step 4: Docker Integration

```bash
# Create docker-compose.agents.yml
# Update docker-compose.messenger.yml
# Add networking
```

---

## 🧪 Testing Phase 2

### Test 1: agent-filter alone

```bash
cd services/agent-filter
pip install -r requirements.txt
uvicorn main:app --reload --port 7005

# In another terminal:
curl -X POST http://localhost:7005/internal/agent-filter/test \
  -H "Content-Type: application/json" \
  -d '{
    "channel_id": "test-123",
    "matrix_event_id": "$event123:matrix.daarion.city",
    "sender_id": "user:1",
    "sender_type": "human",
    "microdao_id": "microdao:daarion",
    "created_at": "2025-11-24T10:00:00Z"
  }'

# Expected: {"decision": "allow", "target_agent_id": "agent:sofia", ...}
```

### Test 2: Router extension

```bash
# Start router (or extend existing)
cd services/router
# Test routing logic

curl -X POST http://localhost:8000/internal/router/test-messaging \
  -H "Content-Type: application/json" \
  -d '{
    "channel_id": "test-123",
    "matrix_event_id": "$event123",
    "microdao_id": "microdao:daarion",
    "decision": "allow",
    "target_agent_id": "agent:sofia"
  }'

# Expected: {"agent_id": "agent:sofia", "entrypoint": "channel_message", ...}
```

### Test 3: agent-runtime alone

```bash
cd services/agent-runtime
pip install -r requirements.txt
uvicorn main:app --reload --port 7006

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

# Expected: Agent processes and posts reply
```

### Test 4: E2E Flow

```bash
# Start all services
docker-compose -f docker-compose.messenger.yml up -d
docker-compose -f docker-compose.agents.yml up -d

# Send message in Messenger UI
# Open http://localhost:8899/messenger
# Type "Hello, Sofia!"

# Expected flow:
# 1. Message appears in UI (Phase 1)
# 2. agent_filter processes (Phase 2)
# 3. Router routes to agent-runtime (Phase 2)
# 4. Agent replies (Phase 2)
# 5. Reply appears in UI (Phase 1)

# Check logs:
docker logs agent-filter
docker logs agent-runtime
docker logs messaging-service
```

---

## 📊 Progress Tracking

### Week 1: agent-filter
- [ ] Day 1-2: Service skeleton
- [ ] Day 3: Rules engine
- [ ] Day 4: NATS integration
- [ ] Day 5: Testing

### Week 2: Router
- [ ] Day 1-2: Extension implementation
- [ ] Day 3: NATS subscription
- [ ] Day 4-5: Integration testing

### Week 3-4: agent-runtime
- [ ] Day 1-3: Service skeleton + messaging client
- [ ] Day 4-6: Memory integration
- [ ] Day 7-8: LLM integration
- [ ] Day 9-10: E2E testing

---

## 🎓 Key Concepts

### NATS Flow:
```
messaging.message.created    (messaging-service publishes)
    ↓
agent.filter.decision        (agent-filter publishes)
    ↓
router.invoke.agent          (router publishes)
    ↓
(agent-runtime subscribes)
```

### Service Ports:
- `7004` — messaging-service
- `7005` — agent-filter (new)
- `7006` — agent-runtime (new)
- `7007` — llm-proxy (stub for now)
- `7008` — agent-memory (stub for now)

---

## 🆘 Troubleshooting

### agent-filter not receiving events?
```bash
# Check NATS connection
docker exec -it nats nats sub "messaging.message.created"

# Check messaging-service is publishing
docker logs messaging-service | grep NATS
```

### Router not routing?
```bash
# Check router logs
docker logs router | grep agent.filter.decision

# Test routing logic directly
curl http://localhost:8000/internal/router/test-messaging
```

### agent-runtime not replying?
```bash
# Check invocation received
docker logs agent-runtime | grep AgentInvocation

# Check LLM call
docker logs agent-runtime | grep LLM

# Check posting to channel
docker logs agent-runtime | grep post-to-channel
```

---

## 🔗 Key Files

### Specifications:
- [PHASE2_MASTER_TASK.md](./docs/tasks/PHASE2_MASTER_TASK.md) — Complete implementation guide
- [MESSAGING_ARCHITECTURE.md](./docs/MESSAGING_ARCHITECTURE.md) — Technical deep dive

### Phase 1 (Complete):
- [MESSENGER_MODULE_COMPLETE.md](./docs/MESSENGER_MODULE_COMPLETE.md)
- `services/messaging-service/`
- `src/features/messenger/`

---

## ✅ Acceptance Checklist

Before marking Phase 2 complete:

- [ ] agent-filter service running
- [ ] agent-filter health check passes
- [ ] agent-filter processes test events
- [ ] Router extension implemented
- [ ] Router routing test passes
- [ ] agent-runtime service running
- [ ] agent-runtime health check passes
- [ ] agent-runtime can fetch channel history
- [ ] agent-runtime can call LLM (mock OK)
- [ ] agent-runtime can post to channel
- [ ] E2E: Human message → Agent reply
- [ ] Reply visible in Messenger UI
- [ ] Reply visible in Element
- [ ] Latency < 5 seconds
- [ ] Docker compose works
- [ ] Documentation updated

---

## 🎉 Next Steps After Phase 2

### Phase 2.5: Agent Hub UI (2 weeks)
- Task: [TASK_AGENT_HUB_MVP.md](./docs/tasks/TASK_AGENT_HUB_MVP.md)
- Route: `/hub`
- 3-column layout: Agents | Chat | Context

### Phase 3: Core Services (4 weeks)
- LLM Proxy implementation
- Agent Memory implementation
- Tool Registry
- Agent Blueprint management

---

**Ready to start?**

```bash
# OPTION A: Copy to Cursor
cat docs/tasks/PHASE2_MASTER_TASK.md | pbcopy

# OPTION B: Manual start
mkdir -p services/agent-filter
cd services/agent-filter
```

**LET'S GO!** 🚀





