# Phase 4: Real-World Rollout & Optimization

**Objective**: Transform DAGI Stack from "deployment-ready" to "battle-tested production system"

**Timeline**: 2-4 weeks after first live deployment  
**Status**: Planned  
**Prerequisites**: Phase 3 complete, first live deployment successful

---

## 🎯 Phase 4 Goals

1. **Production Stability**: 99%+ uptime, predictable performance
2. **Real-world Validation**: 50+ dialogs processed, feedback collected
3. **Performance Optimization**: LLM response < 3s, error rate < 0.5%
4. **Ecosystem Integration**: Dify backend, MCP server ready

---

## 📊 Stage 1: First Live Deploy + Feedback Loop (Week 1)

### 1.1 Deploy to Production

**Actions:**
- [ ] Configure `.env` with production credentials
- [ ] Start services: `docker-compose up -d`
- [ ] Run smoke tests: `./smoke.sh`
- [ ] Set up monitoring cron (every 5 min)
- [ ] Configure log rotation (100MB max)

**Success Criteria:**
- All 5 services healthy
- Smoke tests passing
- First dialog successful (< 5s response)
- No critical errors in logs

**Deliverables:**
- Deployment log file (`/tmp/deploy-$(date).log`)
- First dialog screenshot/transcript
- Baseline metrics file

---

### 1.2 Collect Real Dialogs (5-10 conversations)

**Objective**: Understand real user patterns and pain points

**Data to Collect:**
```json
{
  "dialog_id": "001",
  "timestamp": "2024-11-15T12:00:00Z",
  "user_id": "tg:12345",
  "dao_id": "greenfood-dao",
  "prompts": [
    {
      "text": "Привіт! Що це за DAO?",
      "response_time_ms": 3200,
      "provider": "llm_local_qwen3_8b",
      "rbac_role": "member",
      "status": "success"
    }
  ],
  "insights": {
    "worked_well": "Fast response, context-aware",
    "issues": "None",
    "suggestions": "Add DAO statistics command"
  }
}
```

**Actions:**
- [ ] Monitor logs for incoming requests
- [ ] Document 5-10 real conversations
- [ ] Identify common patterns (greetings, questions, commands)
- [ ] Note slow/failed requests
- [ ] Collect user feedback (if available)

**Save to:** `/tmp/real-dialogs/dialog-001.json`, etc.

---

### 1.3 Analyze Patterns

**Questions to Answer:**
1. What are the most common queries?
2. Which features are unused (DevTools, CrewAI)?
3. What response times are typical?
4. What errors occur in production?
5. What new workflows/tools are needed?

**Analysis Template:**
```markdown
## Dialog Analysis Summary

### Common Queries
- [ ] Greetings (30%)
- [ ] DAO info requests (25%)
- [ ] Role/permission questions (20%)
- [ ] Proposal questions (15%)
- [ ] Other (10%)

### Performance
- Average response time: 3.5s
- P95 response time: 5.2s
- Error rate: 0.2%

### Unused Features
- DevTools: 0 requests
- CrewAI workflows: 1 request (onboarding)

### Improvement Ideas
1. Add /help command with common queries
2. Cache frequent responses (DAO info)
3. Add workflow triggers (e.g., "review my proposal")
```

**Deliverable:** `docs/analysis/real-world-feedback-week1.md`

---

### 1.4 Update SCENARIOS.md

**Actions:**
- [ ] Add "Real World Scenarios" section
- [ ] Document 3-5 actual production dialogs
- [ ] Include response times, RBAC context, outcomes

**Example Entry:**
```markdown
## Real World Scenario #1: DAO Info Request

**Date**: 2024-11-15  
**User**: tg:12345 (member role)  
**Query**: "Що це за DAO і які тут проєкти?"

**Flow:**
1. Gateway receives message (50ms)
2. Router fetches RBAC (80ms)
3. LLM generates response (3200ms)
4. Total: 3330ms

**Response Quality**: ✅ Accurate DAO description  
**Performance**: ✅ Within target (< 5s)  
**User Feedback**: Positive

**Insights:**
- Common query pattern identified
- Consider caching DAO info
- RBAC context useful for personalization
```

---

## ⚡ Stage 2: Performance & Reliability (Week 2)

### 2.1 LLM Performance Optimization

**Problem**: qwen3:8b can timeout on long prompts

**Solutions:**

1. **Token Limits**
   ```yaml
   # router-config.yml
   llm_providers:
     - name: llm_local_qwen3_8b
       config:
         max_tokens: 200  # Reduced from default
         temperature: 0.7
         timeout_ms: 5000
   ```

2. **Retry Policy**
   ```python
   # providers/ollama_provider.py
   @retry(max_attempts=2, delay=1.0)
   async def call_llm(self, prompt: str):
       # LLM call with retry
   ```

3. **Request Queue**
   ```python
   # utils/rate_limiter.py
   class RequestQueue:
       def __init__(self, max_concurrent=3):
           self.semaphore = asyncio.Semaphore(max_concurrent)
       
       async def enqueue(self, request):
           async with self.semaphore:
               return await process_request(request)
   ```

**Actions:**
- [ ] Add `max_tokens` to all LLM providers
- [ ] Implement retry logic (2 attempts, 1s delay)
- [ ] Add request queue (max 3 concurrent)
- [ ] Test with high load (10 concurrent requests)

**Expected Improvement:**
- Response time P95: 5.2s → 4.0s
- Timeout rate: 5% → 1%

---

### 2.2 Production Configuration Profile

**Objective**: Separate dev and prod configs

**Create:** `config/profiles/prod.yml`
```yaml
version: "0.3.0"

environment: production
debug: false

llm_providers:
  - name: llm_prod_qwen3_8b
    type: ollama
    config:
      base_url: http://localhost:11434
      model: qwen3:8b
      max_tokens: 200
      temperature: 0.7
      timeout_ms: 5000

routing_rules:
  - name: "prod_chat"
    priority: 10
    conditions:
      mode: "chat"
    use_provider: "llm_prod_qwen3_8b"
    timeout_ms: 5000
    fallback_provider: "llm_remote_deepseek"

logging:
  level: INFO
  format: json
  rotation:
    max_size_mb: 100
    max_files: 10
```

**Actions:**
- [ ] Create `config/profiles/` directory
- [ ] Add `prod.yml`, `staging.yml`, `dev.yml`
- [ ] Update `config_loader.py` to support profiles
- [ ] Add `--profile` flag to `main_v2.py`

**Usage:**
```bash
python main_v2.py --profile prod --port 9102
```

---

### 2.3 Auto-Restart & Watchdog

**Systemd Service (Production)**
```ini
# /etc/systemd/system/dagi-router.service
[Unit]
Description=DAGI Router Service
After=network.target

[Service]
Type=simple
User=dagi
WorkingDirectory=/opt/dagi-stack
Environment="PATH=/opt/dagi-stack/.venv/bin"
ExecStart=/opt/dagi-stack/.venv/bin/python main_v2.py --profile prod
Restart=always
RestartSec=10
StartLimitBurst=5
StartLimitIntervalSec=60

[Install]
WantedBy=multi-user.target
```

**Docker Healthcheck Enhancement**
```yaml
# docker-compose.yml
services:
  router:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9102/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
```

**Actions:**
- [ ] Create systemd service files for all components
- [ ] Test auto-restart (kill -9 process)
- [ ] Document restart behavior
- [ ] Set up alerts for restart events

---

## 🌐 Stage 3: Ecosystem Integration (Week 3-4)

### 3.1 Open Core Model

**Objective**: Define what's open-source vs proprietary

**Open Source (MIT License):**
- ✅ Router core (`routing_engine.py`, `config_loader.py`)
- ✅ Provider interfaces (`providers/base_provider.py`)
- ✅ Base LLM providers (Ollama, OpenAI, DeepSeek)
- ✅ DevTools backend (file ops, test execution)
- ✅ RBAC service (role resolution)
- ✅ Gateway bot (Telegram/Discord webhooks)
- ✅ Utils (logging, validation)
- ✅ Documentation (all `.md` files)
- ✅ Test suites (`smoke.sh`, E2E tests)

**Proprietary/Private (Optional):**
- ⚠️ Custom CrewAI workflows (microDAO-specific)
- ⚠️ Advanced RBAC policies (DAO-specific rules)
- ⚠️ Custom LLM fine-tuning data
- ⚠️ Enterprise features (SSO, audit logs)

**Actions:**
- [ ] Create `docs/open-core-model.md`
- [ ] Add LICENSE file (MIT)
- [ ] Update README with licensing info
- [ ] Add CONTRIBUTING.md guide

**Deliverable:** `docs/open-core-model.md`

---

### 3.2 Dify Integration

**Objective**: Use DAGI Router as LLM backend for Dify

**Architecture:**
```
Dify UI → Dify Backend → DAGI Router (:9102) → LLM/DevTools/CrewAI
```

**Integration Steps:**

1. **Router as LLM Provider**
   ```python
   # Dify custom LLM provider
   {
     "provider": "dagi-router",
     "base_url": "http://localhost:9102",
     "model": "dagi-stack",
     "api_key": "optional"
   }
   ```

2. **Adapter Endpoint**
   ```python
   # router_app.py - Add Dify-compatible endpoint
   @app.post("/v1/chat/completions")
   async def dify_compatible(request: DifyRequest):
       # Convert Dify format → DAGI format
       dagi_request = convert_from_dify(request)
       result = await router.handle(dagi_request)
       # Convert DAGI format → Dify format
       return convert_to_dify(result)
   ```

3. **Tools Integration**
   ```yaml
   # Dify tools.yaml
   tools:
     - name: devtools_read
       type: api
       url: http://localhost:9102/route
       method: POST
       params:
         mode: devtools
         metadata:
           tool: fs_read
   ```

**Actions:**
- [ ] Create `/v1/chat/completions` endpoint
- [ ] Add Dify format converters
- [ ] Test with Dify UI
- [ ] Document integration in `docs/dify-integration.md`

**Deliverable:** `docs/dify-integration.md`

---

### 3.3 MCP Server (Model Context Protocol)

**Objective**: Expose DAGI Stack as MCP-compatible server

**MCP Tools:**
```json
{
  "tools": [
    {
      "name": "router_call",
      "description": "Route request to LLM/agent",
      "parameters": {
        "prompt": "string",
        "mode": "chat|crew|devtools",
        "metadata": "object"
      }
    },
    {
      "name": "devtools_task",
      "description": "Execute DevTools task",
      "parameters": {
        "tool": "fs_read|fs_write|run_tests",
        "params": "object"
      }
    },
    {
      "name": "workflow_run",
      "description": "Run CrewAI workflow",
      "parameters": {
        "workflow": "string",
        "inputs": "object"
      }
    },
    {
      "name": "microdao_query",
      "description": "Query microDAO RBAC/metadata",
      "parameters": {
        "dao_id": "string",
        "query_type": "roles|members|proposals"
      }
    }
  ]
}
```

**Implementation:**
```python
# mcp-server/main.py
from mcp import Server, Tool

server = Server("dagi-stack")

@server.tool("router_call")
async def router_call(prompt: str, mode: str, metadata: dict):
    # Call DAGI Router
    pass

@server.tool("devtools_task")
async def devtools_task(tool: str, params: dict):
    # Call DevTools
    pass

# ... more tools

if __name__ == "__main__":
    server.run(port=9400)
```

**Actions:**
- [ ] Create `mcp-server/` directory
- [ ] Implement MCP server (Python)
- [ ] Define 4-5 core tools
- [ ] Test with Claude Desktop / Cursor
- [ ] Document in `docs/mcp-integration.md`

**Deliverable:** `mcp-server/main.py`, `docs/mcp-integration.md`

---

## 📈 Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Uptime | 99%+ | TBD | 🟡 |
| Response time (P95) | < 4s | TBD | 🟡 |
| Error rate | < 0.5% | TBD | 🟡 |
| Real dialogs processed | 50+ | 0 | 🔴 |
| Dify integration | Working | Not started | 🔴 |
| MCP server | Beta | Not started | 🔴 |

---

## 🗂️ Deliverables

### Week 1
- [ ] Production deployment successful
- [ ] 5-10 real dialogs documented
- [ ] `docs/analysis/real-world-feedback-week1.md`
- [ ] Updated `SCENARIOS.md` with real-world examples

### Week 2
- [ ] LLM performance optimized (token limits, retry, queue)
- [ ] `config/profiles/prod.yml` created
- [ ] Systemd services configured
- [ ] Auto-restart tested

### Week 3
- [ ] `docs/open-core-model.md` published
- [ ] LICENSE file added (MIT)
- [ ] CONTRIBUTING.md created

### Week 4
- [ ] `docs/dify-integration.md` published
- [ ] `/v1/chat/completions` endpoint implemented
- [ ] Dify integration tested
- [ ] `mcp-server/` skeleton created
- [ ] `docs/mcp-integration.md` published

---

## 🔄 Phase 4 → Phase 5 Transition

**Phase 5: Scale & Ecosystem Growth**

After Phase 4 completion:
1. Horizontal scaling (load balancer + multiple Router instances)
2. Distributed tracing (Jaeger/Zipkin)
3. On-chain governance integration (proposals, voting)
4. Public open-source release (GitHub, docs site)
5. Community growth (Discord, contributor onboarding)

---

**Phase 4 Start Date**: TBD  
**Phase 4 Target Completion**: 4 weeks after first deploy  
**Owner**: DAARION Core Team  
**Version**: 0.3.0 (planned)
