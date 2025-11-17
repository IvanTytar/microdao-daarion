# Task: RAG ingestion worker (events → Milvus + Neo4j)

## Goal

Design and scaffold a **RAG ingestion worker** that:

- Сonsumes domain events (messages, docs, files, RWA updates) from the existing event stream.
- Transforms them into normalized chunks/documents.
- Indexes them into **Milvus** (vector store) and **Neo4j** (graph store).
- Works **idempotently** and supports `reindex(team_id)`.

This worker complements the `rag-gateway` service (see `docs/cursor/rag_gateway_task.md`) by keeping its underlying stores up-to-date.

> IMPORTANT: This task is about architecture, data flow and scaffolding. Concrete model choices and full schemas can be refined later.

---

## Context

- Project root: `microdao-daarion/`.
- Planned/implemented RAG layer: see `docs/cursor/rag_gateway_task.md`.
- Existing docs:
  - `docs/cursor/42_nats_event_streams_and_event_catalog.md` – event stream & catalog.
  - `docs/cursor/34_internal_services_architecture.md` – internal services & topology.

We assume there is (or will be):

- An event bus (likely NATS) with domain events such as:
  - `message.created`
  - `doc.upsert`
  - `file.uploaded`
  - `rwa.energy.update`, `rwa.food.update`, etc.
- A Milvus cluster instance.
- A Neo4j instance.

The ingestion worker must **not** be called directly by agents. It is a back-office service that feeds RAG stores for the `rag-gateway`.

---

## High-level design

### 1. Service placement & structure

Create a new service (or extend RAG-gateway repo structure) under, for example:

- `services/rag-ingest-worker/`

Suggested files:

- `main.py` — entrypoint (CLI or long-running process).
- `config.py` — environment/config loader (event bus URL, Milvus/Neo4j URLs, batch sizes, etc.).
- `events/consumer.py` — NATS (or other) consumer logic.
- `pipeline/normalization.py` — turn events into normalized documents/chunks.
- `pipeline/embedding.py` — embedding model client/wrapper.
- `pipeline/index_milvus.py` — Milvus upsert logic.
- `pipeline/index_neo4j.py` — Neo4j graph updates.
- `api.py` — optional HTTP API for:
  - `POST /ingest/one` – ingest single payload for debugging.
  - `POST /ingest/reindex/{team_id}` – trigger reindex job.
  - `GET /health` – health check.

### 2. Event sources

The worker should subscribe to a **small set of core event types** (names to be aligned with the actual Event Catalog):

- `message.created` — messages in chats/channels (Telegram, internal UI, etc.).
- `doc.upsert` — wiki/docs/specs updates.
- `file.uploaded` — files (PDF, images) that have parsed text.
- `rwa.*` — events related to energy/food/water assets (optional, for later).

Implementation details:

- Use NATS (or another broker) subscription patterns from `docs/cursor/42_nats_event_streams_and_event_catalog.md`.
- Each event should carry at least:
  - `event_type`
  - `team_id` / `dao_id`
  - `user_id`
  - `channel_id` / `project_id` (if applicable)
  - `payload` with text/content and metadata.

---

## Normalized document/chunk model

Define a common internal model for what is sent to Milvus/Neo4j, e.g. `IngestChunk`:

Fields (minimum):

- `chunk_id` — deterministic ID (e.g. hash of (team_id, source_type, source_id, chunk_index)).
- `team_id` / `dao_id`.
- `project_id` (optional).
- `channel_id` (optional).
- `agent_id` (who generated it, if any).
- `source_type` — `"message" | "doc" | "file" | "wiki" | "rwa" | ...`.
- `source_id` — e.g. message ID, doc ID, file ID.
- `text` — the chunk content.
- `tags` — list of tags (topic, domain, etc.).
- `visibility` — `"public" | "confidential"`.
- `created_at` — timestamp.

Responsibilities:

- `pipeline/normalization.py`:
  - For each event type, map event payload → one or more `IngestChunk` objects.
  - Handle splitting of long texts into smaller chunks if needed.

---

## Embedding & Milvus indexing

### 1. Embedding

- Create an embedding component (`pipeline/embedding.py`) that:
  - Accepts `IngestChunk` objects.
  - Supports batch processing.
  - Uses either:
    - Existing LLM proxy/embedding service (preferred), or
    - Direct model (e.g. local `bge-m3`, `gte-large`, etc.).

- Each chunk after embedding should have vector + metadata per schema in `rag_gateway_task`.

### 2. Milvus indexing

- `pipeline/index_milvus.py` should:
  - Upsert chunks into Milvus.
  - Ensure **idempotency** using `chunk_id` as primary key.
  - Store metadata:
    - `team_id`, `project_id`, `channel_id`, `agent_id`,
    - `source_type`, `source_id`,
    - `visibility`, `tags`, `created_at`,
    - `embed_model` version.

- Consider using one Milvus collection with a partition key (`team_id`), or per-DAO collections — but keep code flexible.

---

## Neo4j graph updates

`pipeline/index_neo4j.py` should:

- For events that carry structural information (e.g. project uses resource, doc mentions topic):
  - Create or update nodes: `User`, `MicroDAO`, `Project`, `Channel`, `Topic`, `Resource`, `File`, `RWAObject`, `Doc`.
  - Create relationships such as:
    - `(:User)-[:MEMBER_OF]->(:MicroDAO)`
    - `(:Agent)-[:SERVES]->(:MicroDAO|:Project)`
    - `(:Doc)-[:MENTIONS]->(:Topic)`
    - `(:Project)-[:USES]->(:Resource)`

- All nodes/edges must include:
  - `team_id` / `dao_id`
  - `visibility` when it matters

- Operations should be **upserts** (MERGE) to avoid duplicates.

---

## Idempotency & reindex

### 1. Idempotent semantics

- Use deterministic `chunk_id` for Milvus records.
- Use Neo4j `MERGE` for nodes/edges based on natural keys (e.g. `(team_id, source_type, source_id, chunk_index)`).
- Replaying the same events should not corrupt or duplicate data.

### 2. Reindex API

- Provide a simple HTTP or CLI interface to:

  - `POST /ingest/reindex/{team_id}` — schedule or start reindex for a team/DAO.

- Reindex strategy:

  - Read documents/messages from source-of-truth (DB or event replay).
  - Rebuild chunks and embeddings.
  - Upsert into Milvus & Neo4j (idempotently).

Implementation details (can be left as TODOs if missing backends):

- If there is no easy historic source yet, stub the reindex endpoint with clear TODO and logging.

---

## Monitoring & logging

Add basic observability:

- Structured logs for:
  - Each event type ingested.
  - Number of chunks produced.
  - Latency for embedding and indexing.
- (Optional) Metrics counters/gauges:
  - `ingest_events_total`
  - `ingest_chunks_total`
  - `ingest_errors_total`

---

## Files to create/modify (suggested)

> Adjust exact paths if needed.

- `services/rag-ingest-worker/main.py`
  - Parse config, connect to event bus, start consumers.

- `services/rag-ingest-worker/config.py`
  - Environment variables: `EVENT_BUS_URL`, `MILVUS_URL`, `NEO4J_URL`, `EMBEDDING_SERVICE_URL`, etc.

- `services/rag-ingest-worker/events/consumer.py`
  - NATS (or chosen bus) subscription logic.

- `services/rag-ingest-worker/pipeline/normalization.py`
  - Functions `normalize_message_created(event)`, `normalize_doc_upsert(event)`, `normalize_file_uploaded(event)`.

- `services/rag-ingest-worker/pipeline/embedding.py`
  - `embed_chunks(chunks: List[IngestChunk]) -> List[VectorChunk]`.

- `services/rag-ingest-worker/pipeline/index_milvus.py`
  - `upsert_chunks_to_milvus(chunks: List[VectorChunk])`.

- `services/rag-ingest-worker/pipeline/index_neo4j.py`
  - `update_graph_for_event(event, chunks: List[IngestChunk])`.

- Optional: `services/rag-ingest-worker/api.py`
  - FastAPI app with:
    - `GET /health`
    - `POST /ingest/one`
    - `POST /ingest/reindex/{team_id}`

- Integration docs:
  - Reference `docs/cursor/rag_gateway_task.md` and `docs/cursor/42_nats_event_streams_and_event_catalog.md` where appropriate.

---

## Acceptance criteria

1. A new `rag-ingest-worker` (or similarly named) module/service exists under `services/` with:
   - Clear directory structure (`events/`, `pipeline/`, `config.py`, `main.py`).
   - Stubs or initial implementations for consuming events and indexing to Milvus/Neo4j.

2. A normalized internal model (`IngestChunk` or equivalent) is defined and used across pipelines.

3. Milvus indexing code:
   - Uses idempotent upserts keyed by `chunk_id`.
   - Stores metadata compatible with the RAG-gateway schema.

4. Neo4j update code:
   - Uses MERGE for nodes/relationships.
   - Encodes `team_id`/`dao_id` and privacy where relevant.

5. Idempotency strategy and `reindex(team_id)` path are present in code (even if reindex is initially a stub with TODO).

6. Basic logging is present for ingestion operations.

7. This file (`docs/cursor/rag_ingestion_worker_task.md`) can be executed by Cursor as:

   ```bash
   cursor task < docs/cursor/rag_ingestion_worker_task.md
   ```

   and Cursor will use it as the single source of truth for implementing/refining the ingestion worker.
