# Task: Document "RAG Ingestion Events" in Event Catalog & Data Model

## Goal

Оформити **єдиний розділ** "RAG Ingestion Events" у документації, який описує:

- які саме події потрапляють у RAG-ingestion (Wave 1–3),
- їх payload-схеми та поля `mode`/`indexed`,
- mapping до Milvus/Neo4j,
- JetStream streams/subjects і consumer group `rag-ingest-worker`.

Це дозволить усім сервісам узгоджено генерувати події для RAG-шару.

---

## Context

- Root: `microdao-daarion/`.
- Основний Event Catalog: `docs/cursor/42_nats_event_streams_and_event_catalog.md`.
- RAG-шар:
  - `docs/cursor/rag_gateway_task.md`
  - `docs/cursor/rag_ingestion_worker_task.md`
  - хвилі подій:
    - `docs/cursor/rag_ingestion_events_wave1_mvp_task.md`
    - `docs/cursor/rag_ingestion_events_wave2_workflows_task.md`
    - `docs/cursor/rag_ingestion_events_wave3_governance_rwa_task.md`
  - деталізація для перших подій: `docs/cursor/rag_ingestion_events_task.md`.

---

## 1. Новий розділ у Event Catalog

У файлі `docs/cursor/42_nats_event_streams_and_event_catalog.md` додати окремий розділ, наприклад:

```markdown
## 18. RAG Ingestion Events
```

У цьому розділі:

1. Коротко пояснити, що **не всі** події індексуються в RAG, а тільки відібрані (Wave 1–3).
2. Дати таблицю з колонками:
   - `Event type`
   - `Stream`
   - `Subject`
   - `Wave`
   - `Ingested into RAG?`
   - `Milvus doc_type`
   - `Neo4j nodes/edges`

Приклади рядків:

- `chat.message.created` → STREAM_CHAT → Wave 1 → `doc_type="message"` → `User–Message–Channel`.
- `doc.upserted` → STREAM_PROJECT/docs → Wave 1 → `doc_type="doc"` → `Project–Doc`.
- `file.uploaded` → STREAM_PROJECT/files → Wave 1 → `doc_type="file"` → `File–(Message|Doc|Project)`.
- `task.created`/`task.updated` → STREAM_TASK → Wave 2 → `doc_type="task"` → `Task–Project–User`.
- `followup.created` → STREAM_TASK/FOLLOWUP → Wave 2 → `doc_type="followup"` → `Followup–Message–User`.
- `meeting.summary.upserted` → STREAM_PROJECT/MEETING → Wave 2 → `doc_type="meeting"` → `Meeting–Project–User/Agent`.
- `governance.proposal.created` → STREAM_GOVERNANCE → Wave 3 → `doc_type="proposal"` → `Proposal–User–MicroDAO`.
- `rwa.summary.created` → STREAM_RWA → Wave 3 → `doc_type="rwa_summary"` → `RWAObject–RwaSummary`.

---

## 2. Поля `mode` та `indexed`

У тому ж розділі описати обовʼязкові поля для всіх RAG-подій:

- `mode`: `public|confidential` — впливає на те, чи зберігається plaintext у Milvus;
- `indexed`: bool — чи взагалі подія потрапляє у RAG-шар (RAG та Meilisearch мають однакову логіку);
- `team_id`, `channel_id` / `project_id`, `author_id`, timestamps.

Додати невеликий підрозділ з правилами:

- якщо `indexed=false` → ingestion-воркер не створює чанків;
- якщо `mode=confidential` → зберігається тільки embeddings + мінімальні метадані.

---

## 3. Mapping до Milvus/Neo4j (таблиці)

У новому розділі (або окремому `.md`) додати 2 узагальнюючі таблиці:

### 3.1. Event → Milvus schema

Колонки:

- `Event type`
- `Milvus doc_type`
- `Key metadata`
- `Chunking strategy`

### 3.2. Event → Neo4j graph

Колонки:

- `Event type`
- `Nodes`
- `Relationships`
- `Merge keys`

Приклади для першої таблиці:

- `chat.message.created` → `message` → (`team_id`, `channel_id`, `author_id`, `thread_id`, `created_at`) → no chunking/short text.
- `doc.upserted` → `doc` → (`team_id`, `project_id`, `path`, `labels`) → chunk by 512–1024.
- `meeting.summary.upserted` → `meeting` → (`team_id`, `project_id`, `meeting_id`, `tags`) → chunk by paragraph.

Та аналогічно для Neo4j (User–Message–Channel, Task–Project–User, Proposal–User–MicroDAO тощо).

---

## 4. Consumer group `rag-ingest-worker`

У розділі про Consumer Groups (`## 10. Consumer Groups`) додати `rag-ingest-worker` як окремого consumer для відповідних стрімів:

- STREAM_CHAT → `search-indexer`, `rag-ingest-worker`.
- STREAM_PROJECT → `rag-ingest-worker`.
- STREAM_TASK → `rag-ingest-worker`.
- STREAM_GOVERNANCE → `rag-ingest-worker`.
- STREAM_RWA → (тільки summary-події) → `rag-ingest-worker`.

Пояснити, що worker може використовувати **durable consumers** з at-least-once доставкою, та що ідемпотентність гарантується на рівні `chunk_id`/Neo4j MERGE.

---

## 5. Оновлення Data Model / Architecture docs

За потреби, у відповідних документах додати короткі посилання на RAG-ingestion:

- у `34_internal_services_architecture.md` — блок "RAG-ingest-worker" як окремий internal service, що споживає NATS і пише в Milvus/Neo4j;
- у `23_domains_wallet_dao_deepdive.md` або `MVP_VERTICAL_SLICE.md` — згадку, що доменні події є джерелом правди для RAG.

---

## Acceptance criteria

1. У `42_nats_event_streams_and_event_catalog.md` зʼявився розділ "RAG Ingestion Events" із:
   - таблицею подій Wave 1–3,
   - вказаними streams/subjects,
   - позначкою, чи індексується подія в RAG.
2. Описані єдині вимоги до полів `mode` та `indexed` для всіх RAG-подій.
3. Є 2 таблиці зі схемами mapping → Milvus та Neo4j.
4. Consumer group `rag-ingest-worker` доданий до відповідних стрімів і задокументований.
5. За потреби, оновлені архітектурні документи (`34_internal_services_architecture.md` тощо) з коротким описом RAG-ingest-worker.
6. Цей файл (`docs/cursor/rag_ingestion_events_catalog_task.md`) можна виконати через Cursor:

   ```bash
   cursor task < docs/cursor/rag_ingestion_events_catalog_task.md
   ```

   і він стане єдиною задачею для документування RAG Ingestion Events у каталозі подій.
