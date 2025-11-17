# Task: Channel-agnostic document workflow (PDF + RAG)

## Goal

Make the document (PDF) parsing + RAG workflow **channel-agnostic**, so it can be reused by:

- Telegram bots (DAARWIZZ, Helion)
- Web applications
- Mobile apps
- Any other client via HTTP API

This task defines a shared `doc_service`, HTTP endpoints for non-Telegram clients, and integration of Telegram handlers with this shared layer.

> NOTE: If this task is re-run on a repo where it is already implemented, it should be treated as a validation/refinement task. Existing structures (services, endpoints) SHOULD NOT be removed, only improved if necessary.

---

## Context

### Existing components (expected state)

- Repo root: `microdao-daarion/`
- Gateway service: `gateway-bot/`

Key files:

- `gateway-bot/http_api.py`
  - Telegram handlers for DAARWIZZ (`/telegram/webhook`) and Helion (`/helion/telegram/webhook`).
  - Voice → STT flow (Whisper via `STT_SERVICE_URL`).
  - Discord handler.
  - Helper functions: `get_telegram_file_path`, `send_telegram_message`.

- `gateway-bot/memory_client.py`
  - `MemoryClient` with methods:
    - `get_context`, `save_chat_turn`, `create_dialog_summary`, `upsert_fact`.

- `gateway-bot/app.py`
  - FastAPI app, includes `http_api.router` as `gateway_router`.
  - CORS configuration.

Router + parser (already implemented in router project):

- DAGI Router supports:
  - `mode: "doc_parse"` with provider `parser` → OCRProvider → `parser-service` (DotsOCR).
  - `mode: "rag_query"` for RAG questions.
- `parser-service` is available at `http://parser-service:9400`.

The goal of this task is to:

1. Add **channel-agnostic** document service into `gateway-bot`.
2. Add `/api/doc/*` HTTP endpoints for web/mobile.
3. Refactor Telegram handlers to use this service for PDF, `/ingest`, and RAG follow-ups.
4. Store document context in Memory Service via `fact_key = "doc_context:{session_id}"`.

---

## Changes to implement

### 1. Create service: `gateway-bot/services/doc_service.py`

Create a new directory and file:

- `gateway-bot/services/__init__.py`
- `gateway-bot/services/doc_service.py`

#### 1.1. Pydantic models

Define models:

- `QAItem` — single Q&A pair
- `ParsedResult` — result of document parsing
- `IngestResult` — result of ingestion into RAG
- `QAResult` — result of RAG query about a document
- `DocContext` — stored document context

Example fields (can be extended as needed):

- `QAItem`: `question: str`, `answer: str`
- `ParsedResult`:
  - `success: bool`
  - `doc_id: Optional[str]`
  - `qa_pairs: Optional[List[QAItem]]`
  - `markdown: Optional[str]`
  - `chunks_meta: Optional[Dict[str, Any]]` (e.g., `{"count": int, "chunks": [...]}`)
  - `raw: Optional[Dict[str, Any]]` (full payload from router)
  - `error: Optional[str]`
- `IngestResult`:
  - `success: bool`
  - `doc_id: Optional[str]`
  - `ingested_chunks: int`
  - `status: str`
  - `error: Optional[str]`
- `QAResult`:
  - `success: bool`
  - `answer: Optional[str]`
  - `doc_id: Optional[str]`
  - `sources: Optional[List[Dict[str, Any]]]`
  - `error: Optional[str]`
- `DocContext`:
  - `doc_id: str`
  - `dao_id: Optional[str]`
  - `user_id: Optional[str]`
  - `doc_url: Optional[str]`
  - `file_name: Optional[str]`
  - `saved_at: Optional[str]`

#### 1.2. DocumentService class

Implement `DocumentService` using `router_client.send_to_router` and `memory_client`:

Methods:

- `async def save_doc_context(session_id, doc_id, doc_url=None, file_name=None, dao_id=None) -> bool`
  - Uses `memory_client.upsert_fact` with:
    - `fact_key = f"doc_context:{session_id}"`
    - `fact_value_json = {"doc_id", "doc_url", "file_name", "dao_id", "saved_at"}`.
  - Extract `user_id` from `session_id` (e.g., `telegram:123` → `user_id="123"`).

- `async def get_doc_context(session_id) -> Optional[DocContext]`
  - Uses `memory_client.get_fact(user_id, fact_key)`.
  - If `fact_value_json` exists, return `DocContext(**fact_value_json)`.

- `async def parse_document(session_id, doc_url, file_name, dao_id, user_id, output_mode="qa_pairs", metadata=None) -> ParsedResult`
  - Builds router request:
    - `mode: "doc_parse"`
    - `agent: "parser"`
    - `metadata`: includes `source` (derived from session_id), `dao_id`, `user_id`, `session_id` and optional metadata.
    - `payload`: includes `doc_url`, `file_name`, `output_mode`, `dao_id`, `user_id`.
  - Calls `send_to_router`.
  - On success:
    - Extract `doc_id` from response.
    - Call `save_doc_context`.
    - Map `qa_pairs`, `markdown`, `chunks` into `ParsedResult`.

- `async def ingest_document(session_id, doc_id=None, doc_url=None, file_name=None, dao_id=None, user_id=None) -> IngestResult`
  - If `doc_id` is `None`, load from `get_doc_context`.
  - Build router request with `mode: "doc_parse"`, `payload.output_mode="chunks"`, `payload.ingest=True` and `doc_url` / `doc_id`.
  - Return `IngestResult` with `ingested_chunks` based on `chunks` length.

- `async def ask_about_document(session_id, question, doc_id=None, dao_id=None, user_id=None) -> QAResult`
  - If `doc_id` is `None`, load from `get_doc_context`.
  - Build router request with `mode: "rag_query"` and `payload` containing `question`, `dao_id`, `user_id`, `doc_id`.
  - Return `QAResult` with `answer` and optional `sources`.

Provide small helper method:

- `_extract_source(session_id: str) -> str` → returns first segment before `:` (e.g. `"telegram"`, `"web"`).

At bottom of the file, export convenience functions:

- `doc_service = DocumentService()`
- Top-level async wrappers:
  - `parse_document(...)`, `ingest_document(...)`, `ask_about_document(...)`, `save_doc_context(...)`, `get_doc_context(...)`.

> IMPORTANT: No Telegram-specific logic (emoji, message length, `/ingest` hints) in this file.

---

### 2. Extend MemoryClient: `gateway-bot/memory_client.py`

Add method:

```python
async def get_fact(self, user_id: str, fact_key: str, team_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Get single fact by key"""
```

- Use Memory Service HTTP API, e.g.:
  - `GET {base_url}/facts/{fact_key}` with `user_id` and optional `team_id` in query params.
  - Return `response.json()` on 200, else `None`.

This method will be used by `doc_service.get_doc_context`.

Do **not** change existing public methods.

---

### 3. HTTP API for web/mobile: `gateway-bot/http_api_doc.py`

Create `gateway-bot/http_api_doc.py` with:

- `APIRouter()` named `router`.
- Import from `services.doc_service`:
  - `parse_document`, `ingest_document`, `ask_about_document`, `get_doc_context`, and models.

Endpoints:

1. `POST /api/doc/parse`

   Request (JSON body, Pydantic model `ParseDocumentRequest`):

   - `session_id: str`
   - `doc_url: str`
   - `file_name: str`
   - `dao_id: str`
   - `user_id: str`
   - `output_mode: str = "qa_pairs"`
   - `metadata: Optional[Dict[str, Any]]`

   Behaviour:

   - Call `parse_document(...)` from doc_service.
   - On failure → `HTTPException(status_code=400, detail=result.error)`.
   - On success → JSON with `doc_id`, `qa_pairs` (as list of dict), `markdown`, `chunks_meta`, `raw`.

2. `POST /api/doc/ingest`

   Request (`IngestDocumentRequest`):

   - `session_id: str`
   - `doc_id: Optional[str]`
   - `doc_url: Optional[str]`
   - `file_name: Optional[str]`
   - `dao_id: Optional[str]`
   - `user_id: Optional[str]`

   Behaviour:

   - If `doc_id` is missing, use `get_doc_context(session_id)`.
   - Call `ingest_document(...)`.
   - Return `doc_id`, `ingested_chunks`, `status`.

3. `POST /api/doc/ask`

   Request (`AskDocumentRequest`):

   - `session_id: str`
   - `question: str`
   - `doc_id: Optional[str]`
   - `dao_id: Optional[str]`
   - `user_id: Optional[str]`

   Behaviour:

   - If `doc_id` is missing, use `get_doc_context(session_id)`.
   - Call `ask_about_document(...)`.
   - Return `answer`, `doc_id`, and `sources` (if any).

4. `GET /api/doc/context/{session_id}`

   Behaviour:

   - Use `get_doc_context(session_id)`.
   - If missing → 404.
   - Else return `doc_id`, `dao_id`, `user_id`, `doc_url`, `file_name`, `saved_at`.

Optional: `POST /api/doc/parse/upload` stub for future file-upload handling (currently can return 501 with note to use `doc_url`).

---

### 4. Wire API into app: `gateway-bot/app.py`

Update `app.py`:

- Import both routers:

  ```python
  from http_api import router as gateway_router
  from http_api_doc import router as doc_router
  ```

- Include them:

  ```python
  app.include_router(gateway_router, prefix="", tags=["gateway"])
  app.include_router(doc_router, prefix="", tags=["docs"])
  ```

- Update root endpoint `/` to list new endpoints:

  - `"POST /api/doc/parse"`
  - `"POST /api/doc/ingest"`
  - `"POST /api/doc/ask"`
  - `"GET /api/doc/context/{session_id}"`

---

### 5. Refactor Telegram handlers: `gateway-bot/http_api.py`

Update `http_api.py` so Telegram uses `doc_service` for PDF/ingest/RAG, keeping existing chat/voice flows.

#### 5.1. Imports and constants

- Add imports:

  ```python
  from services.doc_service import (
      parse_document,
      ingest_document,
      ask_about_document,
      get_doc_context,
  )
  ```

- Define Telegram length limits:

  ```python
  TELEGRAM_MAX_MESSAGE_LENGTH = 4096
  TELEGRAM_SAFE_LENGTH = 3500
  ```

#### 5.2. DAARWIZZ `/telegram/webhook`

Inside `telegram_webhook`:

1. **/ingest command**

   - Check `text` from message: if starts with `/ingest`:
     - `session_id = f"telegram:{chat_id}"`.
     - If message also contains a PDF document:
       - Use `get_telegram_file_path(file_id)` and correct bot token to build `file_url`.
       - `await send_telegram_message(chat_id, "📥 Імпортую документ у RAG...")`.
       - Call `ingest_document(session_id, doc_url=file_url, file_name=file_name, dao_id, user_id=f"tg:{user_id}")`.
     - Else:
       - Call `ingest_document(session_id, dao_id=dao_id, user_id=f"tg:{user_id}")` and rely on stored context.
     - Send success/failure message.

2. **PDF detection**

   - Check `document = update.message.get("document")`.
   - Determine `is_pdf` via `mime_type` and/or `file_name.endswith(".pdf")`.
   - If PDF:
     - Log file info.
     - Get `file_path` via `get_telegram_file_path(file_id)` + correct token → `file_url`.
     - Send "📄 Обробляю PDF-документ...".
     - `session_id = f"telegram:{chat_id}"`.
     - Call `parse_document(session_id, doc_url=file_url, file_name=file_name, dao_id, user_id=f"tg:{user_id}", output_mode="qa_pairs", metadata={"username": username, "chat_id": chat_id})`.
     - On success, format:
       - Prefer Q&A (`result.qa_pairs`) → `format_qa_response(...)`.
       - Else markdown → `format_markdown_response(...)`.
       - Else chunks → `format_chunks_response(...)`.
     - Append hint: `"\n\n💡 _Використай /ingest для імпорту документа у RAG_"`.
     - Send response via `send_telegram_message`.

3. **RAG follow-up questions**

   - After computing `text` (from voice or direct text), before regular chat routing:
     - `session_id = f"telegram:{chat_id}"`.
     - Load `doc_context = await get_doc_context(session_id)`.
     - If `doc_context.doc_id` exists and text looks like a question (contains `?` or Ukrainian question words):
       - Call `ask_about_document(session_id, question=text, doc_id=doc_context.doc_id, dao_id=dao_id or doc_context.dao_id, user_id=f"tg:{user_id}")`.
       - If success, truncate answer to `TELEGRAM_SAFE_LENGTH` and send as Telegram message.
       - If RAG fails → fall back to normal chat routing.

4. **Keep voice + normal chat flows**

   - Existing STT flow and chat→router logic should remain as fallback for non-PDF / non-ingest / non-RAG messages.

#### 5.3. Helion `/helion/telegram/webhook`

Mirror the same behaviours for Helion handler:

- `/ingest` command support.
- PDF detection and `parse_document` usage.
- RAG follow-up via `ask_about_document`.
- Use `HELION_TELEGRAM_BOT_TOKEN` for file download and message sending.
- Preserve existing chat→router behaviour when doc flow does not apply.

#### 5.4. Formatting helpers

Add helper functions at the bottom of `http_api.py` (Telegram-specific):

- `format_qa_response(qa_pairs: list, max_pairs: int = 5) -> str`
  - Adds header, enumerates Q&A pairs, truncates long answers, respects `TELEGRAM_SAFE_LENGTH`.
- `format_markdown_response(markdown: str) -> str`
  - Wraps markdown with header; truncates to `TELEGRAM_SAFE_LENGTH` and appends hint about `/ingest` if truncated.
- `format_chunks_response(chunks: list) -> str`
  - Shows summary about number of chunks and previews first ~3.

> IMPORTANT: These helpers handle Telegram-specific constraints and SHOULD NOT be moved into `doc_service`.

---

## Acceptance criteria

1. `gateway-bot/services/doc_service.py` exists and provides:
   - `parse_document`, `ingest_document`, `ask_about_document`, `save_doc_context`, `get_doc_context`.
   - Uses DAGI Router and Memory Service, with `session_id`-based context.

2. `gateway-bot/http_api_doc.py` exists and defines:
   - `POST /api/doc/parse`
   - `POST /api/doc/ingest`
   - `POST /api/doc/ask`
   - `GET /api/doc/context/{session_id}`

3. `gateway-bot/app.py`:
   - Includes both `http_api.router` and `http_api_doc.router`.
   - Root `/` lists new `/api/doc/*` endpoints.

4. `gateway-bot/memory_client.py`:
   - Includes `get_fact(...)` and existing methods still work.
   - `doc_service` uses `upsert_fact` + `get_fact` for `doc_context:{session_id}`.

5. `gateway-bot/http_api.py`:
   - Telegram handlers use `doc_service` for:
     - PDF parsing,
     - `/ingest` command,
     - RAG follow-up questions.
   - Continue to support existing voice→STT→chat flow and regular chat routing when doc flow isnt triggered.

6. Web/mobile clients can call `/api/doc/*` to:
   - Parse documents via `doc_url`.
   - Ingest into RAG.
   - Ask questions about the last parsed document for given `session_id`.

---

## How to run this task with Cursor

From repo root (`microdao-daarion`):

```bash
cursor task < docs/cursor/channel_agnostic_doc_flow_task.md
```

Cursor should then:

- Create/modify the files listed above.
- Ensure implementation matches the described architecture and acceptance criteria.
