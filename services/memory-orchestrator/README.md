# Memory Orchestrator Service

**Port:** 7008  
**Purpose:** Unified memory API for DAARION agents

## Features

✅ **Multi-layer memory:**
- Short-term: Recent conversations & events (PostgreSQL)
- Mid-term: Semantic memory with RAG (Vector store)
- Long-term: Knowledge base (Docs, roadmaps)

✅ **Semantic search:**
- Vector embeddings (BGE-M3 or similar)
- Cosine similarity search
- Fallback to text search if pgvector unavailable

✅ **Flexible storage:**
- PostgreSQL for structured data
- pgvector for embeddings (optional)
- Filesystem for knowledge base (Phase 3 stub)

## API

### POST /internal/agent-memory/query

**Request:**
```json
{
  "agent_id": "agent:sofia",
  "microdao_id": "microdao:7",
  "channel_id": "optional-channel-uuid",
  "query": "What were recent changes in this microDAO?",
  "limit": 5,
  "kind_filter": ["conversation", "dao-event"]
}
```

**Response:**
```json
{
  "items": [
    {
      "id": "mem-uuid",
      "kind": "conversation",
      "score": 0.87,
      "content": "User discussed Phase 3 implementation...",
      "meta": {
        "source": "channel:...",
        "timestamp": "..."
      },
      "created_at": "2025-11-24T12:34:56Z"
    }
  ],
  "total": 3,
  "query": "What were recent changes..."
}
```

### POST /internal/agent-memory/store

**Request:**
```json
{
  "agent_id": "agent:sofia",
  "microdao_id": "microdao:7",
  "channel_id": "optional",
  "kind": "conversation",
  "content": {
    "user_message": "How do I start Phase 3?",
    "agent_reply": "First, copy PHASE3_MASTER_TASK.md..."
  },
  "metadata": {
    "channel_name": "dev-updates",
    "message_id": "msg-123"
  }
}
```

**Response:**
```json
{
  "ok": true,
  "id": "mem-uuid-123"
}
```

### POST /internal/agent-memory/summarize

**Request:**
```json
{
  "agent_id": "agent:sofia",
  "microdao_id": "microdao:7",
  "limit": 10
}
```

**Response (Phase 3 stub):**
```json
{
  "summary": "Recent activity summary: 10 memories retrieved. [Full summary in Phase 4]",
  "items_processed": 10
}
```

## Setup

### Prerequisites

**PostgreSQL with pgvector (optional):**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**Or without pgvector:**
- Service will work with fallback text search

### Environment Variables

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/daarion
EMBEDDING_ENDPOINT=http://localhost:8001/embed  # Optional
MEMORY_ORCHESTRATOR_SECRET=dev-secret-token
```

### Local Development

```bash
cd services/memory-orchestrator

# Install
pip install -r requirements.txt

# Run
python main.py
```

### Docker

```bash
docker build -t memory-orchestrator .
docker run -p 7008:7008 \
  -e DATABASE_URL="postgresql://..." \
  memory-orchestrator
```

## Memory Types

### Short-term (7 days retention)
- Recent channel messages
- Event log
- Quick lookup by time

**Storage:** `agent_memories_short` table

### Mid-term (90 days retention)
- Semantic search
- Conversation context
- Task history

**Storage:** `agent_memories_vector` table (with embeddings)

### Long-term (permanent)
- Knowledge base
- Docs & roadmaps
- Structured knowledge

**Storage:** Filesystem (Phase 3 stub)

## Integration with agent-runtime

```python
import httpx

async def get_agent_context(agent_id, query):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://memory-orchestrator:7008/internal/agent-memory/query",
            headers={"X-Internal-Secret": "dev-secret-token"},
            json={
                "agent_id": agent_id,
                "microdao_id": "microdao:7",
                "query": query,
                "limit": 5
            }
        )
        return response.json()

async def save_conversation(agent_id, user_msg, agent_reply):
    async with httpx.AsyncClient() as client:
        await client.post(
            "http://memory-orchestrator:7008/internal/agent-memory/store",
            headers={"X-Internal-Secret": "dev-secret-token"},
            json={
                "agent_id": agent_id,
                "microdao_id": "microdao:7",
                "kind": "conversation",
                "content": {
                    "user_message": user_msg,
                    "agent_reply": agent_reply
                }
            }
        )
```

## Embedding Service

### Option 1: Local Embedding (Recommended for Phase 3)

Use sentence-transformers or similar:

```python
# Simple embedding server (Flask/FastAPI)
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('BAAI/bge-m3')

@app.post("/embed")
def embed(text: str):
    embedding = model.encode(text).tolist()
    return {"embedding": embedding}
```

### Option 2: OpenAI Embeddings

```python
# Update embedding_client.py to use OpenAI
import openai

embedding = openai.embeddings.create(
    input=text,
    model="text-embedding-ada-002"
)
```

### Option 3: No Embedding (Fallback)

Service will use simple text search (ILIKE) if embedding service unavailable.

## Database Schema

### agent_memories_short
```sql
CREATE TABLE agent_memories_short (
    id UUID PRIMARY KEY,
    agent_id TEXT NOT NULL,
    microdao_id TEXT NOT NULL,
    channel_id TEXT,
    kind TEXT NOT NULL,
    content JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### agent_memories_vector
```sql
CREATE TABLE agent_memories_vector (
    id UUID PRIMARY KEY,
    agent_id TEXT NOT NULL,
    microdao_id TEXT NOT NULL,
    channel_id TEXT,
    kind TEXT NOT NULL,
    content TEXT NOT NULL,
    content_json JSONB,
    embedding vector(1024),  -- pgvector
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Roadmap

### Phase 3 (Current):
- ✅ Short-term memory (PostgreSQL)
- ✅ Mid-term memory (Vector search)
- ✅ Long-term stub (KB filesystem)
- ✅ Semantic search with embeddings
- ✅ Fallback to text search

### Phase 3.5:
- 🔜 LLM-based summarization
- 🔜 Memory consolidation
- 🔜 Context pruning
- 🔜 Advanced RAG strategies

### Phase 4:
- 🔜 Knowledge base indexing
- 🔜 Multi-modal memory (images, files)
- 🔜 Memory sharing across agents
- 🔜 Forgetting mechanisms

## Troubleshooting

**pgvector not available?**
- Service will work with text search fallback
- To enable: `CREATE EXTENSION vector;` in PostgreSQL

**Embeddings not working?**
- Check embedding service: `curl http://localhost:8001/embed`
- Service will use fallback if unavailable

**Slow queries?**
- Check indexes: `EXPLAIN ANALYZE SELECT ...`
- Tune ivfflat index parameters
- Consider increasing `lists` parameter

---

**Status:** ✅ Phase 3 Ready  
**Version:** 1.0.0  
**Last Updated:** 2025-11-24




