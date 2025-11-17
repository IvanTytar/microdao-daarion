# 🧠 HMM Memory System — Status

**Версія:** 1.0.0  
**Останнє оновлення:** 2025-01-17  
**Статус:** ✅ Implementation Complete

---

## 🎯 Overview

**HMM (Hierarchical Multi-Modal Memory)** — триярусна система пам'яті для агентів з автоматичною самарізацією та векторним пошуком. Система забезпечує контекстну пам'ять для діалогів з автоматичним управлінням токенами.

**Документація:**
- [HMM Memory Implementation Task](./docs/cursor/hmm_memory_implementation_task.md) — Детальне завдання з TODO
- [HMM Memory Summary](./docs/cursor/HMM_MEMORY_SUMMARY.md) — Підсумок реалізації

---

## ✅ Implementation Complete

**Дата завершення:** 2025-01-17

### Core Modules

#### 1. HMM Memory Module

**Location Options:**
- ✅ `gateway-bot/hmm_memory.py` — Gateway Bot implementation (complete)
- ✅ `services/memory/memory.py` — Router Service implementation (complete)

**Router Implementation (`services/memory/memory.py`):**

**ShortMemory:**
- ✅ Останні N повідомлень (default: 20)
- ✅ Redis backend з in-memory fallback
- ✅ FIFO queue для обмеження розміру
- ✅ Функції: `add_message()`, `get_recent()`, `clear()`

**MediumMemory:**
- ✅ Самарі діалогів (останні 20)
- ✅ Redis list зі збереженням часу
- ✅ Автоматична ротація старих самарі
- ✅ Функції: `add_summary()`, `get_summaries()`, `clear()`

**LongMemory:**
- ✅ Векторна пам'ять (ChromaDB або RAG Service)
- ✅ Пошук по схожості
- ✅ Fallback до RAG Service API
- ✅ Функції: `add_memory()`, `search()`

**GraphMemory (Neo4j):**
- ✅ Графова пам'ять для зв'язків між діалогами
- ✅ Вузли: User, Agent, DAO, Dialog, Summary, Topic
- ✅ Зв'язки: PARTICIPATED_IN, ABOUT, CONTAINS, MENTIONS
- ✅ Feature flag: `GRAPH_MEMORY_ENABLED`
- ✅ Fallback якщо Neo4j недоступний
- ✅ Функції:
  - `upsert_dialog_context()` — інжест самарі в граф
  - `query_relevant_summaries_for_dialog()` — останні самарі
  - `query_related_context_for_user()` — контекст користувача
  - `query_summaries_by_dao()` — самарі DAO
  - `query_summaries_by_topic()` — пошук за темою

**Infrastructure:**
- ✅ Автоматична ініціалізація всіх backends
- ✅ Graceful fallback при помилках
- ✅ Connection pooling для Redis
- ✅ TTL для short/medium memory

---

#### 2. Dialogue Management (`gateway-bot/dialogue.py`)

**Functions:**

**`continue_dialogue()`:**
- ✅ Продовження діалогу з автоматичною самарізацією
- ✅ Перевірка токенів (max 24k)
- ✅ Формування контексту (самарі + short memory)
- ✅ Виклик Router → LLM
- ✅ Збереження відповіді

**`smart_reply()`:**
- ✅ Розумна відповідь з автоматичним RAG
- ✅ Виявлення запитів нагадування ("Що я казав про...", "Нагадай мені...")
- ✅ Пошук у long memory при потребі
- ✅ Fallback до `continue_dialogue()`

**`summarize_dialogue()`:**
- ✅ Самарізація через LLM
- ✅ Визначення емоцій
- ✅ Виділення ключових моментів
- ✅ Збереження в medium та long memory

**Helper Functions:**
- ✅ `_detect_reminder_request()` — виявлення запитів нагадування
- ✅ `_estimate_tokens()` — приблизний підрахунок токенів
- ✅ `_should_summarize()` — перевірка необхідності самарізації

---

#### 3. Configuration & Dependencies

**Environment Variables (`docker-compose.yml`):**
```yaml
environment:
  - REDIS_URL=redis://redis:6379/0
  - CHROMA_PATH=/data/chroma
  - RAG_SERVICE_URL=http://rag-service:9500
  - ROUTER_URL=http://router:9102
  - HMM_SHORT_MEMORY_SIZE=20
  - HMM_MEDIUM_MEMORY_SIZE=20
  - HMM_MAX_TOKENS=24000
  # Neo4j Graph Memory
  - NEO4J_URI=bolt://neo4j:7687
  - NEO4J_USER=neo4j
  - NEO4J_PASSWORD=password
  - GRAPH_MEMORY_ENABLED=true
```

**Dependencies:**

`gateway-bot/requirements.txt`:
- ✅ `redis>=5.0.0` — Short/Medium Memory
- ✅ `chromadb>=0.4.0` — Long Memory (local)
- ✅ `httpx>=0.24.0` — RAG Service API calls
- ✅ `pydantic>=2.0.0` — Data validation

`services/memory/requirements.txt`:
- ✅ `redis>=5.0.0` — Short/Medium Memory
- ✅ `chromadb>=0.4.0` — Long Memory (local)
- ✅ `httpx>=0.24.0` — RAG Service API calls
- ✅ `neo4j>=5.15.0` — Graph Memory

**Docker (`gateway-bot/Dockerfile`):**
- ✅ Updated to use `requirements.txt`
- ✅ Multi-stage build for optimization
- ✅ Python 3.11 base image

---

## 🏗️ Architecture

### Memory Hierarchy

```
┌─────────────────────────────────────────┐
│           User Message                   │
└──────────────┬──────────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │   smart_reply()      │
    │  - Detect reminder   │
    │  - Load short mem    │
    └──────────┬───────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
  Reminder?         Normal
       │               │
       ▼               ▼
┌─────────────┐  ┌──────────────┐
│ Long Memory │  │ Short Memory │
│ RAG Search  │  │ Recent msgs  │
└──────┬──────┘  └──────┬───────┘
       │                │
       └────────┬───────┘
                ▼
         ┌─────────────┐
         │ Token Check │
         │  > 24k?     │
         └──────┬──────┘
                │
         ┌──────┴──────┐
         │             │
        Yes            No
         │             │
         ▼             ▼
  ┌────────────┐  ┌─────────────┐
  │ Summarize  │  │ Continue    │
  │ Dialogue   │  │ Dialogue    │
  └─────┬──────┘  └──────┬──────┘
        │                │
        ▼                │
  ┌────────────┐         │
  │ Medium Mem │         │
  │ Save Sum   │         │
  └─────┬──────┘         │
        │                │
        └────────┬───────┘
                 ▼
          ┌─────────────┐
          │ Router/LLM  │
          │ Generate    │
          └──────┬──────┘
                 ▼
          ┌─────────────┐
          │ Short Memory│
          │ Save Reply  │
          └─────────────┘
```

### Data Flow

**1. Normal Message:**
```python
user_message
  → smart_reply()
    → load short_memory
      → check tokens
        → if < 24k: continue_dialogue()
        → if > 24k: summarize_dialogue() → continue_dialogue()
          → Router/LLM
            → save to short_memory
              → return response
```

**2. Reminder Request:**
```python
user_message ("Що я казав про X?")
  → smart_reply()
    → detect_reminder_request() → True
      → search long_memory(query="X")
        → retrieve relevant memories
          → continue_dialogue(context=memories)
            → Router/LLM
              → return response
```

**3. Summarization Trigger:**
```python
tokens > 24k
  → summarize_dialogue(short_memory)
    → Router/LLM (summarize)
      → save to medium_memory
        → save to long_memory (vector)
          → clear old short_memory
            → continue with new context
```

---

## 📦 File Structure

### Gateway Bot Implementation

```
gateway-bot/
├── hmm_memory.py              # Core HMM Memory module
│   ├── ShortMemory            # Redis/in-memory recent messages
│   ├── MediumMemory           # Redis summaries
│   └── LongMemory             # ChromaDB/RAG vector search
│
├── dialogue.py                # Dialogue management
│   ├── continue_dialogue()    # Main dialogue flow
│   ├── smart_reply()          # Smart reply with RAG
│   ├── summarize_dialogue()   # LLM summarization
│   └── helper functions       # Token estimation, reminder detection
│
├── http_api.py                # HTTP endpoints (to be updated)
│   └── /telegram/webhook      # Message handler
│
├── requirements.txt           # Python dependencies
├── Dockerfile                 # Docker build config
└── README.md                  # Module documentation
```

### Router Service Implementation

```
services/
├── memory/
│   ├── memory.py              # Core Memory classes
│   │   ├── ShortMemory        # Redis/in-memory fallback
│   │   ├── MediumMemory       # Redis List summaries
│   │   ├── LongMemory         # ChromaDB or RAG Service
│   │   └── Memory             # Factory class
│   ├── graph_memory.py        # Neo4j Graph Memory
│   │   ├── GraphMemory        # Neo4j driver + queries
│   │   └── 5 query methods    # Graph traversal
│   ├── init_neo4j.py          # Neo4j schema initialization
│   └── __init__.py
│
├── dialogue/              # To be implemented
│   ├── service.py         # Dialogue management
│   │   ├── continue_dialogue()
│   │   └── smart_reply()
│   └── __init__.py
│
└── router/
    ├── router_app.py      # Main router (to be updated)
    │   ├── POST /route
    │   ├── POST /v1/dialogue/continue  # To add
    │   ├── GET /v1/memory/debug/{id}   # To add
    │   └── POST /v1/memory/search      # To add
    └── types.py           # RouterRequest (add dialog_id)
```

---

## 🕸️ Neo4j Graph Memory Model

### Node Types

**User** — Користувач системи
- Properties: `user_id`, `name`, `created_at`

**Agent** — AI агент
- Properties: `agent_id`, `name`, `type`

**DAO** — MicroDAO
- Properties: `dao_id`, `name`, `created_at`

**Dialog** — Діалог
- Properties: `dialog_id`, `started_at`, `last_message_at`

**Summary** — Самарі діалогу
- Properties: `summary_id`, `text`, `emotion`, `created_at`

**Topic** — Тема/ключове слово
- Properties: `topic`, `mentioned_count`

### Relationship Types

**PARTICIPATED_IN** — User/Agent → Dialog
- Користувач/агент брав участь у діалозі

**ABOUT** — Dialog → DAO
- Діалог відбувався в контексті DAO

**CONTAINS** — Dialog → Summary
- Діалог містить самарі

**MENTIONS** — Summary → Topic
- Самарі згадує тему

### Example Graph

```
(User:tg:123)
    │
    └─[PARTICIPATED_IN]→ (Dialog:d1)
                             │
                             ├─[ABOUT]→ (DAO:greenfood)
                             │
                             └─[CONTAINS]→ (Summary:s1)
                                           │
                                           ├─[MENTIONS]→ (Topic:pizza)
                                           └─[MENTIONS]→ (Topic:delivery)
```

### Cypher Queries

**1. Get recent summaries for dialog:**
```cypher
MATCH (d:Dialog {dialog_id: $dialog_id})-[:CONTAINS]->(s:Summary)
RETURN s ORDER BY s.created_at DESC LIMIT 10
```

**2. Get related context for user:**
```cypher
MATCH (u:User {user_id: $user_id})-[:PARTICIPATED_IN]->(d:Dialog)
      -[:CONTAINS]->(s:Summary)
RETURN s ORDER BY s.created_at DESC LIMIT 20
```

**3. Search summaries by topic:**
```cypher
MATCH (s:Summary)-[:MENTIONS]->(t:Topic)
WHERE t.topic CONTAINS $topic
RETURN s ORDER BY s.created_at DESC
```

---

## 🔧 Configuration Details

### Redis Configuration

**Short Memory:**
- **Key pattern:** `hmm:short:{dao_id}:{user_id}`
- **Type:** List (FIFO)
- **Max size:** 20 messages (configurable)
- **TTL:** 7 days

**Medium Memory:**
- **Key pattern:** `hmm:medium:{dao_id}:{user_id}`
- **Type:** List of JSON
- **Max size:** 20 summaries
- **TTL:** 30 days

### ChromaDB Configuration

**Collection:** `hmm_long_memory`
- **Distance metric:** Cosine similarity
- **Embedding model:** Automatic (via ChromaDB)
- **Metadata fields:**
  - `dao_id`: DAO identifier
  - `user_id`: User identifier
  - `timestamp`: Creation time
  - `emotion`: Detected emotion
  - `key_points`: List of key topics

### RAG Service Integration

**Endpoint:** `POST /search`
- **Request:**
  ```json
  {
    "query": "user query text",
    "dao_id": "dao-id",
    "user_id": "user-id",
    "top_k": 5
  }
  ```
- **Response:**
  ```json
  {
    "results": [
      {"text": "...", "score": 0.95, "metadata": {...}}
    ]
  }
  ```

---

## 🧪 Testing

### Unit Tests (To be implemented)

**`tests/test_hmm_memory.py`:**
```bash
# Test ShortMemory
- test_add_message()
- test_get_recent()
- test_fifo_rotation()
- test_redis_fallback()

# Test MediumMemory
- test_add_summary()
- test_get_summaries()
- test_rotation()

# Test LongMemory
- test_add_memory()
- test_search()
- test_rag_fallback()
```

**`tests/test_dialogue.py`:**
```bash
# Test dialogue functions
- test_continue_dialogue()
- test_smart_reply()
- test_summarize_dialogue()
- test_detect_reminder()
- test_token_estimation()
```

### Integration Tests

**Test Scenario 1: Normal Dialogue**
```python
# 1. Send message
response = smart_reply(
    user_id="test_user",
    dao_id="test_dao",
    message="Hello!"
)

# 2. Verify short memory updated
assert len(short_memory.get_recent(...)) == 2  # user + assistant

# 3. Verify response
assert "Hello" in response
```

**Test Scenario 2: Reminder Request**
```python
# 1. Add some memories
long_memory.add_memory(text="User likes pizza", ...)

# 2. Ask reminder
response = smart_reply(
    user_id="test_user",
    dao_id="test_dao",
    message="What did I say about pizza?"
)

# 3. Verify long memory searched
assert "pizza" in response
```

**Test Scenario 3: Auto-summarization**
```python
# 1. Add many messages (>24k tokens)
for i in range(100):
    short_memory.add_message(...)

# 2. Send message
response = smart_reply(...)

# 3. Verify summarization triggered
assert len(medium_memory.get_summaries(...)) > 0
assert len(short_memory.get_recent(...)) < 100
```

### E2E Test via Gateway

```bash
# 1. Send normal message
curl -X POST http://localhost:9300/telegram/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "from": {"id": 123, "username": "test"},
      "chat": {"id": 123},
      "text": "Hello bot!"
    }
  }'

# 2. Send many messages to trigger summarization
for i in {1..50}; do
  curl -X POST http://localhost:9300/telegram/webhook ...
done

# 3. Send reminder request
curl -X POST http://localhost:9300/telegram/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "from": {"id": 123, "username": "test"},
      "chat": {"id": 123},
      "text": "What did I say about pizza?"
    }
  }'

# 4. Verify response contains relevant context
```

---

## 🚀 Integration Status

### 1. Gateway Bot Integration

**✅ Modules Created:**
- `gateway-bot/hmm_memory.py`
- `gateway-bot/dialogue.py`

**⏳ To be integrated:**
- `gateway-bot/http_api.py` — Update `/telegram/webhook` handler

---

### 2. Router Service Integration

**✅ Modules Created:**
- `services/memory/memory.py` — Core Memory classes
  - `ShortMemory` (Redis/in-memory)
  - `MediumMemory` (Redis List)
  - `LongMemory` (ChromaDB or RAG Service)
  - `Memory` (Factory class)
- `services/memory/graph_memory.py` — Neo4j Graph Memory
  - `GraphMemory` (Neo4j driver)
  - 5 query methods for graph traversal
  - Feature flag support
- `services/memory/init_neo4j.py` — Neo4j initialization
  - Constraints creation
  - Indexes creation

**⏳ To be implemented:**
- `services/dialogue/service.py` — Dialogue management
  - `continue_dialogue()`
  - `smart_reply()`
- API endpoints in `router_app.py` or `http_api.py`:
  - `POST /v1/dialogue/continue`
  - `GET /v1/memory/debug/{dialog_id}`
  - `POST /v1/memory/search`
- Update `RouterRequest` model with `dialog_id`
- Configuration and environment variables
- Tests

**📝 Documentation:**
- [docs/cursor/hmm_memory_router_task.md](./docs/cursor/hmm_memory_router_task.md) — Detailed implementation task

**🎯 Features:**
- ✅ Neo4j not used (left for future)
- ✅ Fallback modes (works without Redis/ChromaDB)
- ✅ RAG Service as ChromaDB alternative
- ✅ Ready for Router integration

---

### Gateway Bot Integration (Original)

### Integration Steps

**1. Update `http_api.py`:**

```python
# Before:
async def telegram_webhook(update: TelegramUpdate):
    message = update.message.text
    response = await router_client.route_request(...)
    return response

# After:
from dialogue import smart_reply

async def telegram_webhook(update: TelegramUpdate):
    message = update.message.text
    user_id = f"tg:{update.message.from_.id}"
    dao_id = get_dao_id(update)  # from context or default
    
    # Use smart_reply instead of direct router call
    response = await smart_reply(
        user_id=user_id,
        dao_id=dao_id,
        message=message
    )
    
    return response
```

**2. Initialize HMM Memory on startup:**

```python
# http_api.py
from hmm_memory import ShortMemory, MediumMemory, LongMemory

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize memories
    global short_memory, medium_memory, long_memory
    
    short_memory = ShortMemory(redis_url=settings.REDIS_URL)
    medium_memory = MediumMemory(redis_url=settings.REDIS_URL)
    long_memory = LongMemory(
        chroma_path=settings.CHROMA_PATH,
        rag_service_url=settings.RAG_SERVICE_URL
    )
    
    yield
    
    # Cleanup
    await short_memory.close()
    await medium_memory.close()
```

**3. Update Docker Compose:**

Already done ✅ — environment variables added.

**4. Test:**

```bash
# Restart gateway service
docker-compose restart gateway

# Check logs
docker-compose logs -f gateway | grep "HMM Memory"

# Send test message via Telegram
```

---

## 📊 Monitoring

### Metrics to Track

**Memory Usage:**
- Short memory size (messages per user)
- Medium memory size (summaries per user)
- Long memory collection size

**Performance:**
- Token estimation time
- Summarization time
- RAG search latency
- Redis response time

**Business Metrics:**
- Summarization trigger rate
- Reminder request rate
- Average dialogue length (before summarization)

### Monitoring Commands

```bash
# Redis stats
docker exec -it redis redis-cli INFO memory

# Check short memory keys
docker exec -it redis redis-cli KEYS "hmm:short:*"

# Check medium memory keys
docker exec -it redis redis-cli KEYS "hmm:medium:*"

# ChromaDB stats (if using local)
curl http://localhost:8000/api/v1/collections/hmm_long_memory
```

---

## 📊 Neo4j Visualization & Monitoring

### Grafana Dashboard

**Status:** ✅ Implemented

**Setup:**
- ✅ Grafana added to `docker-compose.yml`
- ✅ Automatic Neo4j data source provisioning
- ✅ Pre-configured dashboard with 4 panels
- ✅ Automatic dashboard loading on startup

**Dashboard Panels:**
1. **Entity Counts** — Кількість DAO/агентів/користувачів
2. **Average Agents per DAO** — Середня кількість агентів
3. **Users Distribution by DAO** — Розподіл користувачів
4. **Summary Activity Over Time** — Активність самарі за часом

**File Structure:**
```
grafana/
├── provisioning/
│   ├── datasources/
│   │   └── neo4j.yml          # Auto Neo4j connection
│   └── dashboards/
│       └── default.yml         # Dashboard config
└── dashboards/
    └── dao-agents-users-overview.json  # Dashboard JSON
```

**Access:**
- **URL:** `http://localhost:3000`
- **Default credentials:** `admin / admin`
- **Dashboard:** Home → Dashboards → "DAO Agents Users Overview"

**Quick Start:**
```bash
# Start Grafana and Neo4j
docker-compose up -d grafana neo4j

# Check logs
docker-compose logs -f grafana

# Open browser
open http://localhost:3000
```

---

### Neo4j Bloom (Graph Visualization)

**Status:** ✅ Configuration documented

**What is Bloom:**
- Visual graph exploration tool
- Natural language queries
- Interactive graph visualization
- Built-in Neo4j Browser (Community Edition)
- Neo4j Bloom (Enterprise Edition)

**Access:**
- **Neo4j Browser:** `http://localhost:7474`
- **Bloom:** `http://localhost:7474/bloom` (Enterprise only)
- **Credentials:** `neo4j / password`

**Bloom Perspective Configuration:**

**Node Styles:**
- **User** — 👤 Blue color, `user_id` as caption
- **Agent** — 🤖 Green color, `name` as caption
- **DAO** — 🏢 Orange color, `dao_id` as caption
- **Dialog** — 💬 Purple color, `dialog_id` as caption
- **Summary** — 📝 Gray color, `summary_id` as caption
- **Topic** — 🏷️ Yellow color, `topic` as caption

**Search Phrases Examples:**
1. **"Show me all users"**
   - `MATCH (u:User) RETURN u LIMIT 50`

2. **"Find dialogs for {user}"**
   - `MATCH (u:User {user_id: $user})-[:PARTICIPATED_IN]->(d:Dialog) RETURN u, d`

3. **"What topics does {user} discuss?"**
   - `MATCH (u:User {user_id: $user})-[:PARTICIPATED_IN]->(d:Dialog)-[:CONTAINS]->(s:Summary)-[:MENTIONS]->(t:Topic) RETURN u, t, COUNT(t) AS mentions`

4. **"Show me {dao} activity"**
   - `MATCH (dao:DAO {dao_id: $dao})<-[:ABOUT]-(d:Dialog) RETURN dao, d LIMIT 20`

5. **"Who talks about {topic}?"**
   - `MATCH (t:Topic {topic: $topic})<-[:MENTIONS]-(s:Summary)<-[:CONTAINS]-(d:Dialog)<-[:PARTICIPATED_IN]-(u:User) RETURN t, u, COUNT(u) AS conversations`

**Documentation:**
- [README_NEO4J_VISUALIZATION.md](./README_NEO4J_VISUALIZATION.md) — Quick start guide
- [docs/cursor/neo4j_visualization_task.md](./docs/cursor/neo4j_visualization_task.md) — Implementation task
- [docs/cursor/neo4j_bloom_perspective.md](./docs/cursor/neo4j_bloom_perspective.md) — Bloom configuration

**Quick Start:**
```bash
# Start Neo4j
docker-compose up -d neo4j

# Wait for startup (check logs)
docker-compose logs -f neo4j

# Open Neo4j Browser
open http://localhost:7474

# Login and explore graph
# Use Cypher queries from Neo4j Graph Memory Model section
```

---

## 🔔 Prometheus Monitoring & Alerting

### Neo4j Prometheus Exporter

**Status:** ✅ Implemented

**Service:** `services/neo4j-exporter/`
- ✅ `neo4j_exporter/main.py` — FastAPI exporter with `/metrics` endpoint
- ✅ `Dockerfile` — Container build
- ✅ `requirements.txt` — Dependencies (fastapi, prometheus-client, neo4j)

**Metrics Collected:**

**1. Health Metrics:**
- `neo4j_up` — Доступність Neo4j (1 = up, 0 = down)
- `neo4j_exporter_scrape_duration_seconds` — Тривалість scrape
- `neo4j_exporter_errors_total{type}` — Помилки exporter
- `neo4j_cypher_query_duration_seconds{query}` — Тривалість Cypher запитів

**2. Graph Metrics:**
- `neo4j_nodes_total{label}` — Кількість вузлів по labels (User, Agent, DAO, Dialog, Summary, Topic)
- `neo4j_relationships_total{type}` — Кількість зв'язків по типах

**3. Business Metrics:**
- `neo4j_summaries_per_day{day}` — Самарі по днях (останні 7 днів)
- `neo4j_active_daos_last_7d` — Активні DAO за 7 днів
- `neo4j_avg_agents_per_dao` — Середня кількість агентів на DAO
- `neo4j_avg_users_per_dao` — Середня кількість користувачів на DAO

**Access:**
- **Exporter:** `http://localhost:9091/metrics`
- **Prometheus:** `http://localhost:9090`
- **Grafana:** `http://localhost:3000` (Prometheus data source auto-configured)

**Quick Start:**
```bash
# Start exporter, Prometheus, Neo4j
docker-compose up -d neo4j-exporter prometheus neo4j

# Check exporter metrics
curl http://localhost:9091/metrics

# Open Prometheus
open http://localhost:9090

# Check targets status: Status → Targets
```

---

### Prometheus Configuration

**File:** `prometheus/prometheus.yml`

**Scrape Configs:**
```yaml
scrape_configs:
  - job_name: 'neo4j-exporter'
    static_configs:
      - targets: ['neo4j-exporter:9091']
    scrape_interval: 15s

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

**Alerting Rules:** `alerting/neo4j_alerts.yml` (11 rules)

**Alertmanager:** Optional (can be added for notifications)

---

### Alerting Rules

**Status:** ✅ Implemented

**File:** `alerting/neo4j_alerts.yml`

**3 Groups, 11 Rules:**

#### **1. Health Alerts (4 rules) — Critical**

**Neo4jDown:**
- Критичний alert коли Neo4j недоступний > 2 хвилин
- Severity: `critical`
- Action: Check Neo4j logs, restart service

**Neo4jExporterHighErrors:**
- Alert коли exporter має > 5 помилок за 5 хвилин
- Severity: `warning`
- Action: Check exporter logs, verify Neo4j connectivity

**Neo4jSlowQueries:**
- Alert коли Cypher запити > 2 секунд
- Severity: `warning`
- Action: Optimize queries, add indexes

**Neo4jExporterDown:**
- Alert коли exporter недоступний > 2 хвилин
- Severity: `warning`
- Action: Restart exporter container

#### **2. Business Alerts (5 rules) — Monitoring**

**NoSummariesCreatedToday:**
- Alert якщо жодної самарі не створено сьогодні
- Severity: `warning`
- Action: Check dialogue service, verify memory system

**NoActiveDAOsLast7Days:**
- Alert якщо жодного активного DAO за 7 днів
- Severity: `info`
- Action: Marketing campaign, user onboarding

**LowAgentsPerDAO:**
- Alert якщо середня кількість агентів < 1
- Severity: `info`
- Action: Promote agent creation, onboarding flows

**LowUsersPerDAO:**
- Alert якщо середня кількість користувачів < 2
- Severity: `info`
- Action: User acquisition, engagement campaigns

**StalledGrowth:**
- Alert якщо немає росту самарі (< 5% change) за 3 дні
- Severity: `info`
- Action: Analyze trends, engagement campaigns

#### **3. Capacity Alerts (2 rules) — Planning**

**FastNodeGrowth:**
- Alert коли вузли ростуть > 20% за годину
- Severity: `info`
- Action: Monitor capacity, scale Neo4j

**FastRelationshipGrowth:**
- Alert коли зв'язки ростуть > 20% за годину
- Severity: `info`
- Action: Plan storage expansion

---

### Grafana Dashboard (Prometheus)

**File:** `grafana/dashboards/neo4j-prometheus-metrics.json`

**9 Panels:**
1. **Neo4j Health Status** — Up/Down status
2. **Exporter Scrape Duration** — Performance monitoring
3. **Nodes by Label** — Graph size over time
4. **Relationships by Type** — Graph structure
5. **Summaries per Day** — Activity trend
6. **Active DAOs (Last 7 Days)** — Engagement
7. **Average Agents per DAO** — Configuration metric
8. **Average Users per DAO** — Adoption metric
9. **Query Duration** — Performance optimization

**Access:** Grafana → Dashboards → "Neo4j Prometheus Metrics"

---

### Documentation

- [README_NEO4J_EXPORTER.md](./README_NEO4J_EXPORTER.md) — Quick start guide
- [docs/cursor/neo4j_prometheus_exporter_task.md](./docs/cursor/neo4j_prometheus_exporter_task.md) — Implementation task
- [docs/cursor/neo4j_alerting_rules_task.md](./docs/cursor/neo4j_alerting_rules_task.md) — Alerting rules documentation

---

## 📝 Next Steps

### Phase 1: Router Service Integration (Current Priority)
- [ ] **Create Dialogue Service** — `services/dialogue/service.py`
  - [ ] `continue_dialogue()` — Main dialogue flow with auto-summarization
  - [ ] `smart_reply()` — Smart reply with RAG search
  - [ ] **Integrate GraphMemory:**
    - [ ] Call `graph_memory.upsert_dialog_context()` після самарізації
    - [ ] Call `graph_memory.query_relevant_summaries_for_dialog()` для контексту
- [ ] **Add API Endpoints** — Update `router_app.py`
  - [ ] `POST /v1/dialogue/continue` — Continue dialogue
  - [ ] `GET /v1/memory/debug/{dialog_id}` — Debug memory state
  - [ ] `POST /v1/memory/search` — Search in long memory
  - [ ] `GET /v1/memory/graph/{dialog_id}` — Graph visualization data
- [ ] **Update RouterRequest** — Add `dialog_id` field
- [ ] **Configuration** — Add environment variables
- [ ] **Initialize Neo4j Schema** — Run `init_neo4j.py` on startup
- [ ] **Tests** — Unit + integration tests for all memory layers

### Phase 2: Gateway Bot Integration
- [ ] **Integrate with Gateway Bot** — Update `gateway-bot/http_api.py`
- [ ] **Unit tests** — Test all memory functions
- [ ] **Integration tests** — Test full dialogue flow
- [ ] **E2E smoke test** — Test via Telegram webhook

### Phase 2: Enhancements
- [ ] **Accurate token counting** — Use `tiktoken` for exact count
- [ ] **Emotion detection** — Better emotion analysis in summarization
- [ ] **Memory analytics** — Dashboard for memory usage
- [ ] **User preferences** — Per-user memory settings
- ✅ **Neo4j Visualization** — Grafana dashboard + Bloom configuration (complete)
- [ ] **Graph-based recommendations** — Suggest related dialogues/topics
- [ ] **Additional Grafana panels** — More insights and metrics

### Phase 3: Advanced Features
- [ ] **Memory search API** — External API for memory queries
- [ ] **Cross-user memory** — Team/DAO level memory via graph
- [ ] **Memory export** — Export user memory for GDPR
- [ ] **Memory versioning** — Track memory changes over time
- [ ] **Graph ML** — Graph embeddings for better context retrieval
- [ ] **Temporal queries** — Time-based graph traversal

---

## 🔗 Related Documentation

- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) — Server infrastructure
- [RAG-INGESTION-STATUS.md](./RAG-INGESTION-STATUS.md) — RAG system status
- [WARP.md](./WARP.md) — Developer guide
- [docs/cursor/hmm_memory_implementation_task.md](./docs/cursor/hmm_memory_implementation_task.md) — HMM Memory (Gateway Bot)
- [docs/cursor/hmm_memory_router_task.md](./docs/cursor/hmm_memory_router_task.md) — HMM Memory (Router Service)
- [docs/cursor/neo4j_graph_memory_task.md](./docs/cursor/neo4j_graph_memory_task.md) — Neo4j Graph Memory
- [docs/cursor/HMM_MEMORY_SUMMARY.md](./docs/cursor/HMM_MEMORY_SUMMARY.md) — Implementation summary

---

**Статус:** ✅ Core Modules Complete  
**✅ Gateway Bot:** `hmm_memory.py`, `dialogue.py` complete  
**✅ Router Service:** `memory.py`, `graph_memory.py`, `init_neo4j.py` complete  
**⏳ Next:** Dialogue Service + API endpoints + Neo4j integration  
**Last Updated:** 2025-01-17 by WARP AI  
**Maintained by:** Ivan Tytar & DAARION Team
