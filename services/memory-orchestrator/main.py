"""
DAARION Memory Orchestrator Service
Port: 7008
Unified memory API for agent intelligence (short/mid/long-term)
"""
import os
import asyncpg
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from models import (
    MemoryQueryRequest, MemoryQueryResponse,
    MemoryStoreRequest, MemoryStoreResponse,
    MemorySummarizeRequest, MemorySummarizeResponse
)
from embedding_client import EmbeddingClient
from backends import ShortTermBackend, VectorStoreBackend, KnowledgeBaseBackend

# ============================================================================
# Global State
# ============================================================================

db_pool: asyncpg.Pool | None = None
embedding_client: EmbeddingClient | None = None
short_term: ShortTermBackend | None = None
mid_term: VectorStoreBackend | None = None
long_term: KnowledgeBaseBackend | None = None

# ============================================================================
# App Setup
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown"""
    global db_pool, embedding_client, short_term, mid_term, long_term
    
    # Startup
    print("🚀 Starting Memory Orchestrator service...")
    
    # Database connection
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/daarion")
    db_pool = await asyncpg.create_pool(database_url, min_size=2, max_size=10)
    print("✅ Database pool created")
    
    # Embedding client
    embedding_endpoint = os.getenv("EMBEDDING_ENDPOINT", "http://localhost:8001/embed")
    embedding_client = EmbeddingClient(endpoint=embedding_endpoint)
    print("✅ Embedding client initialized")
    
    # Initialize backends
    short_term = ShortTermBackend(db_pool)
    await short_term.initialize()
    
    mid_term = VectorStoreBackend(db_pool, embedding_client)
    await mid_term.initialize()
    
    long_term = KnowledgeBaseBackend()
    await long_term.initialize()
    
    print("✅ Memory Orchestrator ready")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down Memory Orchestrator...")
    if db_pool:
        await db_pool.close()
    if embedding_client:
        await embedding_client.close()

app = FastAPI(
    title="DAARION Memory Orchestrator",
    version="1.0.0",
    description="Unified memory API for agent intelligence",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# API Endpoints
# ============================================================================

@app.post("/internal/agent-memory/query", response_model=MemoryQueryResponse)
async def query_memory(
    request: MemoryQueryRequest,
    x_internal_secret: str = Header(None, alias="X-Internal-Secret")
):
    """
    Query agent memory (semantic search)
    
    Searches across short-term, mid-term, and long-term memory
    """
    # Simple auth check
    expected_secret = os.getenv("MEMORY_ORCHESTRATOR_SECRET", "dev-secret-token")
    if x_internal_secret != expected_secret:
        raise HTTPException(401, "Invalid or missing X-Internal-Secret header")
    
    all_items = []
    
    try:
        # Query mid-term (vector search) - primary source
        mid_items = await mid_term.query(
            agent_id=request.agent_id,
            query_text=request.query,
            limit=request.limit,
            kind_filter=request.kind_filter
        )
        all_items.extend(mid_items)
        
        # If not enough results, query short-term (recent context)
        if len(all_items) < request.limit:
            short_items = await short_term.query(
                agent_id=request.agent_id,
                limit=request.limit - len(all_items),
                kind_filter=request.kind_filter
            )
            all_items.extend(short_items)
        
        # Query long-term (knowledge base) - optional
        if len(all_items) < request.limit:
            kb_items = await long_term.query(
                agent_id=request.agent_id,
                query_text=request.query,
                limit=request.limit - len(all_items)
            )
            all_items.extend(kb_items)
        
        # Sort by score and limit
        all_items.sort(key=lambda x: x.score, reverse=True)
        all_items = all_items[:request.limit]
        
        return MemoryQueryResponse(
            items=all_items,
            total=len(all_items),
            query=request.query
        )
    
    except Exception as e:
        raise HTTPException(500, f"Memory query failed: {str(e)}")

@app.post("/internal/agent-memory/store", response_model=MemoryStoreResponse)
async def store_memory(
    request: MemoryStoreRequest,
    x_internal_secret: str = Header(None, alias="X-Internal-Secret")
):
    """
    Store a new memory entry
    
    Stores in both short-term (quick access) and mid-term (vector search)
    """
    expected_secret = os.getenv("MEMORY_ORCHESTRATOR_SECRET", "dev-secret-token")
    if x_internal_secret != expected_secret:
        raise HTTPException(401, "Invalid or missing X-Internal-Secret header")
    
    try:
        # Store in short-term (always)
        memory_id = await short_term.store(
            agent_id=request.agent_id,
            microdao_id=request.microdao_id,
            kind=request.kind,
            content=request.content,
            channel_id=request.channel_id,
            metadata=request.metadata
        )
        
        # Store in mid-term (with embedding) for conversations
        if request.kind in ["conversation", "task", "dao-event"]:
            await mid_term.store(
                agent_id=request.agent_id,
                microdao_id=request.microdao_id,
                kind=request.kind,
                content=request.content,
                channel_id=request.channel_id,
                metadata=request.metadata
            )
        
        return MemoryStoreResponse(ok=True, id=memory_id)
    
    except Exception as e:
        raise HTTPException(500, f"Memory store failed: {str(e)}")

@app.post("/internal/agent-memory/summarize", response_model=MemorySummarizeResponse)
async def summarize_memory(
    request: MemorySummarizeRequest,
    x_internal_secret: str = Header(None, alias="X-Internal-Secret")
):
    """
    Summarize recent memories (stub for Phase 3)
    
    Phase 4: Will use LLM to generate summaries
    """
    expected_secret = os.getenv("MEMORY_ORCHESTRATOR_SECRET", "dev-secret-token")
    if x_internal_secret != expected_secret:
        raise HTTPException(401, "Invalid or missing X-Internal-Secret header")
    
    # Stub implementation for Phase 3
    # Phase 4: Call LLM Proxy to generate summary
    
    try:
        items = await short_term.query(
            agent_id=request.agent_id,
            limit=request.limit
        )
        
        summary = f"Recent activity summary for {request.agent_id}: {len(items)} memories retrieved. [Summary generation coming in Phase 4]"
        
        return MemorySummarizeResponse(
            summary=summary,
            items_processed=len(items)
        )
    
    except Exception as e:
        raise HTTPException(500, f"Memory summarize failed: {str(e)}")

@app.get("/health")
async def health():
    """Health check"""
    return {
        "status": "ok",
        "service": "memory-orchestrator",
        "database": "connected" if db_pool else "disconnected",
        "embedding": "ready" if embedding_client else "not ready"
    }

# ============================================================================
# Run
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7008)





