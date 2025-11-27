# TASK: PHASE 3 — LLM PROXY + MEMORY ORCHESTRATOR + TOOLCORE

**Goal:**
Зробити агентів DAARION по-справжньому розумними та інструментальними:
- єдиний LLM Proxy з підтримкою кількох провайдерів і локальних моделей;
- Memory Orchestrator, який дає єдиний API для памʼяті агентів;
- Toolcore — реєстр інструментів і безпечне виконання tools для агентів.

**PHASE 3 = інфраструктура мислення й дії для Agent Runtime.**

**Existing (assume from Phase 1–2):**
- messaging-service, matrix-gateway, Messenger UI.
- agent-filter, DAGI Router (router.invoke.agent).
- agent-runtime (використовує /internal/llm/proxy та /internal/agent-memory/*, але поки можуть бути stubs).
- базова БД (users, microdaos, agents, channels, messages, etc.).
- NATS JetStream, PostgreSQL, docker-compose.

**Deliverables:**
1. services/llm-proxy/ — LLM Router + Providers + Logging.
2. services/memory-orchestrator/ — єдиний API для памʼяті агентів.
3. services/toolcore/ — registry + execution engine для tools.
4. Інтеграція з agent-runtime.
5. Оновлення docker-compose та docs.

---

## 1) SERVICE: LLM PROXY (services/llm-proxy)

**Create folder:**
```
services/llm-proxy/
  main.py
  models.py
  router.py
  providers/
    __init__.py
    openai_provider.py
    deepseek_provider.py
    local_provider.py
  config.yaml
  middlewares.py
  logging_middleware.py
  Dockerfile
  requirements.txt
  README.md
```

### 1.1 API

**Base URL (internal-only):**
- `POST /internal/llm/proxy`

**Request (v1):**
```json
{
  "model": "gpt-4.1-mini",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "metadata": {
    "agent_id": "agent:sofia",
    "microdao_id": "microdao:7",
    "channel_id": "..."
  }
}
```

**Response:**
```json
{
  "content": "текст відповіді",
  "usage": {
    "prompt_tokens": 123,
    "completion_tokens": 45,
    "total_tokens": 168
  },
  "provider": "openai",
  "model_resolved": "gpt-4.1-mini"
}
```

**Optional (stub for later):**
- `/internal/llm/batch`
- `/internal/llm/stream` (можна залишити TODO)

### 1.2 Model routing (router.py)

Створити модуль:

```python
def route_model(logical_model: str) -> ProviderConfig:
    # Читає зі структури в config.yaml
    # Напр.:
    #  - gpt-4.1-mini → OpenAI (gpt-4.1-mini)
    #  - deepseek-r1 → DeepSeek API
    #  - dagi-local-8b → Local provider (Ollama / vllm)
```

**config.yaml (приклад):**
```yaml
providers:
  openai:
    base_url: "https://api.openai.com/v1"
    api_key_env: "OPENAI_API_KEY"
  deepseek:
    base_url: "https://api.deepseek.com/v1"
    api_key_env: "DEEPSEEK_API_KEY"
  local:
    base_url: "http://local-llm:8000"

models:
  gpt-4.1-mini:
    provider: "openai"
    name: "gpt-4.1-mini"
  deepseek-r1:
    provider: "deepseek"
    name: "deepseek-r1"
  dagi-local-8b:
    provider: "local"
    name: "qwen2.5-8b-instruct"
```

### 1.3 Providers (providers/*.py)

Кожен провайдер:

```python
class BaseProvider(Protocol):
    async def chat(self, messages: list[ChatMessage], model_name: str, **kwargs) -> LLMResponse: ...
```

**Файли:**
- `providers/openai_provider.py`
- `providers/deepseek_provider.py`
- `providers/local_provider.py`

Вони:
- отримують normalized messages,
- викликають відповідний API/endpoint,
- повертають LLMResponse (контент + usage).

**Local provider:**
- для Phase 3 можна зробити простий HTTP-запит до існуючого локального сервісу (Ollama/vLLM), або stub.

### 1.4 Logging & limits (middlewares.py, logging_middleware.py)

Добавити:
- простий rate limit per-agent (стабово, через in-memory або Redis stub).
- логування викликів:
  - agent_id, microdao_id, model, latency, tokens.
- TODO hooks для Billing/Usage Engine (на майбутнє).

### 1.5 README.md

Описати:
- підтримувані моделі та мапінг,
- як додати нового провайдера,
- як викликати /internal/llm/proxy з інших сервісів (особливо agent-runtime).

---

## 2) SERVICE: MEMORY ORCHESTRATOR (services/memory-orchestrator)

**Goal:**
Єдиний API для роботи з памʼяттю:
- short-term (канальний контекст / event log),
- mid-term (agent memory / RAG embedding store),
- long-term (knowledge base, docs, roadmaps).

**Create folder:**
```
services/memory-orchestrator/
  main.py
  models.py
  router.py
  backends/
    __init__.py
    short_term_pg.py
    vector_store_pg.py
    kb_filesystem.py
  embedding_client.py
  config.yaml
  Dockerfile
  requirements.txt
  README.md
```

### 2.1 API

**Base URL:**
- `POST /internal/agent-memory/query`
- `POST /internal/agent-memory/store`
- `POST /internal/agent-memory/summarize` (optional v1)

**Request /query:**
```json
{
  "agent_id": "agent:sofia",
  "microdao_id": "microdao:7",
  "channel_id": "optional",
  "query": "коротко, які були останні зміни в цьому microDAO?",
  "limit": 5
}
```

**Response:**
```json
{
  "items": [
    {
      "id": "mem-123",
      "kind": "conversation | kb | task | dao-event",
      "score": 0.87,
      "content": "Текст фрагменту памʼяті",
      "meta": {
        "source": "channel:...",
        "timestamp": "..."
      }
    }
  ]
}
```

**Request /store:**
```json
{
  "agent_id": "agent:sofia",
  "microdao_id": "microdao:7",
  "channel_id": "optional",
  "kind": "conversation | kb | task | dao-event",
  "content": {
    "user_message": "...",
    "agent_reply": "..."
  }
}
```

**Response:**
```json
{ "ok": true, "id": "mem-123" }
```

### 2.2 Backends

**backends/short_term_pg.py:**
- зберігає сирі events (або посилання на messages) в PostgreSQL, якщо треба окремо від messenger.

**backends/vector_store_pg.py:**
- використовує embeddings (через embedding_client.py) і зберігає в таблиці:
  ```sql
  agent_memories (id, agent_id, microdao_id, embedding vector, content, meta)
  ```
- простий cosine similarity пошук.

**backends/kb_filesystem.py:**
- stub для long-term знань (roadmaps, docs), можна залишити TODO.

### 2.3 Embedding client (embedding_client.py)

- Простий клієнт до існуючої embedding-моделі (наприклад, BGE-M3 чи інша) через /internal/embedding/proxy або безпосередньо.
- Якщо embedding-сервіс не описаний — зробити stub + TODO.

### 2.4 Integration points

**agent-runtime:**
- замінити прямі виклики agent-memory на:
  - `POST /internal/agent-memory/query`
  - `POST /internal/agent-memory/store`

Надалі можна буде підʼєднати:
- microDAO knowledge,
- DAO events,
- roadmaps.

---

## 3) SERVICE: TOOLCORE (services/toolcore)

**Goal:**
Єдина точка для:
- реєстрації tools (інструментів агентів),
- перевірки дозволів,
- виконання tools та повернення результату агенту.

**Create folder:**
```
services/toolcore/
  main.py
  models.py
  router.py
  registry.py
  executors/
    __init__.py
    http_executor.py
    python_executor.py (optional)
  config.yaml
  Dockerfile
  requirements.txt
  README.md
```

### 3.1 Data model

**models.py:**

```python
class ToolDefinition(BaseModel):
    id: str                # "projects.list"
    name: str
    description: str
    input_schema: dict     # JSON Schema
    output_schema: dict    # JSON Schema
    executor: Literal["http", "python"]
    target: str            # HTTP URL or python path
    allowed_agents: list[str] | None

class ToolCallRequest(BaseModel):
    tool_id: str
    agent_id: str
    microdao_id: str
    args: dict
    context: dict | None = None

class ToolCallResult(BaseModel):
    ok: bool
    result: dict | None = None
    error: str | None = None
```

### 3.2 API

**HTTP (internal):**

- `GET /internal/tools`
  → список доступних tools

- `POST /internal/tools/call`
  Body: ToolCallRequest
  Behavior:
  - перевірити, чи agent_id має право на tool_id (allowed_agents).
  - знайти ToolDefinition.
  - виконати через відповідний executor.
  - повернути ToolCallResult.

### 3.3 Executors

**executors/http_executor.py:**
- викликає target як HTTP endpoint (POST з args + context).
- хендлінг помилок та таймаутів.

**executors/python_executor.py (optional):**
- allows direct call of internal python functions (у v1 можна залишити TODO або мінімальний stub).

### 3.4 Registry (registry.py)

Початок — з config.yaml (static registry):

**config.yaml:**
```yaml
tools:
  - id: "projects.list"
    name: "List projects"
    description: "Повертає список проєктів microDAO."
    input_schema:
      type: "object"
      properties:
        microdao_id: { type: "string" }
      required: ["microdao_id"]
    output_schema:
      type: "array"
      items: { type: "object" }
    executor: "http"
    target: "http://projects-service:8000/internal/tools/projects.list"
    allowed_agents: ["agent:sofia", "agent:pm", "agent:cto"]
```

**Registry API:**
- load from config.yaml at startup
- later можна зробити DB-backed registry.

### 3.5 NATS (optional для Phase 3)

Можна додати:
- subject: `tool.request`
- subject: `tool.response`

Але для Phase 3 достатньо HTTP-контракту, який викликає agent-runtime.

---

## 4) INTEGRATION: agent-runtime + LLM Proxy + Memory + Toolcore

**Update agent-runtime:**

### 4.1 Використовувати LLM Proxy

Замість прямого виклику будь-яких LLM:
- завжди викликати:
  ```http
  POST /internal/llm/proxy
  {
    "model": "<logical model from agent blueprint>",
    "messages": [...],
    "metadata": {
      "agent_id": ...,
      "microdao_id": ...,
      "channel_id": ...
    }
  }
  ```

### 4.2 Використовувати Memory Orchestrator

При channel_message:
- контекст:
  `GET /internal/messaging/channels/{channelId}/messages?limit=50`
- памʼять:
  `POST /internal/agent-memory/query`
- запис:
  `POST /internal/agent-memory/store` після відповіді.

### 4.3 Виклик tools

Якщо в blueprint агента передбачені tools:
- парсити вихід LLM (JSON/structured) або через simple convention (наприклад, спеціальний формат "TOOL: projects.list {...}").
- для кожного tool call:
  ```http
  POST /internal/tools/call
  {
    "tool_id": "...",
    "agent_id": "...",
    "microdao_id": "...",
    "args": {...}
  }
  ```
- включати результати tools у наступний LLM виклик як контекст.
- (На Phase 3 можна реалізувати один-два прості tools: projects.list, followups.create.)

---

## 5) DOCKER + DOCS

### 5.1 docker-compose

Додати new services:
- llm-proxy
- memory-orchestrator
- toolcore

Переконатися, що:
- вони в тій же мережі, що agent-runtime, messaging-service, NATS, DB;
- є healthcheck-и (GET /health).

### 5.2 Документація

Додати/оновити:
- `docs/LLM_PROXY_SPEC.md`
- `docs/MEMORY_ORCHESTRATOR_SPEC.md`
- `docs/TOOLCORE_SPEC.md`
- оновити `docs/INDEX.md` (додати посилання на ці три сервіси).
- в PHASE2_READY.md або окремому PHASE3_READY.md описати нову архітектуру agent pipeline.

---

## 6) ACCEPTANCE CRITERIA

### 1) LLM Proxy:
- ✅ /internal/llm/proxy приймає запити, повертає відповіді.
- ✅ Принаймні 2 логічні моделі працюють (наприклад, один remote, один local.stub).
- ✅ Логуються виклики per-agent.

### 2) Memory Orchestrator:
- ✅ /internal/agent-memory/query повертає релевантні фрагменти (можна з простим vector search або stub).
- ✅ /internal/agent-memory/store зберігає нові entries.
- ✅ agent-runtime успішно використовує його при відповіді.

### 3) Toolcore:
- ✅ /internal/tools повертає список інструментів.
- ✅ /internal/tools/call виконує хоча б один реальний tool (HTTP executor).
- ✅ agent-runtime може викликати хоча б один tool впродовж свого pipeline.

### 4) End-to-end:
- ✅ Агент у Messenger:
  - читає контекст (messages + memory),
  - викликає LLM через LLM Proxy,
  - за потреби викликає tool через Toolcore,
  - повертає відповідь у канал.
- ✅ Для одного демо-агента (наприклад, Sofia-Prime) цей ланцюг стабільно працює.

---

## END OF TASK

**Estimated Time:** 6-8 weeks  
**Priority:** High  
**Dependencies:** Phase 2 complete  
**Version:** 1.0.0  
**Date:** 2025-11-24





