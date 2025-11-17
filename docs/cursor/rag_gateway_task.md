# Task: Unified RAG-Gateway service (Milvus + Neo4j) for all agents

## Goal

Design and implement a **single RAG-gateway service** that sits between agents and storage backends (Milvus, Neo4j, etc.), so that:

- Agents never talk directly to Milvus or Neo4j.
- All retrieval, graph queries and hybrid RAG behavior go through one service with a clear API.
- Security, multi-tenancy, logging, and optimization are centralized.

This task is about **architecture and API** first (code layout, endpoints, data contracts). A later task can cover concrete implementation details if needed.

> This spec is intentionally high-level but should be detailed enough for Cursor to scaffold the service, HTTP API, and integration points with DAGI Router.

---

## Context

- Project root: `microdao-daarion/`.
- There are (or will be) multiple agents:
  - DAARWIZZ (system orchestrator)
  - Helion (Energy Union)
  - Team/Project/Messenger/Co-Memory agents, etc.
- Agents already have access to:
  - DAGI Router (LLM routing, tools, orchestrator).
  - Memory service (short/long-term chat memory).
  - Parser-service (OCR and document parsing).

We now want a **RAG layer** that can:

- Perform semantic document search across all DAO documents / messages / files.
- Use a **vector DB** (Milvus) and **graph DB** (Neo4j) together.
- Provide a clean tool-like API to agents.

The RAG layer should be exposed as a standalone service:

- Working name: `rag-gateway` or `knowledge-service`.
- Internally can use Haystack (or similar) for pipelines.

---

## High-level architecture

### 1. RAG-Gateway service

Create a new service (later we can place it under `services/rag-gateway/`), with HTTP API, which will:

- Accept tool-style requests from DAGI Router / agents.
- Internally talk to:
  - Milvus (vector search, embeddings).
  - Neo4j (graph queries, traversals).
- Return structured JSON for agents to consume.

Core API endpoints (first iteration):

- `POST /rag/search_docs` — semantic/hybrid document search.
- `POST /rag/enrich_answer` — enrich an existing answer with sources.
- `POST /graph/query` — run a graph query (Cypher or intent-based).
- `POST /graph/explain_path` — return graph-based explanation / path between entities.

Agents will see these as tools (e.g. `rag.search_docs`, `graph.query_context`) configured in router config.

### 2. Haystack as internal orchestrator

Within the RAG-gateway, use Haystack components (or analogous) to organize:

- `MilvusDocumentStore` as the main vector store.
- Retrievers:
  - Dense retriever over Milvus.
  - Optional BM25/keyword retriever (for hybrid search).
- Pipelines:
  - `indexing_pipeline` — ingest DAO documents/messages/files into Milvus.
  - `query_pipeline` — answer agent queries using retrieved documents.
  - `graph_rag_pipeline` — combine Neo4j graph queries with Milvus retrieval.

The key idea: **agents never talk to Haystack directly**, only to RAG-gateway HTTP API.

---

## Data model & schema

### 1. Milvus document schema

Define a standard metadata schema for all documents/chunks stored in Milvus. Required fields:

- `team_id` / `dao_id` — which DAO / team this data belongs to.
- `project_id` — optional project-level grouping.
- `channel_id` — optional chat/channel ID (Telegram, internal channel, etc.).
- `agent_id` — which agent produced/owns this piece.
- `visibility` — one of `"public" | "confidential"`.
- `doc_type` — one of `"message" | "doc" | "file" | "wiki" | "rwa" | "transaction"` (extensible).
- `tags` — list of tags (topics, domains, etc.).
- `created_at` — timestamp.

These should be part of Milvus metadata, so that RAG-gateway can apply filters (by DAO, project, visibility, etc.).

### 2. Neo4j graph schema

Design a **minimal default graph model** with node labels:

- `User`, `Agent`, `MicroDAO`, `Project`, `Channel`
- `Topic`, `Resource`, `File`, `RWAObject` (e.g. energy asset, food batch, water object).

Key relationships (examples):

- `(:User)-[:MEMBER_OF]->(:MicroDAO)`
- `(:Agent)-[:SERVES]->(:MicroDAO|:Project)`
- `(:Doc)-[:MENTIONS]->(:Topic)`
- `(:Project)-[:USES]->(:Resource)`

Every node/relationship should also carry:

- `team_id` / `dao_id`
- `visibility` or similar privacy flag

This allows RAG-gateway to enforce access control at query time.

---

## RAG tools API for agents

Define 2–3 canonical tools that DAGI Router can call. These map to RAG-gateway endpoints.

### 1. `rag.search_docs`

Main tool for most knowledge queries.

**Request JSON example:**

```json
{
  "agent_id": "ag_daarwizz",
  "team_id": "dao_greenfood",
  "query": "які проєкти у нас вже використовують Milvus?",
  "top_k": 5,
  "filters": {
    "project_id": "prj_x",
    "doc_type": ["doc", "wiki"],
    "visibility": "public"
  }
}
```

**Response JSON example:**

```json
{
  "matches": [
    {
      "score": 0.82,
      "title": "Spec microdao RAG stack",
      "snippet": "...",
      "source_ref": {
        "type": "doc",
        "id": "doc_123",
        "url": "https://...",
        "team_id": "dao_greenfood",
        "doc_type": "doc"
      }
    }
  ]
}
```

### 2. `graph.query_context`

For relationship/structural questions ("хто з ким повʼязаний", "які проєкти використовують X" etc.).

Two options (can support both):

1. **Low-level Cypher**:

   ```json
   {
     "team_id": "dao_energy",
     "cypher": "MATCH (p:Project)-[:USES]->(r:Resource {name:$name}) RETURN p LIMIT 10",
     "params": {"name": "Milvus"}
   }
   ```

2. **High-level intent**:

   ```json
   {
     "team_id": "dao_energy",
     "intent": "FIND_PROJECTS_BY_TECH",
     "args": {"tech": "Milvus"}
   }
   ```

RAG-gateway then maps intent → Cypher internally.

### 3. `rag.enrich_answer`

Given a draft answer from an agent, RAG-gateway retrieves supporting documents and returns enriched answer + citations.

**Request example:**

```json
{
  "team_id": "dao_greenfood",
  "question": "Поясни коротко архітектуру RAG шару в нашому місті.",
  "draft_answer": "Архітектура складається з ...",
  "max_docs": 3
}
```

**Response example:**

```json
{
  "enriched_answer": "Архітектура складається з ... (з врахуванням джерел)",
  "sources": [
    {"id": "doc_1", "title": "RAG spec", "url": "https://..."},
    {"id": "doc_2", "title": "Milvus setup", "url": "https://..."}
  ]
}
```

---

## Multi-tenancy & security

Add a small **authorization layer** inside RAG-gateway:

- Each request includes:
  - `user_id`, `team_id` (DAO), optional `roles`.
  - `mode` / `visibility` (e.g. `"public"` or `"confidential"`).
- Before querying Milvus/Neo4j, RAG-gateway applies filters:
  - `team_id = ...`
  - `visibility` within allowed scope.
  - Optional role-based constraints (Owner/Guardian/Member) affecting what doc_types can be seen.

Implementation hints:

- Start with a simple `AccessContext` object built from request, used by all pipelines.
- Later integrate with existing PDP/RBAC if available.

---

## Ingestion & pipelines

Define an ingestion plan and API.

### 1. Ingest service / worker

Create a separate ingestion component (can be part of RAG-gateway or standalone worker) that:

- Listens to events like:
  - `message.created`
  - `doc.upsert`
  - `file.uploaded`
- For each event:
  - Builds text chunks.
  - Computes embeddings.
  - Writes chunks into Milvus with proper metadata.
  - Updates Neo4j graph (nodes/edges) where appropriate.

Requirements:

- Pipelines must be **idempotent** — re-indexing same document does not break anything.
- Create an API / job for `reindex(team_id)` to reindex a full DAO if needed.
- Store embedding model version in metadata (e.g. `embed_model: "bge-m3@v1"`) to ease future migrations.

### 2. Event contracts

Align ingestion with the existing Event Catalog (if present in `docs/cursor`):

- Document which event types lead to RAG ingestion.
- For each event, define mapping → Milvus doc, Neo4j nodes/edges.

---

## Optimization for agents

Add support for:

1. **Semantic cache per agent**

   - Cache `query → RAG-result` for N minutes per (`agent_id`, `team_id`).
   - Useful for frequently repeated queries.

2. **RAG behavior profiles per agent**

   - In agent config (probably in router config), define:
     - `rag_mode: off | light | strict`
     - `max_context_tokens`
     - `max_docs_per_query`
   - RAG-gateway can read these via metadata from Router, or Router can decide when to call RAG at all.

---

## Files to create/modify (suggested)

> NOTE: This is a suggestion; adjust exact paths/names to fit the existing project structure.

- New service directory: `services/rag-gateway/`:
  - `main.py` — FastAPI (or similar) entrypoint.
  - `api.py` — defines `/rag/search_docs`, `/rag/enrich_answer`, `/graph/query`, `/graph/explain_path`.
  - `core/pipelines.py` — Haystack pipelines (indexing, query, graph-rag).
  - `core/schema.py` — Pydantic models for request/response, data schema.
  - `core/access.py` — access control context + checks.
  - `core/backends/milvus_client.py` — wrapper for Milvus.
  - `core/backends/neo4j_client.py` — wrapper for Neo4j.

- Integration with DAGI Router:
  - Update `router-config.yml` to define RAG tools:
    - `rag.search_docs`
    - `graph.query_context`
    - `rag.enrich_answer`
  - Configure providers for RAG-gateway base URL.

- Docs:
  - `docs/cursor/rag_gateway_api_spec.md` — optional detailed API spec for RAG tools.

---

## Acceptance criteria

1. **Service skeleton**

   - A new RAG-gateway service exists under `services/` with:
     - A FastAPI (or similar) app.
     - Endpoints:
       - `POST /rag/search_docs`
       - `POST /rag/enrich_answer`
       - `POST /graph/query`
       - `POST /graph/explain_path`
     - Pydantic models for requests/responses.

2. **Data contracts**

   - Milvus document metadata schema is defined (and used in code).
   - Neo4j node/edge labels and key relationships are documented and referenced in code.

3. **Security & multi-tenancy**

   - All RAG/graph endpoints accept `user_id`, `team_id`, and enforce at least basic filtering by `team_id` and `visibility`.

4. **Agent tool contracts**

   - JSON contracts for tools `rag.search_docs`, `graph.query_context`, and `rag.enrich_answer` are documented and used by RAG-gateway.
   - DAGI Router integration is sketched (even if not fully wired): provider entry + basic routing rule examples.

5. **Ingestion design**

   - Ingestion pipeline is outlined in code (or stubs) with clear TODOs:
     - where to hook event consumption,
     - how to map events to Milvus/Neo4j.
   - Idempotency and `reindex(team_id)` strategy described in code/docs.

6. **Documentation**

   - This file (`docs/cursor/rag_gateway_task.md`) plus, optionally, a more detailed API spec file for RAG-gateway.

---

## How to run this task with Cursor

From repo root (`microdao-daarion`):

```bash
cursor task < docs/cursor/rag_gateway_task.md
```

Cursor should then:

- Scaffold the RAG-gateway service structure.
- Implement request/response models and basic endpoints.
- Sketch out Milvus/Neo4j client wrappers and pipelines.
- Optionally, add TODOs where deeper implementation is needed.
