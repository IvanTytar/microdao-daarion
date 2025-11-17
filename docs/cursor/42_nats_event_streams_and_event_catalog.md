# 42 — NATS Event Streams & Event Catalog (MicroDAO)

*NATS JetStream архітектура, топіки, схеми подій, ретенція, реплікація, кластеризація, consumer groups, replay, дедуплікація, outbox-pattern інтеграція*

---

## 1. Purpose & Scope

Цей документ визначає **офіційний Event Catalog DAARION.city**:

- перелік усіх подій (events),
- схеми Payloadів,
- NATS-стріми та топіки,
- lifecycle подій,
- гарантії доставки,
- retention правила,
- інструкції для сервісів,
- інтеграцію з Outbox Worker,
- безпеку та ACL для стрімів.

Це база для:

- Wallet Service,
- Agent Orchestrator,
- Embassy/RWA,
- Governance Agent,
- Usage Service,
- Analytics/Monitoring,
- Replaying events (for recovery).

---

## 2. JetStream Cluster Model

DAARION використовує **3-5 вузлів JetStream кластеру** з параметрами:

- Replication: **3**
- Acknowledgement: **explicit**
- Storage: **file (SSD)**
- Retention: **WorkQueue** або **Interest** залежно від стріму

---

## 3. Event Categories Overview

Уся система складається з 14 груп подій:

1. **agent.run.***
2. **chat.message.***
3. **project.***
4. **task.***
5. **wallet.***
6. **staking.***
7. **payout.***
8. **embassy.***
9. **oracle.***
10. **rwa.inventory.***
11. **governance.***
12. **usage.***
13. **telemetry.***
14. **rag.***

Кожна категорія має окремий JetStream "stream".

---

## 4. Stream Naming Convention

```text
STREAM_<DOMAIN>
```

Приклади:

```text
STREAM_AGENT_RUN
STREAM_CHAT
STREAM_EMBASSY
STREAM_RWA
STREAM_GOVERNANCE
STREAM_WALLET
STREAM_USAGE
```

---

## 5. Topic Naming Convention (Subjects)

```text
<domain>.<subdomain>.<action>
```

Приклади:

```text
agent.run.started
agent.run.completed
wallet.payout.generated
embassy.energy.update
rwa.inventory.updated
governance.policy.updated
```

---

## 6. Event Envelope

Усі події використовують уніфікований формат:

```json
{
  "event_id": "evt_123",
  "ts": "2025-11-14T12:00:00Z",
  "domain": "agent",
  "type": "agent.run.completed",
  "version": 1,
  "actor": {
    "id": "u_123",
    "kind": "user|agent|service|embassy"
  },
  "payload": { ... },
  "meta": {
    "team_id": "t_555",
    "trace_id": "trace_abc",
    "span_id": "span_def"
  }
}
```

---

## 7. Outbox Integration (Guaranteed Delivery)

Усі сервіси, що генерують події, пишуть *спочатку* в таблицю:

```text
outbox_events
```

Далі Outbox Worker:

1. читає записи `processed=false`
2. публікує у NATS
3. позначає `processed=true`

Гарантія: **at-least-once delivery**

---

## 8. Stream-by-Stream Specification

---

### 8.1 STREAM_AGENT_RUN

#### Subjects:

- `agent.run.started`
- `agent.run.completed`
- `agent.run.failed`
- `agent.run.rate_limited`

#### Payloads

**agent.run.started**

```json
{
  "agent_run_id": "ar_123",
  "agent_id": "ag_555",
  "team_id": "t_444",
  "model": "gpt-4o-mini",
  "tools": ["math", "memory"],
  "input_summary": "..."
}
```

**agent.run.completed**

```json
{
  "agent_run_id": "ar_123",
  "duration_ms": 3421,
  "tokens_used": 1842,
  "cost_1t": 0.00023,
  "output_summary": "..."
}
```

---

### 8.2 STREAM_CHAT

#### Subjects:

- `chat.message.created`
- `chat.message.updated`
- `chat.message.deleted`

#### Payload:

```json
{
  "message_id": "msg_777",
  "channel_id": "ch_222",
  "team_id": "t_555",
  "type": "user|agent|system",
  "summary": "...",        // plaintext not included
  "embeddings": "<ref>"
}
```

---

### 8.3 STREAM_PROJECT

- `project.created`
- `project.updated`

Payload:

```json
{
  "project_id": "p_111",
  "team_id": "t_444",
  "fields": { ... }
}
```

---

### 8.4 STREAM_TASK

- `task.created`
- `task.updated`
- `task.completed`

Payload:

```json
{
  "task_id": "tsk_001",
  "project_id": "p_111",
  "team_id": "t_444",
  "status": "open|in_progress|done"
}
```

---

### 8.5 STREAM_WALLET

Subjects:

- `wallet.balance.updated`
- `wallet.tx.sent`
- `wallet.tx.confirmed`

Payload:

```json
{
  "user_id": "u_123",
  "team_id": "t_555",
  "symbol": "KWT|1T|DAARION",
  "amount": 12.55
}
```

---

### 8.6 STREAM_STAKING

Subjects:

- `staking.locked`
- `staking.unlocked`

Payload:

```json
{
  "user_id": "u_x",
  "team_id": "t_y",
  "amount": 1000,
  "symbol": "RINGK"
}
```

---

### 8.7 STREAM_PAYOUT

Subjects:

- `payout.generated`
- `payout.claimed`
- `payout.failed`

Payload:

```json
{
  "payout_id": "payout_727",
  "team_id": "t_555",
  "symbol": "KWT",
  "amount": 3.5,
  "rwa_ref": "inv_888"
}
```

---

### 8.8 STREAM_EMBASSY

Subjects:

- `embassy.energy.update`
- `embassy.food.update`
- `embassy.water.update`
- `embassy.event.received`

Payload:

```json
{
  "platform": "energyunion",
  "domain": "energy",
  "site_id": "EU-KYIV-01",
  "value": 125.4,
  "unit": "kwh",
  "ts": "..."
}
```

---

### 8.9 STREAM_ORACLE

Subjects:

- `oracle.reading.published`

Payload:

```json
{
  "domain": "energy",
  "site_id": "EU-KYIV-01",
  "normalized_value": 125.4,
  "delta": 23.1,
  "ts": "..."
}
```

---

### 8.10 STREAM_RWA

Subjects:

- `rwa.inventory.updated`

Payload:

```json
{
  "inventory_id": "inv_001",
  "domain": "energy",
  "site_id": "EU-KYIV-01",
  "value": 125.4,
  "delta": 23.1,
  "unit": "kwh"
}
```

---

### 8.11 STREAM_GOVERNANCE

Subjects:

- `governance.policy.created`
- `governance.policy.updated`
- `governance.policy.failed`

Payload:

```json
{
  "policy_id": "gov_0012",
  "type": "plan.entitlement.update",
  "status": "applied"
}
```

---

### 8.12 STREAM_USAGE

Subjects:

- `usage.agent_run.increment`
- `usage.llm.increment`
- `usage.embassy.increment`

Payload:

```json
{
  "team_id": "t_555",
  "metric": "agent_runs",
  "value": 1
}
```

---

### 8.13 STREAM_TELEMETRY

Subjects:

- `telemetry.event`
- `telemetry.error`
- `telemetry.screen_view`

Payload:

```json
{
  "client": "web",
  "event": "screen_view",
  "screen": "dashboard",
  "ts": "..."
}
```

---

### 8.14 STREAM_RAG

#### Subjects:

- `parser.document.parsed`
- `rag.document.ingested`
- `rag.document.indexed`

#### Payloads

**parser.document.parsed**

```json
{
  "event_id": "evt_abc",
  "ts": "2025-11-17T10:45:00Z",
  "domain": "parser",
  "type": "parser.document.parsed",
  "version": 1,
  "actor": {
    "id": "parser-service",
    "kind": "service"
  },
  "payload": {
    "doc_id": "doc_123",
    "team_id": "t_555",
    "dao_id": "dao_greenfood",
    "doc_type": "pdf|image",
    "pages_count": 5,
    "parsed_jpumped": true,
    "indexed": true,
    "visibility": "public",
    "metadata": {
      "title": "Sample Document",
      "size_bytes": 12345,
      "parsing_time_ms": 2340
    }
  },
  "meta": {
    "team_id": "t_555",
    "trace_id": "trace_abc",
    "span_id": "span_def"
  }
}
```

**rag.document.ingested**

```json
{
  "event_id": "evt_def",
  "ts": "2025-11-17T10:46:00Z",
  "domain": "rag",
  "type": "rag.document.ingested",
  "version": 1,
  "actor": {
    "id": "rag-service",
    "kind": "service"
  },
  "payload": {
    "doc_id": "doc_123",
    "team_id": "t_555",
    "dao_id": "dao_greenfood",
    "chunk_count": 12,
    "indexed": true,
    "visibility": "public",
    "metadata": {
      "ingestion_time_ms": 3134,
      "embed_model": "bge-m3@v1"
    }
  },
  "meta": {
    "team_id": "t_555",
    "trace_id": "trace_def",
    "span_id": "span_ghi"
  }
}
```

**rag.document.indexed**

```json
{
  "event_id": "evt_ghi",
  "ts": "2025-11-17T10:47:00Z",
  "domain": "rag",
  "type": "rag.document.indexed",
  "version": 1,
  "actor": {
    "id": "rag-ingest-worker",
    "kind": "service"
  },
  "payload": {
    "doc_id": "doc_123",
    "team_id": "t_555",
    "dao_id": "dao_greenfood",
    "chunk_ids": ["c_001", "c_002", "c_003"],
    "indexed": true,
    "visibility": "public",
    "metadata": {
      "indexing_time_ms": 127,
      "milvus_collection": "documents_v1",
      "neo4j_nodes_created": 12
    }
  },
  "meta": {
    "team_id": "t_555",
    "trace_id": "trace_ghi",
    "span_id": "span_jkl"
  }
}
```

---

## 9. Retention Policies

### Agent, Chat, Project, Task

```text
retention: 14–90 days
storage: workqueue
```

### RWA, Embassy, Oracle

```text
retention: 1–3 years
storage: file
```

### Governance

```text
retention: permanent
storage: file
```

### Wallet, Payout, Staking

```text
retention: 3–7 years
storage: file
```

---

## 10. Consumer Groups

Для кожного стріму визначені consumer groups:

| Stream            | Consumers             |
| ----------------- | --------------------- |
| STREAM_AGENT_RUN  | telemetry, analytics  |
| STREAM_WALLET     | wallet, payout, usage |
| STREAM_RWA        | wallet, dashboard     |
| STREAM_EMBASSY    | oracle, usage         |
| STREAM_GOVERNANCE | PDP, audit            |
| STREAM_USAGE      | quota service         |
| STREAM_CHAT       | search-indexer        |
| STREAM_RAG         | rag-service, parser-service, search-indexer |

---

## 11. Message Ordering

Гарантовано:

- **per site_id** (RWA)
- **per agent_run_id**
- **per payout_id**

---

## 12. Security / ACL

### Example:

```text
SERVICE agent-orchestrator:
  allow publish: agent.run.*
  allow subscribe: usage.agent_run.*
  deny: wallet.*

SERVICE embassy:
  allow publish: embassy.*
  deny: wallet.*
```

---

## 13. Replay & Recovery

JetStream дозволяє:

- `DeliverLast`
- `DeliverByStartTime`
- `ReplayInstant`
- `ReplayOriginal`

При аваріях можна:

- відтворити RWA-потоки за 3 роки,
- відновити usage counters,
- відновити governance history,
- відтворити agent-run статистику.

---

## 14. NATS Integration with Mesh

Mesh забезпечує:

- retry,
- load-balancing,
- mTLS,
- service identities,
- audit по pod/service.

---

## 15. Integration with Other Docs

Цей документ доповнює:

- `34_internal_services_architecture.md`
- `35_microdao_service_mesh_design.md`
- `27_database_schema_migrations.md`
- `28_flows_wallet_embassy_energy_union.md`
- `40_rwa_energy_food_water_flow_specs.md`
- `41_ai_governance_agent_design.md`

---

## 16. Завдання для Cursor

```text
You are a senior backend engineer. Implement NATS Event Streams & Event Catalog using:
- 42_nats_event_streams_and_event_catalog.md
- 34_internal_services_architecture.md
- 27_database_schema_migrations.md

Tasks:
1) Configure JetStream cluster (3-5 nodes, replication=3, explicit ack, file storage).
2) Create 13 streams (STREAM_AGENT_RUN, STREAM_CHAT, STREAM_PROJECT, STREAM_TASK, STREAM_WALLET, STREAM_STAKING, STREAM_PAYOUT, STREAM_EMBASSY, STREAM_ORACLE, STREAM_RWA, STREAM_GOVERNANCE, STREAM_USAGE, STREAM_TELEMETRY).
3) Define topic naming convention and subjects for each stream.
4) Implement Event Envelope format (event_id, ts, domain, type, version, actor, payload, meta).
5) Integrate with Outbox Worker (guaranteed delivery).
6) Define payload schemas for all event types (agent.run.*, chat.message.*, project.*, task.*, wallet.*, staking.*, payout.*, embassy.*, oracle.*, rwa.inventory.*, governance.*, usage.*, telemetry.*).
7) Configure retention policies (14-90 days for agent/chat/project/task, 1-3 years for RWA/Embassy/Oracle, permanent for Governance, 3-7 years for Wallet/Payout/Staking).
8) Set up consumer groups for each stream.
9) Implement message ordering guarantees (per site_id, per agent_run_id, per payout_id).
10) Configure Security/ACL (service-level permissions).
11) Add replay & recovery capabilities (DeliverLast, DeliverByStartTime, ReplayInstant, ReplayOriginal).
12) Integrate with Service Mesh (retry, load-balancing, mTLS, service identities, audit).

Output:
- list of modified files
- diff
- summary
```

---

## 17. Summary

Цей документ визначає:

- повний Event Catalog DAARION,
- JetStream конфігурацію,
- payload формати,
- життєвий цикл подій,
- безпеку,
- ACL,
- гарантії доставки,
- інтеграцію з Outbox,
- правила retention.

Це — **єдиний, канонічний опис подій у DAARION OS**.

---

**Версія:** 1.0  
**Останнє оновлення:** 2024-11-14


