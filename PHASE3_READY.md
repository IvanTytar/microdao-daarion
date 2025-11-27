# 🚀 PHASE 3 READY — LLM Proxy + Memory + Tools

**Status:** 📋 Ready to implement  
**Dependencies:** Phase 2 complete ✅  
**Estimated Time:** 6-8 weeks  
**Priority:** High

---

## 🎯 Goal

Зробити агентів DAARION по-справжньому розумними:
- **LLM Proxy** — єдина точка для всіх LLM запитів (OpenAI, DeepSeek, Local)
- **Memory Orchestrator** — єдиний API для short/mid/long-term памʼяті
- **Toolcore** — реєстр інструментів + безпечне виконання

**Phase 3 = Infrastructure for Agent Intelligence**

---

## 📦 What Will Be Built

### 1. LLM Proxy Service
**Port:** 7007  
**Purpose:** Unified LLM gateway

**Features:**
- ✅ Multi-provider support (OpenAI, DeepSeek, Local)
- ✅ Model routing (logical → physical models)
- ✅ Usage logging (tokens, latency per agent)
- ✅ Rate limiting per agent
- ✅ Cost tracking hooks

**API:**
```http
POST /internal/llm/proxy
{
  "model": "gpt-4.1-mini",
  "messages": [...],
  "metadata": { "agent_id": "...", "microdao_id": "..." }
}
```

**Deliverables:** 10 files
- `main.py`, `models.py`, `router.py`
- `providers/` (OpenAI, DeepSeek, Local)
- `config.yaml`, `Dockerfile`, `README.md`

---

### 2. Memory Orchestrator Service
**Port:** 7008  
**Purpose:** Unified memory API

**Features:**
- ✅ Short-term memory (channel context)
- ✅ Mid-term memory (agent RAG)
- ✅ Long-term memory (knowledge base)
- ✅ Vector search (embeddings)
- ✅ Memory indexing pipeline

**API:**
```http
POST /internal/agent-memory/query
{
  "agent_id": "agent:sofia",
  "microdao_id": "microdao:7",
  "query": "What were recent changes?",
  "limit": 5
}

POST /internal/agent-memory/store
{
  "agent_id": "...",
  "content": { "user_message": "...", "agent_reply": "..." }
}
```

**Deliverables:** 9 files
- `main.py`, `models.py`, `router.py`
- `backends/` (PostgreSQL, Vector Store, KB)
- `embedding_client.py`, `config.yaml`, `README.md`

---

### 3. Toolcore Service
**Port:** 7009  
**Purpose:** Tool registry + execution

**Features:**
- ✅ Tool registry (config-based → DB-backed later)
- ✅ Permission checks (agent → tool mapping)
- ✅ HTTP executor (call external services)
- ✅ Python executor (optional, for internal functions)
- ✅ Error handling + timeouts

**API:**
```http
GET /internal/tools
→ List available tools

POST /internal/tools/call
{
  "tool_id": "projects.list",
  "agent_id": "agent:sofia",
  "args": { "microdao_id": "microdao:7" }
}
```

**Deliverables:** 8 files
- `main.py`, `models.py`, `registry.py`
- `executors/` (HTTP, Python)
- `config.yaml`, `Dockerfile`, `README.md`

---

## 🔄 Updated Architecture

### Before (Phase 2):
```
agent-runtime:
  - Mock LLM responses
  - Optional memory
  - No tools
```

### After (Phase 3):
```
agent-runtime:
  ↓
  ├─ LLM Proxy → [OpenAI | DeepSeek | Local]
  ├─ Memory Orchestrator → [Vector DB | PostgreSQL]
  └─ Toolcore → [projects.list | task.create | ...]
```

---

## 🎯 Acceptance Criteria

### LLM Proxy:
- ✅ 2+ providers working (e.g., OpenAI + Local stub)
- ✅ Model routing from config
- ✅ Usage logging per agent
- ✅ Health checks pass

### Memory Orchestrator:
- ✅ Query returns relevant memories
- ✅ Store saves new memories
- ✅ Vector search works (simple cosine)
- ✅ agent-runtime integration

### Toolcore:
- ✅ Tool registry loaded from config
- ✅ 1+ tool working (e.g., projects.list)
- ✅ Permission checks work
- ✅ HTTP executor functional

### E2E:
- ✅ Agent uses real LLM (not mock)
- ✅ Agent uses memory (RAG)
- ✅ Agent can call tools
- ✅ Full flow: User → Agent (with tool) → Reply

---

## 📅 Timeline

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1-2 | LLM Proxy | Service + 2 providers |
| 3-4 | Memory Orchestrator | Service + vector search |
| 5-6 | Toolcore | Service + 1 tool |
| 7 | Integration | Update agent-runtime |
| 8 | Testing | E2E + optimization |

**Total:** 8 weeks (6-8 weeks realistic)

---

## 🚀 How to Start

### Option 1: Cursor AI

```bash
# Copy Phase 3 master task
cat docs/tasks/PHASE3_MASTER_TASK.md | pbcopy

# Paste into Cursor AI
# Wait for implementation (~1-2 hours per service)
```

### Option 2: Manual

```bash
# 1. Start with LLM Proxy
mkdir -p services/llm-proxy
cd services/llm-proxy
# Follow PHASE3_MASTER_TASK.md

# 2. Then Memory Orchestrator
mkdir -p services/memory-orchestrator
# ...

# 3. Then Toolcore
mkdir -p services/toolcore
# ...
```

---

## 🔗 Key Files

### Specification:
- [PHASE3_MASTER_TASK.md](docs/tasks/PHASE3_MASTER_TASK.md) ⭐ **Main task**
- [PHASE3_ROADMAP.md](docs/tasks/PHASE3_ROADMAP.md) — Detailed planning

### Phase 2 (Complete):
- [PHASE2_COMPLETE.md](PHASE2_COMPLETE.md) — What's already built
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

---

## 💡 Key Concepts

### LLM Proxy:
- **Logical models** (gpt-4.1-mini) → **Physical providers** (OpenAI API)
- Routing via config
- Cost tracking per agent
- Graceful fallbacks

### Memory Orchestrator:
- **Short-term:** Recent channel messages
- **Mid-term:** RAG embeddings (conversations, tasks)
- **Long-term:** Knowledge base (docs, roadmaps)
- Vector search for relevance

### Toolcore:
- **Static registry** (config.yaml) → **Dynamic registry** (DB) later
- **HTTP executor:** Call external services
- **Permission model:** Agent → Tool allowlist
- **Error handling:** Timeouts, retries

---

## 📊 Service Ports

| Service | Port | Purpose |
|---------|------|---------|
| messaging-service | 7004 | REST + WebSocket |
| agent-filter | 7005 | Filtering |
| agent-runtime | 7006 | Agent execution |
| **llm-proxy** | **7007** | **LLM gateway** ✨ |
| **memory-orchestrator** | **7008** | **Memory API** ✨ |
| **toolcore** | **7009** | **Tool execution** ✨ |
| router | 8000 | Event routing |

---

## 🎓 What You'll Learn

### Technologies:
- LLM API integration (OpenAI, DeepSeek)
- Vector embeddings + similarity search
- Tool execution patterns
- Provider abstraction
- Cost tracking
- Rate limiting

### Architecture:
- Gateway pattern (LLM Proxy)
- Orchestrator pattern (Memory)
- Registry pattern (Toolcore)
- Multi-provider routing
- Graceful degradation

---

## 🐛 Expected Challenges

### LLM Proxy:
- API key management
- Rate limits from providers
- Cost control
- Streaming support (Phase 3.5)

**Mitigation:**
- Environment variables for keys
- In-memory rate limiting
- Usage logging
- Streaming as TODO

### Memory Orchestrator:
- Vector search performance
- Embedding generation latency
- Memory indexing pipeline
- Relevance tuning

**Mitigation:**
- Simple cosine similarity first
- Async embedding generation
- Background indexing jobs
- A/B testing for relevance

### Toolcore:
- Tool permission model
- Execution sandboxing
- Error handling
- Tool discovery

**Mitigation:**
- Config-based permissions v1
- HTTP executor with timeouts
- Comprehensive error types
- Static registry → DB later

---

## 🔜 After Phase 3

### Phase 3.5 (Optional Enhancements):
- Streaming LLM responses
- Advanced memory strategies
- Tool composition
- Agent-to-agent communication

### Phase 4 (Next Major):
- Usage & Billing system
- Security (PDP/PEP)
- Advanced monitoring
- Agent marketplace

---

## ✅ Checklist Before Starting

### Prerequisites:
- ✅ Phase 2 complete and tested
- ✅ NATS running
- ✅ PostgreSQL running
- ✅ Docker Compose working
- ✅ OpenAI API key (optional, can use local)

### Recommended:
- Local LLM setup (Ollama/vLLM) for testing
- Vector DB exploration (pgvector extension)
- Review existing tools in your stack

---

## 🎉 Success Looks Like

**After Phase 3:**
- ✅ Agent Sofia uses real GPT-4 (not mock)
- ✅ Agent remembers past conversations (RAG)
- ✅ Agent can list projects (tool execution)
- ✅ All flows < 5s latency
- ✅ Usage tracked per agent
- ✅ Production ready

**Example Flow:**
```
User: "Sofia, що нового в проєкті X?"
    ↓
agent-runtime:
  1. Query memory (past discussions about project X)
  2. Call tool: projects.list(microdao_id)
  3. Build prompt with context + tool results
  4. Call LLM Proxy (GPT-4)
  5. Post reply
    ↓
Sofia: "В проєкті X є 3 нові задачі:
1. Завершити Phase 2 тестування
2. Почати Phase 3 LLM integration
3. Оновити документацію
Останнє оновлення було вчора."
```

---

## 📞 Next Actions

### This Week:
1. ✅ Review PHASE3_MASTER_TASK.md
2. ✅ Decide: Cursor AI or manual
3. ✅ Set up OpenAI API key (or local LLM)
4. ✅ Review tool requirements

### Next Week:
1. 🔜 Start LLM Proxy implementation
2. 🔜 Test with 2 providers
3. 🔜 Integrate with agent-runtime

---

**Status:** 📋 ALL SPECS READY  
**Version:** 1.0.0  
**Last Updated:** 2025-11-24

**READY TO BUILD PHASE 3!** 🚀





