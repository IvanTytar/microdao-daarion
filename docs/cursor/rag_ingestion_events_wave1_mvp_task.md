# Task: RAG ingestion — Wave 1 (Chat messages, Docs, Files)

## Goal

Підключити **першу хвилю** RAG-ingestion подій до `rag-ingest-worker`, щоб агенти могли робити RAG по:

- чат-повідомленнях (`message.created`),
- документах/wiki (`doc.upserted`),
- файлах (`file.uploaded`),

з урахуванням режимів `public/confidential` та прапору `indexed`.

Wave 1 = **MVP RAG**: максимум корисного контексту при мінімальній кількості подій.

---

## Context

- Root: `microdao-daarion/`.
- Базовий воркер: `docs/cursor/rag_ingestion_worker_task.md`.
- Подробиці для перших подій: `docs/cursor/rag_ingestion_events_task.md` (message/doc → IngestChunk).
- Event Catalog: `docs/cursor/42_nats_event_streams_and_event_catalog.md`.
- Privacy/Confidential: 
  - `docs/cursor/47_messaging_channels_and_privacy_layers.md`
  - `docs/cursor/48_teams_access_control_and_confidential_mode.md`

Ingestion-воркер читає події з NATS JetStream (streams типу `STREAM_CHAT`, `STREAM_PROJECT`, `STREAM_TASK` або `teams.*` outbox — згідно актуальної конфігурації).

---

## 1. Принципи для Wave 1

1. **Тільки доменні події**, не CRUD по БД:
   - `message.created`, `doc.upserted`, `file.uploaded`.
2. **Поважати `mode` та `indexed`:**
   - індексувати тільки якщо `indexed = true`;
   - plaintext зберігати тільки для `public` (для `confidential` — embeddings/summary без відкритого тексту, згідно політики).
3. **Мінімальний, але стандартний payload:**
   - `team_id`, `channel_id` або `project_id`,
   - `mode` (`public | confidential`),
   - `author_user_id` / `author_agent_id`,
   - `created_at` / `updated_at`,
   - `kind` / `doc_type`,
   - `indexed` (bool),
   - `source_ref` (ID оригінальної сутності).

Ці принципи мають бути відображені як у **схемах подій**, так і в **нормалізації → IngestChunk**.

---

## 2. Event contracts (Wave 1)

### 2.1. `message.created`

Джерело: Messaging service (`STREAM_CHAT` / outbox для командних просторів).

Використати Event Envelope з `42_nats_event_streams_and_event_catalog.md`, але уточнити payload для RAG:

- Subject/type (рекомендовано): `chat.message.created`.
- Envelope:
  - `meta.team_id` — DAO / команда.
  - `payload.message_id`.
  - `payload.channel_id`.
  - `payload.author_user_id` або `payload.author_agent_id`.
  - `payload.mode`: `public | confidential`.
  - `payload.kind`: `text | image | file | system`.
  - `payload.thread_id` (optional).
  - `payload.created_at`.
  - `payload.indexed`: bool (derived: mode + налаштування каналу).
  - `payload.text_summary` / `payload.text_plain` (залежно від політики збереження plaintext).

**RAG-правила:**

- індексувати тільки якщо `payload.indexed = true`;
- якщо `kind != "text"` — пропускати в Wave 1 (image/audio/pdf покриваються через `file.uploaded`);
- якщо `mode = "confidential"` — не зберігати plaintext в Milvus metadata, тільки embeddings + мінімальні метадані.

### 2.2. `doc.upserted`

Джерело: Docs/Wiki/Co-Memory сервіс (`STREAM_PROJECT` або окремий docs-stream).

Рекомендований payload для RAG:

- `payload.doc_id`
- `payload.team_id`
- `payload.project_id`
- `payload.path` (wiki path/tree)
- `payload.title`
- `payload.text` (може бути великий)
- `payload.mode`: `public | confidential`
- `payload.indexed`: bool
- `payload.labels` / `payload.tags` (optional)
- `payload.updated_at`

**RAG-правила:**

- індексувати тільки якщо `indexed = true`;
- для великих текстів — розбивати на чанки (512–1024 символів/токенів);
- `mode = "confidential"` → embeddings без відкритого тексту.

### 2.3. `file.uploaded`

Джерело: Files/Co-Memory (`files` таблиця, окремий стрім або частина STREAM_PROJECT/STREAM_CHAT).

Рекомендований payload:

- `payload.file_id`
- `payload.owner_team_id`
- `payload.size`
- `payload.mime`
- `payload.storage_key`
- `payload.mode`: `public | confidential`
- `payload.indexed`: bool
- `payload.enc`: bool (чи зашифрований в storage)
- `payload.linked_to`: `{message_id|project_id|doc_id}`
- `payload.extracted_text_ref` (ключ до вже пропаршеного тексту, якщо є)

**RAG-правила:**

- індексувати тільки якщо `indexed = true` та `mime` ∈ текстових/документних форматів (`text/*`, `application/pdf`, `markdown`, тощо);
- якщо текст ще не витягнутий — створити ingestion-джоб (черга/OCR) і не індексувати до появи `file.text_parsed`/`file.text_ready` (це може бути окремий event у Wave 1 або 1.5).

---

## 3. Зміни в `rag-ingest-worker`

### 3.1. Routing / підписки

У `services/rag-ingest-worker/events/consumer.py`:

1. Додати (або уточнити) підписки на subjects для Wave 1:
   - `chat.message.created`
   - `doc.upserted` (назву узгодити з фактичним стрімом — напр. `project.doc.upserted`)
   - `file.uploaded`
2. Ввести **routing таблицю** (може бути dict):

   - `"chat.message.created" → handle_message_created`
   - `"doc.upserted" → handle_doc_upserted`
   - `"file.uploaded" → handle_file_uploaded`

3. Кожен handler повинен:
   - розпарсити envelope (`event`, `meta.team_id`, `payload`),
   - перевірити `indexed` та `mode`,
   - викликати відповідну функцію нормалізації з `pipeline/normalization.py`,
   - віддати chunks в embedding + Milvus + Neo4j.

### 3.2. Нормалізація у `pipeline/normalization.py`

Розширити/уточнити:

- `async def normalize_message_created(event: dict) -> list[IngestChunk]:`
  - орієнтуватися на схему з `rag_ingestion_events_task.md` + тепер **додати перевірку `indexed`/`mode`**;
  - повертати 0 чанків, якщо `indexed = false` або `kind != "text"`.

- `async def normalize_doc_upserted(event: dict) -> list[IngestChunk]:`
  - аналогічно до `normalize_doc_upsert` з `rag_ingestion_events_task.md`, але з полями `indexed`, `mode`, `labels`;
  - розбивати довгі тексти.

- `async def normalize_file_uploaded(event: dict) -> list[IngestChunk]:`
  - якщо текст уже доступний (через `extracted_text_ref` або інший сервіс) — розбити на чанки;
  - якщо ні — поки що повертати `[]` і логувати TODO (інтеграція з parser/Co-Memory).

У всіх нормалізаторах стежити, щоб:

- `chunk_id` був детермінованим (див. `rag_ingestion_worker_task.md`),
- `visibility` / `mode` коректно мапились (public/confidential),
- `source_type` ∈ {`"message"`, `"doc"`, `"file"`},
- метадані включали `team_id`, `channel_id`/`project_id`, `author_id`, `created_at`.

### 3.3. Embeddings + Milvus/Neo4j

У Wave 1 достатньо:

- використовувати вже існуючі пайплайни з `rag_ingestion_worker_task.md`:
  - `embedding.embed_chunks(chunks)`
  - `index_milvus.upsert_chunks_to_milvus(...)`
  - `index_neo4j.update_graph_for_event(event, chunks)` (мінімальний граф: User–Message–Channel, Project–Doc, File–(Message|Doc|Project)).

Головне — **ідемпотентний upsert** по `chunk_id` (Milvus) та `MERGE` в Neo4j.

---

## 4. Узгодження з Meilisearch indexer

Хоча цей таск фокусується на RAG (Milvus/Neo4j), потрібно:

1. Переконатися, що логіка `indexed`/`mode` **співпадає** з існуючим search-indexer (Meilisearch) для:
   - `chat.message.created` / `chat.message.updated`,
   - `doc.upserted`,
   - `file.uploaded` (якщо вже індексується).
2. По можливості, винести спільну функцію/константу для визначення `indexed` (based on channel/project settings), щоб RAG та Meilisearch не роз’їхались.

---

## 5. Тестування

Мінімальний набір тестів (unit/integration):

1. **Unit:**
   - `normalize_message_created`:
     - `indexed=false` → `[]`;
     - `kind != "text"` → `[]`;
     - `mode=public/indexed=true` → валідні `IngestChunk` з текстом;
     - `mode=confidential/indexed=true` → валідні `IngestChunk` без plaintext у метаданих.
   - `normalize_doc_upserted`:
     - довгий текст → декілька чанків з коректними `chunk_id`;
     - `indexed=false` → `[]`.
   - `normalize_file_uploaded`:
     - текст доступний → чанки;
     - текст недоступний → `[]` + лог.

2. **Integration (dev):**
   - опублікувати test-event `chat.message.created` у dev-стрім;
   - перевірити по логах, що воркер:
     - спожив подію,
     - зробив N чанків,
     - відправив їх у embedding + Milvus;
   - повторно відправити **ту ж саму** подію і переконатися, що дублікатів у Milvus немає.

---

## Files to create/modify (suggested)

> Актуальні шляхи можуть трохи відрізнятися — орієнтуйся по існуючому `rag-ingest-worker`.

- `services/rag-ingest-worker/events/consumer.py`
  - додати routing для `chat.message.created`, `doc.upserted`, `file.uploaded`;
  - для кожної події — handler з перевіркою `indexed`/`mode` та викликом нормалізатора.

- `services/rag-ingest-worker/pipeline/normalization.py`
  - реалізувати/оновити:
    - `normalize_message_created(event)`
    - `normalize_doc_upserted(event)`
    - `normalize_file_uploaded(event)`

- (за потреби) `services/rag-ingest-worker/pipeline/index_neo4j.py`
  - оновити побудову графових вузлів/ребер для Message/Doc/File.

- Тести для нормалізаторів (якщо є тестовий пакет). 

---

## Acceptance criteria

1. `rag-ingest-worker` підписаний на Wave 1 події (`chat.message.created`, `doc.upserted`, `file.uploaded`) у dev-конфігурації.
2. Для кожної події є нормалізатор, який:
   - поважає `mode` та `indexed`;
   - повертає коректні `IngestChunk` з потрібними полями.
3. Чанки успішно проходять через embedding-пайплайн і індексуються в Milvus з ідемпотентною семантикою (`chunk_id`).
4. Neo4j отримує хоча б базові вузли/ребра для Message/Doc/File.
5. Повторне програвання тих самих подій **не створює дублікатів** у Milvus/Neo4j.
6. Логіка `indexed`/`mode` для RAG узгоджена з Meilisearch search-indexer.
7. Цей файл (`docs/cursor/rag_ingestion_events_wave1_mvp_task.md`) можна виконати через Cursor:

   ```bash
   cursor task < docs/cursor/rag_ingestion_events_wave1_mvp_task.md
   ```

   і Cursor використовує його як джерело правди для реалізації Wave 1 RAG-ingestion.
