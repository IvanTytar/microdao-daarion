# 📊 RAG Event-Driven Ingestion — Status

**Версія:** 1.0.0  
**Останнє оновлення:** 2025-01-17  
**Статус:** ✅ Wave 1, 2, 3 Complete

---

## 🎯 Overview

Event-driven архітектура для автоматичного інжесту контенту в RAG систему через NATS JetStream. Система підписується на різні типи events з різних streams та автоматично індексує контент у Milvus та Neo4j.

**Документація:**
- [Event Catalog](./docs/cursor/42_nats_event_streams_and_event_catalog.md) — Повний каталог NATS streams та events
- [Wave 1 Task](./docs/cursor/rag_ingestion_events_wave1_mvp_task.md) — Chat/Docs/Files ingestion
- [Wave 2 Task](./docs/cursor/rag_ingestion_events_wave2_workflows_task.md) — Tasks/Followups/Meetings ingestion
- [Wave 3 Task](./docs/cursor/rag_ingestion_events_wave3_governance_rwa_task.md) — Governance/RWA/Oracle ingestion

---

## ✅ Wave 1: Chat Messages, Documents, Files (MVP)

**Статус:** ✅ Complete  
**Дата завершення:** 2025-01-16

### Implemented Features

#### Event Handlers (rag-service/event_worker.py)
- ✅ `handle_document_parsed_event()` — обробка `rag.document.parsed` з `STREAM_RAG`
- ✅ Автоматичний інжест parsed documents в Milvus + Neo4j
- ✅ Ідемпотентність (пропуск вже індексованих документів)
- ✅ Публікація події `rag.document.indexed` після успішної індексації

#### Event Publishing (rag-service/events.py)
- ✅ `publish_document_indexed()` — публікація `rag.document.indexed`
- ✅ Connection management з NATS
- ✅ Retry logic при помилках публікації

#### Event Publishing (parser-service/events.py)
- ✅ `publish_document_parsed()` — публікація `rag.document.parsed` після OCR
- ✅ Інтеграція в API endpoints (`/ocr/parse`, `/ocr/parse_markdown`, etc.)

#### Infrastructure
- ✅ NATS JetStream service в `docker-compose.yml`
- ✅ `STREAM_RAG` створено з subjects:
  - `rag.document.parsed`
  - `rag.document.indexed`
  - `rag.document.reindexed`
  - `rag.chat.message.created`
  - `rag.file.uploaded`
- ✅ Lifespan startup в `rag-service` — автоматичний запуск event worker
- ✅ Environment variables (`NATS_URL`) в конфігурації

### Testing
- ✅ Unit tests для event publishing
- ✅ Unit tests для event consumption
- [ ] E2E smoke test (parser → NATS → rag-service)

---

## ✅ Wave 2: Tasks, Followups, Meetings

**Статус:** ✅ Complete  
**Дата завершення:** 2025-01-17

### Implemented Features

#### Event Handlers (rag-service/event_worker.py)
- ✅ `handle_task_created_event()` — обробка `task.created` з `STREAM_TASK`
- ✅ `handle_task_updated_event()` — обробка `task.updated` з `STREAM_TASK`
- ✅ `handle_meeting_transcript_event()` — обробка `meeting.transcript.created` з `STREAM_MEETING`
- ✅ Автоматичний інжест tasks при створенні/оновленні
- ✅ Автоматичний інжест meeting transcripts
- ✅ Helper function `_ingest_content_to_rag()` для універсального інжесту

#### Event Publishing (rag-service/events.py)
- ✅ `publish_task_indexed()` — публікація `rag.task.indexed`
- ✅ `publish_task_reindexed()` — публікація `rag.task.reindexed`
- ✅ `publish_meeting_indexed()` — публікація `rag.meeting.indexed`

#### Subscriptions
- ✅ `STREAM_TASK.task.created`
- ✅ `STREAM_TASK.task.updated`
- ✅ `STREAM_MEETING.meeting.transcript.created`

### Data Ingested
- Tasks: title, description, assignee, status, priority, labels, project_id
- Meetings: transcript, attendees, duration, summary, dao_id, team_id

### Neo4j Graph Relations (Future)
- [ ] Task → User (assignee)
- [ ] Task → Project
- [ ] Meeting → User (attendees)
- [ ] Meeting → Team

---

## ✅ Wave 3: Governance, RWA, Oracle

**Статус:** ✅ Complete  
**Дата завершення:** 2025-01-17

### Implemented Features

#### Event Handlers (rag-service/event_worker.py)
- ✅ `handle_governance_policy_event()` — обробка `governance.policy.created/updated` з `STREAM_GOVERNANCE`
- ✅ `handle_governance_proposal_event()` — обробка `governance.proposal.created` з `STREAM_GOVERNANCE`
- ✅ `handle_rwa_inventory_event()` — обробка `rwa.inventory.updated` з `STREAM_RWA`
- ✅ `handle_oracle_reading_event()` — обробка `oracle.reading.published` з `STREAM_ORACLE`
  - ✅ Фільтрація тільки важливих readings (критичні зміни)

#### Event Publishing (rag-service/events.py)
- ✅ `publish_governance_policy_indexed()` — публікація `rag.governance.policy.indexed`
- ✅ `publish_governance_proposal_indexed()` — публікація `rag.governance.proposal.indexed`
- ✅ `publish_rwa_inventory_indexed()` — публікація `rag.rwa.inventory.indexed`
- ✅ `publish_oracle_reading_indexed()` — публікація `rag.oracle.reading.indexed`

#### Subscriptions
- ✅ `STREAM_GOVERNANCE.governance.policy.*` (created/updated)
- ✅ `STREAM_GOVERNANCE.governance.proposal.created`
- ✅ `STREAM_RWA.rwa.inventory.updated`
- ✅ `STREAM_ORACLE.oracle.reading.published`

### Data Ingested

**Governance:**
- Policies: title, description, rules, enforcement_level, dao_id
- Proposals: title, description, proposer_id, vote_count, status

**RWA (Real World Assets):**
- Inventory updates: stock levels, locations, energy generation, water quality
- Platform: GREENFOOD, Energy Union, Water Union

**Oracle:**
- Sensor readings (тільки важливі): temperature thresholds, pressure alerts, quality changes
- Automatic filtering based on severity

### Neo4j Graph Relations (Future)
- [ ] Proposal → User (proposer)
- [ ] Proposal → DAO
- [ ] Policy → DAO
- [ ] RWA Asset → Platform
- [ ] Oracle Reading → Asset

---

## 🏗️ Architecture

### Event Flow

```
┌─────────────────┐
│  Parser Service │
│  (OCR Pipeline) │
└────────┬────────┘
         │ publish
         ▼
    ┌────────┐
    │  NATS  │
    │ Stream │ ← STREAM_RAG, STREAM_TASK, STREAM_MEETING,
    └────┬───┘   STREAM_GOVERNANCE, STREAM_RWA, STREAM_ORACLE
         │ subscribe
         ▼
┌─────────────────┐
│  RAG Service    │
│  Event Worker   │
│  ├ Wave 1       │
│  ├ Wave 2       │
│  └ Wave 3       │
└────────┬────────┘
         │ ingest
         ▼
    ┌──────────────┐
    │ Milvus + Neo4j│
    │ Vector DB     │
    └──────────────┘
         │
         ▼ publish
    ┌────────┐
    │  NATS  │ ← rag.*.indexed events
    └────────┘
```

### Event Worker (rag-service/event_worker.py)

**Parallel Subscriptions:**
```python
await asyncio.gather(
    subscribe_to_rag_events(js),       # Wave 1: STREAM_RAG
    subscribe_to_task_events(js),      # Wave 2: STREAM_TASK
    subscribe_to_meeting_events(js),   # Wave 2: STREAM_MEETING
    subscribe_to_governance_events(js), # Wave 3: STREAM_GOVERNANCE
    subscribe_to_rwa_events(js),       # Wave 3: STREAM_RWA
    subscribe_to_oracle_events(js),    # Wave 3: STREAM_ORACLE
)
```

**Graceful Handling:**
- ⚠️ Warning logs for missing streams (не падає)
- 🔄 Automatic retry при помилках (не ack повідомлення)
- ✅ Ідемпотентність через перевірку `indexed` flag

---

## 📦 File Structure

```
services/
├── parser-service/
│   └── app/
│       └── events.py              # Event publishing (Wave 1)
│           ├── publish_document_parsed()
│           └── NATS connection management
│
└── rag-service/
    └── app/
        ├── events.py              # Event publishing (Waves 1, 2, 3)
        │   ├── Wave 1: publish_document_indexed()
        │   ├── Wave 2: publish_task_indexed(), publish_meeting_indexed()
        │   └── Wave 3: publish_governance_*(), publish_rwa_*(), publish_oracle_*()
        │
        ├── event_worker.py        # Event handlers & subscriptions (Waves 1, 2, 3)
        │   ├── Wave 1: handle_document_parsed_event()
        │   ├── Wave 2: handle_task_*(), handle_meeting_*()
        │   ├── Wave 3: handle_governance_*(), handle_rwa_*(), handle_oracle_*()
        │   └── Helper: _ingest_content_to_rag()
        │
        ├── worker.py              # Async ingestion jobs
        └── main.py                # Lifespan startup (автозапуск event worker)
```

---

## 🔧 Configuration

### Environment Variables

```bash
# NATS Configuration
NATS_URL=nats://nats:4222

# RAG Service
RAG_SERVICE_URL=http://rag-service:9500

# Parser Service
PARSER_SERVICE_URL=http://parser-service:9400

# Milvus
MILVUS_HOST=milvus
MILVUS_PORT=19530

# Neo4j
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
```

### NATS Streams to Create

**Before running the system, create these streams:**

```bash
# Wave 1
python scripts/init_nats_streams.py STREAM_RAG

# Wave 2
python scripts/init_nats_streams.py STREAM_TASK
python scripts/init_nats_streams.py STREAM_MEETING

# Wave 3
python scripts/init_nats_streams.py STREAM_GOVERNANCE
python scripts/init_nats_streams.py STREAM_RWA
python scripts/init_nats_streams.py STREAM_ORACLE
```

**Or create all at once:**
```bash
python scripts/init_nats_streams.py --all
```

---

## 🧪 Testing

### Unit Tests

**Parser Service:**
```bash
cd services/parser-service
python -m pytest tests/test_events.py
```

**RAG Service:**
```bash
cd services/rag-service
python -m pytest tests/test_events.py
python -m pytest tests/test_event_worker.py
```

### E2E Tests

**Wave 1 (Document Parsing):**
```bash
# 1. Upload document через parser-service
curl -X POST http://localhost:9400/ocr/parse \
  -F "file=@test.pdf" \
  -F "dao_id=test-dao"

# 2. Check rag-service logs для document indexed event
docker-compose logs -f rag-service | grep "indexed"

# 3. Verify document in Milvus
curl http://localhost:9500/search?query=test&dao_id=test-dao
```

**Wave 2 (Tasks):**
```bash
# 1. Create task через task service (or manually publish event)
curl -X POST http://localhost:TASK_SERVICE_PORT/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Test task", "description": "Description", "dao_id": "test-dao"}'

# 2. Check rag-service logs
docker-compose logs -f rag-service | grep "task.indexed"

# 3. Search for task in RAG
curl http://localhost:9500/search?query=test+task&dao_id=test-dao
```

**Wave 3 (Governance):**
```bash
# Similar flow for governance proposals, RWA updates, oracle readings
```

---

## 📊 Monitoring

### Health Checks

```bash
# NATS
curl http://localhost:8222/healthz

# RAG Service
curl http://localhost:9500/health

# Parser Service
curl http://localhost:9400/health
```

### Event Worker Status

```bash
# Check if event worker is running
docker-compose logs rag-service | grep "Event worker started"

# Check subscriptions
docker-compose logs rag-service | grep "Subscribed to"

# Check event processing
docker-compose logs rag-service | grep "Processing event"
```

### NATS Stream Status

```bash
# Using NATS CLI
nats stream list
nats stream info STREAM_RAG
nats stream info STREAM_TASK
nats stream info STREAM_MEETING
nats stream info STREAM_GOVERNANCE
nats stream info STREAM_RWA
nats stream info STREAM_ORACLE
```

---

## 🚀 Deployment

### Docker Compose

**services/rag-service/docker-compose.yml:**
```yaml
services:
  nats:
    image: nats:latest
    command: "-js"
    ports:
      - "4222:4222"
      - "8222:8222"

  rag-service:
    build: ./services/rag-service
    environment:
      - NATS_URL=nats://nats:4222
      - MILVUS_HOST=milvus
      - NEO4J_URI=bolt://neo4j:7687
    depends_on:
      - nats
      - milvus
      - neo4j
```

### Start Services

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# Initialize NATS streams
python scripts/init_nats_streams.py --all

# View logs
docker-compose logs -f rag-service
```

---

## 📝 Next Steps

### Phase 1: Stabilization (Current Priority)
- [ ] **E2E smoke tests** для всіх 3 waves
- [ ] **Monitoring dashboard** (Prometheus + Grafana)
- [ ] **Alerting** на помилки event processing
- [ ] **Performance benchmarks** (throughput, latency)

### Phase 2: Enhancement
- [ ] **Neo4j graph relations** для всіх entity types
- [ ] **Search improvements** (hybrid search, re-ranking)
- [ ] **Batch ingestion** для bulk uploads
- [ ] **Dead letter queue** для failed events

### Phase 3: Advanced Features
- [ ] **Event replay** для re-indexing
- [ ] **Versioning** документів (old vs new)
- [ ] **Access control** в RAG queries (RBAC integration)
- [ ] **Multi-modal search** (text + image + metadata)

---

## 🔗 Related Documentation

- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) — Server infrastructure, deployment
- [WARP.md](./WARP.md) — Developer guide, architecture overview
- [docs/agents.md](./docs/agents.md) — Agent hierarchy (A1-A4)
- [docs/cursor/42_nats_event_streams_and_event_catalog.md](./docs/cursor/42_nats_event_streams_and_event_catalog.md) — Event Catalog
- [TODO-PARSER-RAG.md](./TODO-PARSER-RAG.md) — Parser Agent implementation roadmap

---

**Статус:** ✅ Wave 1, 2, 3 Complete  
**Last Updated:** 2025-01-17 by WARP AI  
**Maintained by:** Ivan Tytar & DAARION Team
