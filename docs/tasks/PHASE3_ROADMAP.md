# PHASE 3 ROADMAP — Core Agent Services

**After Phase 2 Agent Integration**

**Status:** 📋 Planning → ✅ SPEC READY  
**Master Task:** [PHASE3_MASTER_TASK.md](PHASE3_MASTER_TASK.md) ⭐  
**Summary:** [PHASE3_READY.md](../../PHASE3_READY.md)  
**Priority:** High  
**Estimated Time:** 6-8 weeks  
**Dependencies:** Phase 2 complete

---

## 🎯 Goal

Replace Phase 2 stubs with production-ready services:
- Real LLM Proxy (multi-provider routing)
- Real Agent Memory (RAG + vector DB)
- Tool Registry (agent actions)
- Agent Blueprint Management (CRUD + versioning)

---

## 📦 Phase 3 Components

### 1. LLM Proxy Service (2 weeks)

**Purpose:** Centralized LLM gateway with routing, rate limiting, cost tracking

**Features:**
- Multi-provider support (OpenAI, Anthropic, DeepSeek, Local)
- Model selection & routing
- Rate limiting per agent/microDAO
- Cost tracking & billing
- Streaming support
- Error handling & retries
- Prompt sanitization

**API:**
```http
POST /internal/llm/proxy
{
  "model": "gpt-4",
  "messages": [...],
  "stream": false,
  "max_tokens": 1000,
  "agent_id": "agent:sofia",
  "microdao_id": "microdao:daarion"
}

GET /internal/llm/models
→ List available models

GET /internal/llm/usage?agent_id=agent:sofia&period=30d
→ Usage statistics
```

**Tech Stack:**
- FastAPI
- httpx for provider calls
- Redis for rate limiting
- PostgreSQL for usage tracking

**Files:**
```
services/llm-proxy/
├── main.py
├── providers/
│   ├── openai.py
│   ├── anthropic.py
│   ├── deepseek.py
│   └── local.py
├── routing.py
├── rate_limiter.py
├── cost_tracker.py
├── models.py
└── config.yaml
```

---

### 2. Agent Memory Service (2 weeks)

**Purpose:** Persistent memory + RAG for agents

**Features:**
- Short-term memory (recent context)
- Mid-term memory (session/task memory)
- Long-term memory (knowledge base)
- Vector search (RAG)
- Memory indexing (from channel history)
- Memory pruning (for cost/performance)
- Per-agent & per-microDAO isolation

**API:**
```http
POST /internal/agent-memory/query
{
  "agent_id": "agent:sofia",
  "microdao_id": "microdao:daarion",
  "query": "What did we discuss about Phase 2?",
  "k": 5,
  "memory_types": ["mid_term", "long_term"]
}
→ Top-k relevant memories

POST /internal/agent-memory/store
{
  "agent_id": "agent:sofia",
  "microdao_id": "microdao:daarion",
  "memory_type": "mid_term",
  "content": {
    "user_message": "...",
    "agent_reply": "...",
    "context": {...}
  }
}
→ Store new memory

GET /internal/agent-memory/agents/{agent_id}/stats
→ Memory usage stats
```

**Tech Stack:**
- FastAPI
- PostgreSQL (structured memory)
- Qdrant/Weaviate/ChromaDB (vector DB for RAG)
- LangChain/LlamaIndex (RAG helpers)

**Files:**
```
services/agent-memory/
├── main.py
├── vector_store.py
├── memory_manager.py
├── rag_engine.py
├── indexer.py
├── models.py
└── config.yaml
```

---

### 3. Tool Registry Service (1.5 weeks)

**Purpose:** Centralized tool definitions & execution for agents

**Features:**
- Tool catalog (list all available tools)
- Tool execution (secure sandbox)
- Tool permissions (agent → tool mapping)
- Tool versioning
- Execution logs & auditing

**Tools (initial set):**
- `create_task(channel_id, title, description)`
- `create_followup(user_id, message_id, reminder_text, due_date)`
- `search_docs(query)`
- `create_project(microdao_id, name, description)`
- `summarize_channel(channel_id, period)`
- `send_notification(user_id, text)`

**API:**
```http
GET /internal/tools/catalog
→ List all tools

POST /internal/tools/execute
{
  "tool_name": "create_task",
  "agent_id": "agent:sofia",
  "microdao_id": "microdao:daarion",
  "parameters": {
    "channel_id": "...",
    "title": "Review Phase 2",
    "description": "..."
  }
}
→ Execute tool, return result

GET /internal/tools/agents/{agent_id}/permissions
→ List tools agent can use
```

**Tech Stack:**
- FastAPI
- Dynamic tool loading (plugins)
- Sandboxed execution (Docker/gVisor)
- PostgreSQL (tool definitions, permissions, logs)

**Files:**
```
services/tool-registry/
├── main.py
├── catalog.py
├── executor.py
├── sandbox.py
├── permissions.py
├── tools/
│   ├── task_tools.py
│   ├── project_tools.py
│   ├── notification_tools.py
│   └── ...
└── config.yaml
```

---

### 4. Agent Blueprint Service (1 week)

**Purpose:** CRUD + versioning for agent definitions

**Features:**
- Create/Read/Update/Delete agent blueprints
- Blueprint versioning
- Blueprint templates (archetypes)
- Blueprint validation
- Blueprint inheritance

**API:**
```http
GET /internal/agents/blueprints
→ List all blueprints

POST /internal/agents/blueprints
{
  "code": "sofia_prime_v2",
  "name": "Sofia Prime v2",
  "model": "gpt-4.1",
  "instructions": "...",
  "capabilities": {...},
  "tools": ["create_task", "summarize_channel"]
}
→ Create blueprint

GET /internal/agents/blueprints/{blueprint_id}
→ Get blueprint

GET /internal/agents/{agent_id}/blueprint
→ Get blueprint for specific agent instance

PUT /internal/agents/blueprints/{blueprint_id}
→ Update blueprint (creates new version)
```

**Tech Stack:**
- FastAPI
- PostgreSQL (blueprints, versions)
- YAML/JSON schema validation

**Files:**
```
services/agents-service/
├── main.py
├── blueprints/
│   ├── crud.py
│   ├── versioning.py
│   ├── validation.py
│   └── templates.py
├── models.py
└── config.yaml
```

---

### 5. Integration Updates (1 week)

**Update agent-runtime to use real services:**

```python
# Before (Phase 2):
blueprint = await load_agent_blueprint(agent_id)  # Mock
memory = await query_memory(...)  # Stub
llm_response = await generate_response(...)  # Stub

# After (Phase 3):
blueprint = await agents_service.get_blueprint(agent_id)  # Real
memory = await memory_service.query(...)  # Real RAG
llm_response = await llm_proxy.generate(...)  # Real multi-provider

# NEW: Tool usage
if llm_suggests_tool_use:
    tool_result = await tool_registry.execute(tool_name, parameters)
    # Add tool result to context, call LLM again
```

---

## 📅 Timeline

### Week 1-2: LLM Proxy
- Week 1: Core routing + OpenAI provider
- Week 2: Multi-provider + rate limiting + cost tracking

### Week 3-4: Agent Memory
- Week 3: Vector store setup + basic RAG
- Week 4: Memory management + indexing

### Week 5-6: Tool Registry
- Week 5: Catalog + basic tools (task, followup)
- Week 6: Executor + permissions + sandboxing

### Week 7: Agent Blueprint Service
- CRUD + versioning + validation

### Week 8: Integration & Testing
- Update agent-runtime
- E2E testing
- Performance optimization
- Documentation

---

## 🧪 Testing Strategy

### LLM Proxy Testing:
- Unit: Each provider (OpenAI, Anthropic, etc.)
- Integration: Rate limiting, cost tracking
- Load: 100 concurrent requests
- Failover: Provider unavailable scenarios

### Agent Memory Testing:
- RAG accuracy: Retrieve relevant memories
- Memory indexing: Auto-index from channels
- Vector search performance: < 500ms
- Memory pruning: Clean old memories

### Tool Registry Testing:
- Tool execution: All tools work
- Permissions: Agent cannot use unauthorized tools
- Sandboxing: Tools cannot escape sandbox
- Audit logs: All executions logged

### E2E Testing:
- User asks agent to create task → Task created
- User asks agent to summarize → Summary posted
- Agent uses memory correctly in replies
- Multiple providers work (switch between OpenAI/DeepSeek)

---

## 🎯 Acceptance Criteria

### Phase 3 Complete When:
- ✅ LLM Proxy supports 3+ providers
- ✅ Agent Memory RAG works (< 500ms queries)
- ✅ Tool Registry has 5+ working tools
- ✅ Agent Blueprint CRUD works
- ✅ agent-runtime integrated with all services
- ✅ E2E: User → Agent (with tool use) → Result
- ✅ Cost tracking shows LLM usage per agent
- ✅ Memory usage shows per agent/microDAO
- ✅ All services pass health checks
- ✅ Documentation complete

---

## 📊 Success Metrics

| Metric | Target |
|--------|--------|
| LLM response time | < 2s (non-streaming) |
| Memory query time | < 500ms |
| Tool execution time | < 3s |
| E2E agent reply | < 5s (with tool use) |
| LLM cost per request | < $0.05 |
| System uptime | > 99.5% |

---

## 🔗 Dependencies

### External Services:
- OpenAI API (for GPT-4)
- Anthropic API (for Claude, optional)
- DeepSeek API (optional)
- Qdrant/Weaviate (for vector DB)

### Internal Services:
- PostgreSQL (for all structured data)
- Redis (for rate limiting, caching)
- NATS (for events)

---

## 💡 Optional Enhancements (Phase 3.5)

### LLM Proxy:
- Streaming SSE support
- Local model support (Ollama, vLLM)
- Prompt caching
- A/B testing for prompts

### Agent Memory:
- Hierarchical memory (microDAO → team → agent)
- Memory sharing between agents
- Memory snapshots (save/restore agent state)
- Memory analytics dashboard

### Tool Registry:
- Tool marketplace (community tools)
- Tool composition (chain tools)
- Visual tool builder
- Tool usage analytics

---

## 🚀 Quick Start (After Phase 2)

### To prepare for Phase 3:

```bash
# 1. Review Phase 3 roadmap
cat docs/tasks/PHASE3_ROADMAP.md

# 2. Set up external services
# - Get OpenAI API key
# - Set up Qdrant (Docker or cloud)
# - Set up Redis

# 3. Start with LLM Proxy
mkdir -p services/llm-proxy
cd services/llm-proxy
# Follow PHASE3_LLM_PROXY_TASK.md (to be created)
```

---

## 📝 Task Files (To Be Created)

After Phase 2 complete, create detailed tasks:

1. **TASK_PHASE3_LLM_PROXY.md** (2 weeks)
2. **TASK_PHASE3_AGENT_MEMORY.md** (2 weeks)
3. **TASK_PHASE3_TOOL_REGISTRY.md** (1.5 weeks)
4. **TASK_PHASE3_BLUEPRINT_SERVICE.md** (1 week)
5. **TASK_PHASE3_INTEGRATION.md** (1 week)

---

## 🎓 Architecture Evolution

### Phase 1 (Complete):
```
User → Frontend → messaging-service → Matrix → Frontend
```

### Phase 2 (Current):
```
User → Messenger → agent_filter → Router → agent-runtime (stub) → Reply
```

### Phase 3 (Target):
```
User → Messenger
    ↓
agent_filter → Router → agent-runtime
    ↓
├─ LLM Proxy → [OpenAI | Anthropic | DeepSeek]
├─ Agent Memory → [Vector DB | PostgreSQL]
├─ Tool Registry → [Task | Project | Notification tools]
└─ Agent Blueprint → [Definitions | Versions]
    ↓
Reply with tool results
```

---

## ✅ Current Status

- ✅ Phase 1: Messenger Core (Complete)
- 📋 Phase 2: Agent Integration (In Progress)
- 📋 Phase 3: Core Services (This Roadmap)
- 🔜 Phase 4: Advanced Features (TBD)

---

**Ready for Phase 3?**

First complete Phase 2, then return to this roadmap for detailed implementation tasks.

---

**Version:** 1.0.0  
**Date:** 2025-11-24  
**Status:** Planning

