# Task: RAG ingestion — Wave 2 (Tasks, Followups, Meetings)

## Goal

Підключити **другу хвилю** подій до RAG-ingestion воркера, щоб агенти могли робити запити типу:

- "які активні задачі по цій темі?",
- "які follow-ups висять після цього меседжа?",
- "що вирішили/обговорювали на останній зустрічі?".

Wave 2 зʼєднує чат/документи (Wave 1) із **workflow-обʼєктами**: tasks, followups, meetings.

---

## Context

- Root: `microdao-daarion/`.
- RAG gateway: `docs/cursor/rag_gateway_task.md`.
- RAG ingestion worker: `docs/cursor/rag_ingestion_worker_task.md`.
- Wave 1 (chat/docs/files): `docs/cursor/rag_ingestion_events_wave1_mvp_task.md`.
- Event Catalog: `docs/cursor/42_nats_event_streams_and_event_catalog.md` (STREAM_TASK, STREAM_CHAT, STREAM_PROJECT).
- Governance/workflows контекст: `docs/cursor/23_domains_wallet_dao_deepdive.md` (якщо є).

Принципи такі ж, як у Wave 1: **доменні події**, `mode` + `indexed`, єдиний формат `IngestChunk`.

---

## 1. Події Wave 2

### 1.1. `task.created` / `task.updated`

Сутність: `tasks` (Kanban/Project-борди).

Події (STREAM_TASK):

- `task.created`
- `task.updated`
- (опційно) `task.completed`

Рекомендований RAG-пейлоад:

- `payload.task_id`
- `payload.team_id`
- `payload.project_id`
- `payload.title`
- `payload.description` (опційно, короткий текст)
- `payload.status`: `open|in_progress|done|archived`
- `payload.labels`: список тегів
- `payload.assignees`: список `user_id`
- `payload.priority` (low/medium/high)
- `payload.due` (optional)
- `payload.mode`: `public|confidential`
- `payload.indexed`: bool
- `payload.created_at`, `payload.updated_at`

**RAG-правила:**

- індексувати, якщо `indexed = true` (за замовчуванням — true для public-проєктів);
- текст = `title + короткий description` (до ~500 символів) — цього достатньо для пошуку задач;
- для `confidential` — embeddings без plaintext.

### 1.2. `followup.created` / `followup.status_changed`

Сутність: followups/reminders, привʼязані до `src_message_id`.

Події (STREAM_TASK або окремий STREAM_FOLLOWUP, якщо є):

- `followup.created`
- `followup.status_changed`

Пейлоад:

- `payload.followup_id`
- `payload.team_id`
- `payload.owner_user_id`
- `payload.src_message_id`
- `payload.title`
- `payload.description` (опційно)
- `payload.status`: `open|done|cancelled`
- `payload.due` (optional)
- `payload.mode`: `public|confidential`
- `payload.indexed`: bool (за замовчуванням true для public-командних просторів)
- `payload.created_at`, `payload.updated_at`

**RAG-правила:**

- індексувати тільки `followup.created` (створення сутності) + оновлювати метадані по `status_changed` (без нового chunk);
- текст = `title + короткий description`;
- важливий звʼязок з `Message` через `src_message_id`.

### 1.3. `meeting.created` / `meeting.summary.upserted`

Сутність: meetings (зустрічі, дзвінки, сесії).

Події (STREAM_PROJECT або окремий STREAM_MEETING):

- `meeting.created` — тільки метадані (час, учасники, посилання).
- `meeting.summary.upserted` — резюме/протокол зустрічі (AI-нотатки або вручну).

Пейлоад для `meeting.created` (мінімально для графу):

- `payload.meeting_id`
- `payload.team_id`
- `payload.project_id` (optional)
- `payload.title`
- `payload.start_at`, `payload.end_at`
- `payload.participant_ids` (user_id/agent_id)
- `payload.mode`, `payload.indexed`

Пейлоад для `meeting.summary.upserted` (RAG):

- `payload.meeting_id` (link до `meeting.created`)
- `payload.team_id`
- `payload.project_id` (optional)
- `payload.summary_text` (достатньо 1–4 абзаци)
- `payload.tags` (topics/labels)
- `payload.mode`, `payload.indexed`
- `payload.updated_at`

**RAG-правила:**

- індексувати **summary**, а не raw-транскрипт;
- summary розбивати на 1–N чанків, якщо дуже довге.

---

## 2. Mapping → IngestChunk

У `services/rag-ingest-worker/pipeline/normalization.py` додати:

- `async def normalize_task_event(event: dict) -> list[IngestChunk]:`
- `async def normalize_followup_event(event: dict) -> list[IngestChunk]:`
- `async def normalize_meeting_summary(event: dict) -> list[IngestChunk]:`

### 2.1. Tasks

Для `task.created`/`task.updated`:

- `source_type = "task"`.
- `source_id = payload.task_id`.
- `text = f"{title}. {short_description}"` (обрізати description до розумної довжини).
- `chunk_id` — детермінований, напр. `"task:{team_id}:{task_id}"` (без chunk_index, бо один chunk).
- `tags` = `labels` + `status` + `priority`.
- `visibility` = `mode`.
- `project_id = payload.project_id`.
- `team_id = payload.team_id`.

Якщо `indexed=false` або task у статусі `archived` — можна не індексувати (або зберігати в окремому шарі).

### 2.2. Followups

- `source_type = "followup"`.
- `source_id = payload.followup_id`.
- `text = f"{title}. {short_description}"`.
- `chunk_id = f"followup:{team_id}:{followup_id}"`.
- `tags` включають `status` +, за потреби, тип followup.
- важливо включити `src_message_id` у metadata (`message_id` або `source_ref`).

Для `status_changed` оновлювати тільки metadata (через повторний upsert з новим `status`), не створюючи нові chunks.

### 2.3. Meeting summaries

Для `meeting.summary.upserted`:

- `source_type = "meeting"`.
- `source_id = payload.meeting_id`.
- `text = summary_text` (розбити на декілька чанків, якщо потрібно).
- `chunk_id = f"meeting:{team_id}:{meeting_id}:{chunk_index}"` (з chunk_index).
- `tags` = `payload.tags` + ["meeting"].
- `visibility` = `mode`.
- `team_id = payload.team_id`.
- `project_id = payload.project_id`.

---

## 3. Зміни в `rag-ingest-worker`

### 3.1. Routing / handler-и

У `services/rag-ingest-worker/events/consumer.py` додати routing:

- `"task.created"`, `"task.updated"` → `handle_task_event`
- `"followup.created"`, `"followup.status_changed"` → `handle_followup_event`
- `"meeting.summary.upserted"` → `handle_meeting_summary`

Handler-и повинні:

1. Розпарсити envelope (event, meta.team_id, payload).
2. Перевірити `mode` + `indexed`.
3. Викликати відповідний нормалізатор.
4. Якщо список chunks не пустий:
   - `embedding.embed_chunks(chunks)`
   - `index_milvus.upsert_chunks_to_milvus(...)`
   - `index_neo4j.update_graph_for_event(event, chunks)`.

### 3.2. Neo4j граф (workflow-шар)

Розширити `pipeline/index_neo4j.py` для створення вузлів/ребер:

- `(:Task)-[:IN_PROJECT]->(:Project)`
- `(:User)-[:ASSIGNED_TO]->(:Task)`
- `(:Followup)-[:FROM_MESSAGE]->(:Message)`
- `(:User)-[:OWNER]->(:Followup)`
- `(:Meeting)-[:IN_PROJECT]->(:Project)`
- `(:Meeting)-[:PARTICIPANT]->(:User|:Agent)`

Усі операції — через `MERGE` з урахуванням `team_id`/`visibility`.

---

## 4. Тести

Мінімум unit-тестів для нормалізаторів:

- `normalize_task_event` — створює 1 chunk з правильними метаданими; `indexed=false` → `[]`.
- `normalize_followup_event` — включає `src_message_id` у metadata; `status_changed` не створює новий chunk.
- `normalize_meeting_summary` — розбиває довгий summary на декілька чанків з правильними `chunk_id`.

Інтеграційно (dev):

- штучно опублікувати `task.created`, `followup.created`, `meeting.summary.upserted`;
- перевірити в логах воркера, що:
  - події спожиті,
  - chunks згенеровані,
  - індексовані в Milvus (і немає дублікатів при повторі);
  - у Neo4j зʼявились базові вузли/ребра.

---

## Acceptance criteria

1. `rag-ingest-worker` обробляє події Wave 2 (`task.*`, `followup.*`, `meeting.*`) у dev-конфігурації.
2. Для tasks/followups/meetings існують нормалізатори, що повертають коректні `IngestChunk` з урахуванням `mode`/`indexed`.
3. Чанки індексуються в Milvus з ідемпотентним `chunk_id`.
4. Neo4j містить базовий workflow-граф (Task/Followup/Meeting, звʼязаний з Project, User, Message).
5. Повторне програвання подій не створює дублікатів у Milvus/Neo4j.
6. Цей файл (`docs/cursor/rag_ingestion_events_wave2_workflows_task.md`) виконується через Cursor:

   ```bash
   cursor task < docs/cursor/rag_ingestion_events_wave2_workflows_task.md
   ```

   і стає джерелом правди для Wave 2 RAG-ingestion.
