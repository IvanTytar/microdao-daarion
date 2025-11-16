# RAG Service

Retrieval-Augmented Generation service for MicroDAO. Integrates PARSER + Memory + Vector Search.

## Features

- **Document Ingestion**: Convert ParsedDocument from PARSER service to vector embeddings
- **Query Pipeline**: Retrieve relevant documents and generate answers using LLM
- **Haystack Integration**: Uses Haystack 2.x with PostgreSQL + pgvector
- **Memory Integration**: Combines RAG results with Memory context

## Architecture

```
PARSER → parsed_json → RAG Service → Vector DB (pgvector)
                                    ↓
User Query → RAG Service → Retrieve Documents → LLM (DAGI Router) → Answer + Citations
```

## Configuration

### Environment Variables

```bash
# PostgreSQL
PG_DSN=postgresql+psycopg2://postgres:postgres@city-db:5432/daarion_city

# Embedding Model
EMBED_MODEL_NAME=BAAI/bge-m3  # or intfloat/multilingual-e5-base
EMBED_DEVICE=cuda  # or cpu, mps
EMBED_DIM=1024  # BAAI/bge-m3 = 1024

# Document Store
RAG_TABLE_NAME=rag_documents
SEARCH_STRATEGY=approximate

# LLM Provider
LLM_PROVIDER=router  # router, openai, local
ROUTER_BASE_URL=http://router:9102
```

## API Endpoints

### POST /ingest

Ingest parsed document from PARSER service.

**Request:**
```json
{
  "dao_id": "daarion",
  "doc_id": "microdao-tokenomics-2025-11",
  "parsed_json": { ... },
  "user_id": "optional-user-id"
}
```

**Response:**
```json
{
  "status": "success",
  "doc_count": 15,
  "dao_id": "daarion",
  "doc_id": "microdao-tokenomics-2025-11"
}
```

### POST /query

Query RAG system for answers.

**Request:**
```json
{
  "dao_id": "daarion",
  "question": "Поясни токеноміку microDAO і роль стейкінгу",
  "top_k": 5,
  "user_id": "optional-user-id"
}
```

**Response:**
```json
{
  "answer": "MicroDAO використовує токен μGOV...",
  "citations": [
    {
      "doc_id": "microdao-tokenomics-2025-11",
      "page": 1,
      "section": "Токеноміка MicroDAO",
      "excerpt": "MicroDAO використовує токен μGOV..."
    }
  ],
  "documents": [...]
}
```

### GET /health

Health check endpoint.

## Usage

### 1. Ingest Document

After parsing document with PARSER service:

```bash
curl -X POST http://localhost:9500/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "dao_id": "daarion",
    "doc_id": "microdao-tokenomics-2025-11",
    "parsed_json": { ... }
  }'
```

### 2. Query RAG

```bash
curl -X POST http://localhost:9500/query \
  -H "Content-Type: application/json" \
  -d '{
    "dao_id": "daarion",
    "question": "Поясни токеноміку microDAO"
  }'
```

## Integration with PARSER

After parsing document:

```python
# In parser-service
parsed_doc = parse_document_from_images(images, output_mode="raw_json")

# Send to RAG Service
import httpx
async with httpx.AsyncClient() as client:
    response = await client.post(
        "http://rag-service:9500/ingest",
        json={
            "dao_id": "daarion",
            "doc_id": parsed_doc.doc_id,
            "parsed_json": parsed_doc.model_dump(mode="json")
        }
    )
```

## Integration with Router

Router handles `mode="rag_query"`:

```python
# In Router
if req.mode == "rag_query":
    # Call RAG Service
    rag_response = await rag_client.query(
        dao_id=req.dao_id,
        question=req.payload.get("question")
    )
    
    # Combine with Memory context
    memory_context = await memory_client.get_context(...)
    
    # Build prompt with RAG + Memory
    prompt = build_prompt_with_rag_and_memory(
        question=req.payload.get("question"),
        rag_documents=rag_response["documents"],
        memory_context=memory_context
    )
    
    # Call LLM
    answer = await llm_provider.generate(prompt)
```

## Development

### Local Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export PG_DSN="postgresql+psycopg2://postgres:postgres@localhost:5432/daarion_city"
export EMBED_MODEL_NAME="BAAI/bge-m3"
export EMBED_DEVICE="cpu"

# Run service
uvicorn app.main:app --host 0.0.0.0 --port 9500 --reload
```

### Tests

```bash
pytest tests/
```

## Dependencies

- **Haystack 2.x**: Document store, embedding, retrieval
- **sentence-transformers**: Embedding models
- **psycopg2**: PostgreSQL connection
- **FastAPI**: API framework

