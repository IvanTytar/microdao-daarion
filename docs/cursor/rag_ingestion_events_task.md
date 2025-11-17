# Task: Wire `message.created` and `doc.upsert` events into the RAG ingestion worker

## Goal

Підключити реальні доменні події до RAG ingestion воркера так, щоб:

- Події `message.created` та `doc.upsert` автоматично потрапляли в RAG ingestion pipeline.
- Вони нормалізувались у `IngestChunk` (текст + метадані).
- Чанки індексувались в Milvus (векторний стор) і за потреби в Neo4j (граф контексту).
- Обробка була **ідемпотентною** та стабільною (повтор подій не ламає індекс).

Це продовження `rag_ingestion_worker_task.md`: там ми описали воркер, тут — як реально підвести його до подій `message.created` і `doc.upsert`.

---

## Context

- Root: `microdao-daarion/`
- Ingestion worker: `services/rag-ingest-worker/` (згідно попередньої таски).
- Event catalog: `docs/cursor/42_nats_event_streams_and_event_catalog.md` (описує NATS streams / subjects / event types).

Ми вважаємо, що:

- Існує NATS (або інший) event bus.
- Є події:
  - `message.created` — створення повідомлення в чаті/каналі.
  - `doc.upsert` — створення/оновлення документа (wiki, spec, тощо).
- RAG ingestion worker вже має базові пайплайни (`normalization`, `embedding`, `index_milvus`, `index_neo4j`) — хоча б як скелет.

Мета цієї задачі — **підʼєднатися до реальних подій** і забезпечити end‑to‑end шлях:

`event → IngestChunk → embedding → Milvus (+ Neo4j)`.

---

## 1. Подія `message.created`

### 1.1. Очікуваний формат події

Орієнтуючись на Event Catalog, нормальний payload для `message.created` має виглядати приблизно так (приклад, можна адаптувати до фактичного формату):

```json
{
  "event_type": "message.created",
  "event_id": "evt_123",
  "occurred_at": "2024-11-17T10:00:00Z",
  "team_id": "dao_greenfood",
  "channel_id": "tg:12345" ,
  "user_id": "tg:67890",
  "agent_id": "daarwizz",  
  "payload": {
    "message_id": "msg_abc",
    "text": "Текст повідомлення...",
    "attachments": [],
    "tags": ["onboarding", "spec"],
    "visibility": "public"
  }
}
```

Якщо реальний формат інший — **не міняти продакшн‑події**, а в нормалізації підлаштуватись під нього.

### 1.2. Нормалізація у `IngestChunk`

У `services/rag-ingest-worker/pipeline/normalization.py` додати/оновити функцію:

```python
async def normalize_message_created(event: dict) -> list[IngestChunk]:
    ...
```

Правила:

- Якщо `payload.text` порожній — можна або пропустити chunk, або створити chunk тільки з метаданими (краще пропустити).
- Створити один або кілька `IngestChunk` (якщо треба розбити довгі повідомлення).

Поля для `IngestChunk` (мінімум):

- `chunk_id` — детермінований, напр.:
  - `f"msg:{event['team_id']}:{payload['message_id']}:{chunk_index}"` і потім захешувати.
- `team_id` = `event.team_id`.
- `channel_id` = `event.channel_id`.
- `agent_id` = `event.agent_id` (якщо є).
- `source_type` = `"message"`.
- `source_id` = `payload.message_id`.
- `text` = фрагмент тексту.
- `tags` = `payload.tags` (якщо є) + можна додати автоматику (наприклад, `"chat"`).
- `visibility` = `payload.visibility` або `"public"` за замовчуванням.
- `created_at` = `event.occurred_at`.

Ця функція **не повинна знати** про Milvus/Neo4j — лише повертати список `IngestChunk`.

### 1.3. Інтеграція в consumer

У `services/rag-ingest-worker/events/consumer.py` (або де знаходиться логіка підписки на NATS):

- Додати підписку на subject / stream, де живуть `message.created`.
- У callback’і:
  - Парсити JSON event.
  - Якщо `event_type == "message.created"`:
    - Викликати `normalize_message_created(event)` → `chunks`.
    - Якщо `chunks` непорожні:
      - Пустити їх через `embedding.embed_chunks(chunks)`.
      - Далі через `index_milvus.upsert_chunks_to_milvus(...)`.
      - (Опційно) якщо потрібно, зробити `index_neo4j.update_graph_for_event(event, chunks)`.

Додати логи:

- `logger.info("Ingested message.created", extra={"team_id": ..., "chunks": len(chunks)})`.

Уважно обробити винятки (catch, log, ack або nack за обраною семантикою).

---

## 2. Подія `doc.upsert`

### 2.1. Очікуваний формат події

Аналогічно, з Event Catalog, `doc.upsert` може виглядати так:

```json
{
  "event_type": "doc.upsert",
  "event_id": "evt_456",
  "occurred_at": "2024-11-17T10:05:00Z",
  "team_id": "dao_greenfood",
  "user_id": "user:abc",
  "agent_id": "doc_agent",
  "payload": {
    "doc_id": "doc_123",
    "title": "Spec RAG Gateway",
    "text": "Довгий текст документа...",
    "url": "https://daarion.city/docs/doc_123",
    "tags": ["rag", "architecture"],
    "visibility": "public",
    "doc_type": "wiki"
  }
}
```

### 2.2. Нормалізація у `IngestChunk`

У `pipeline/normalization.py` додати/оновити:

```python
async def normalize_doc_upsert(event: dict) -> list[IngestChunk]:
    ...
```

Правила:

- Якщо `payload.text` дуже довгий — розбити на чанки (наприклад, по 512–1024 токени/символи).
- Для кожного чанку створити `IngestChunk`:

  - `chunk_id` = `f"doc:{team_id}:{doc_id}:{chunk_index}"` → захешувати.
  - `team_id` = `event.team_id`.
  - `source_type` = `payload.doc_type` або `"doc"`.
  - `source_id` = `payload.doc_id`.
  - `text` = текст чанку.
  - `tags` = `payload.tags` + `payload.doc_type`.
  - `visibility` = `payload.visibility`.
  - `created_at` = `event.occurred_at`.
  - За бажанням додати `project_id` / `channel_id`, якщо вони є.

Ця функція також **не індексує** нічого безпосередньо, лише повертає список чанків.

### 2.3. Інтеграція в consumer

В `events/consumer.py` (або еквівалентному модулі):

- Додати обробку `event_type == "doc.upsert"` аналогічно до `message.created`:
  - `normalize_doc_upsert(event)` → `chunks`.
  - `embed_chunks(chunks)` → вектори.
  - `upsert_chunks_to_milvus(...)`.
  - `update_graph_for_event(event, chunks)` — створити/оновити вузол `(:Doc)` і звʼязки, наприклад:
    - `(:Doc {doc_id})-[:MENTIONS]->(:Topic)`
    - `(:Doc)-[:BELONGS_TO]->(:MicroDAO)` тощо.

---

## 3. Ідемпотентність

Для обох подій (`message.created`, `doc.upsert`) забезпечити, щоб **повторне програвання** тієї ж події не створювало дублікатів:

- Використовувати `chunk_id` як primary key в Milvus (idempotent upsert).
- Для Neo4j використовувати `MERGE` на основі унікальних ключів вузлів/ребер (наприклад, `doc_id`, `team_id`, `source_type`, `source_id`, `chunk_index`).

Якщо вже закладено idempotent behavior в `index_milvus.py` / `index_neo4j.py`, просто використати ці поля.

---

## 4. Тестування

Перед тим, як вважати інтеграцію готовою, бажано:

1. Написати мінімальні unit‑тести / doctest’и для `normalize_message_created` і `normalize_doc_upsert` (навіть якщо без повноцінної CI):
   - Вхідний event → список `IngestChunk` з очікуваними полями.

2. Зробити простий manual test:
   - Опублікувати штучну `message.created` у dev‑stream.
   - Переконатися по логах воркера, що:
     - нормалізація відбулась,
     - чанк(и) відправлені в embedding і Milvus,
     - запис зʼявився в Milvus/Neo4j (якщо є доступ).

---

## Files to touch (suggested)

> Шлях та назви можна адаптувати до фактичної структури, але головна ідея — рознести відповідальності.

- `services/rag-ingest-worker/events/consumer.py`
  - Додати підписки/обробники для `message.created` і `doc.upsert`.
  - Виклики до `normalize_message_created` / `normalize_doc_upsert` + пайплайн embedding/indexing.

- `services/rag-ingest-worker/pipeline/normalization.py`
  - Додати/оновити функції:
    - `normalize_message_created(event)`
    - `normalize_doc_upsert(event)`

- (Опційно) `services/rag-ingest-worker/pipeline/index_neo4j.py`
  - Додати/оновити логіку побудови графових вузлів/ребер для `Doc`, `Topic`, `Channel`, `MicroDAO` тощо.

- Тести / приклади (якщо є тестовий пакет для сервісу).

---

## Acceptance criteria

1. RAG‑ingest worker підписаний на події типу `message.created` і `doc.upsert` (через NATS або інший bus), принаймні в dev‑конфігурації.

2. Для `message.created` та `doc.upsert` існують функції нормалізації, які повертають `IngestChunk` з коректними полями (`team_id`, `source_type`, `source_id`, `visibility`, `tags`, `created_at`, тощо).

3. Чанки для цих подій проходять через embedding‑пайплайн і індексуються в Milvus з ідемпотентною семантикою.

4. (За можливості) для `doc.upsert` оновлюється Neo4j граф (вузол `Doc` + базові звʼязки).

5. Повторне надсилання однієї й тієї ж події не створює дублікатів у Milvus/Neo4j (idempotent behavior).

6. Можна побачити в логах воркера, що події споживаються і конвеєр відпрацьовує (інформаційні логи з team_id, event_type, chunks_count).

7. Цей файл (`docs/cursor/rag_ingestion_events_task.md`) можна виконати через Cursor:

   ```bash
   cursor task < docs/cursor/rag_ingestion_events_task.md
   ```

   і Cursor буде використовувати його як єдине джерело правди для інтеграції подій `message.created`/`doc.upsert` у ingestion‑воркер.
