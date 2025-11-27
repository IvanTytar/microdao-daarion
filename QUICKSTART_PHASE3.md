# ⚡ QUICKSTART: Phase 3 — LLM + Memory + Tools

**One-task start for real agent intelligence**

---

## 🎯 What Phase 3 Adds

| Before (Phase 2) | After (Phase 3) |
|------------------|-----------------|
| Mock LLM responses | Real GPT-4/DeepSeek/Local |
| No memory | RAG with vector search |
| No tools | Tool execution (projects, tasks, etc.) |

---

## 🚀 One-Command Start

```bash
# Copy Phase 3 master task
cat docs/tasks/PHASE3_MASTER_TASK.md | pbcopy

# Paste into Cursor AI
# Press Enter
# Wait ~2-3 hours
```

**Cursor will create:**
- ✅ llm-proxy (10 files)
- ✅ memory-orchestrator (9 files)
- ✅ toolcore (8 files)
- ✅ docker-compose updates
- ✅ agent-runtime integration

---

## 🔑 Prerequisites

### 1. OpenAI API Key (or Local LLM)

**Option A: OpenAI**
```bash
export OPENAI_API_KEY="sk-..."
```

**Option B: Local LLM (Ollama)**
```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Pull model
ollama pull qwen2.5:8b

# Run server
ollama serve
```

### 2. Vector Database

**Option A: pgvector (PostgreSQL extension)**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**Option B: Simple stub (Phase 3 OK)**
```
# Memory Orchestrator can work with simple PostgreSQL
# Vector search = stub for Phase 3
```

---

## 📦 After Implementation

### Start Services:

```bash
# If using existing start script
./scripts/start-phase2.sh  # Existing services

# Start Phase 3 services
docker-compose -f docker-compose.phase3.yml up -d
```

### Test LLM Proxy:

```bash
curl -X POST http://localhost:7007/internal/llm/proxy \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4.1-mini",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "metadata": {
      "agent_id": "agent:sofia",
      "microdao_id": "microdao:daarion"
    }
  }'

# Expected: Real GPT-4 response!
```

### Test Memory:

```bash
# Query
curl -X POST http://localhost:7008/internal/agent-memory/query \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent:sofia",
    "microdao_id": "microdao:daarion",
    "query": "What did we discuss about Phase 3?",
    "limit": 5
  }'
```

### Test Tools:

```bash
# List tools
curl http://localhost:7009/internal/tools

# Call tool
curl -X POST http://localhost:7009/internal/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "projects.list",
    "agent_id": "agent:sofia",
    "microdao_id": "microdao:daarion",
    "args": {}
  }'
```

---

## 🧪 E2E Test

### In Messenger UI:

**User:** "Sofia, що нового в проєкті DAARION?"

**Expected Agent Flow:**
1. ✅ Query memory (past discussions)
2. ✅ Call tool: projects.list
3. ✅ Build prompt with context
4. ✅ Call real LLM (GPT-4)
5. ✅ Post rich reply

**Sofia:** "В проєкті DAARION є кілька оновлень:
- Phase 2 Agent Integration завершено ✅
- Phase 3 LLM Proxy в розробці 🔄
- Додано 3 нові агенти

Хочете детальніше по якомусь пункту?"

---

## 📊 Service Status

```bash
# Check all Phase 3 services
docker ps | grep -E '(llm-proxy|memory-orchestrator|toolcore)'

# Check health
curl http://localhost:7007/health  # LLM Proxy
curl http://localhost:7008/health  # Memory
curl http://localhost:7009/health  # Toolcore

# Check logs
docker logs -f llm-proxy
docker logs -f memory-orchestrator
docker logs -f toolcore
```

---

## 🎯 Success Indicators

After Phase 3:
- ✅ Agent uses real LLM (not keyword mock)
- ✅ Agent remembers conversations
- ✅ Agent can execute tools
- ✅ Responses are intelligent & contextual
- ✅ Latency still < 5s

---

## 🐛 Troubleshooting

### LLM Proxy not working?

```bash
# Check API key
docker logs llm-proxy | grep "OPENAI_API_KEY"

# Test provider directly
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Memory not working?

```bash
# Check PostgreSQL connection
docker logs memory-orchestrator | grep "PostgreSQL"

# Check embeddings
docker logs memory-orchestrator | grep "embedding"
```

### Tools not working?

```bash
# Check registry loaded
curl http://localhost:7009/internal/tools

# Check permissions
docker logs toolcore | grep "allowed_agents"
```

---

## 📚 Documentation

- [PHASE3_MASTER_TASK.md](docs/tasks/PHASE3_MASTER_TASK.md) — Complete spec
- [PHASE3_READY.md](PHASE3_READY.md) — Overview
- [PHASE3_ROADMAP.md](docs/tasks/PHASE3_ROADMAP.md) — Detailed plan

---

## 🔜 Next Steps

After Phase 3 works:
1. Test with multiple agents
2. Add more tools (task.create, followup.create)
3. Tune memory relevance
4. Optimize LLM costs
5. Monitor usage

---

**Time to Start:** Copy PHASE3_MASTER_TASK.md into Cursor! 🚀

**Questions?** Check [PHASE3_READY.md](PHASE3_READY.md) first.




