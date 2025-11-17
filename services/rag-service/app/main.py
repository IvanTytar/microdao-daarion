"""
RAG Service - FastAPI application
Retrieval-Augmented Generation for MicroDAO
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.models import IngestRequest, IngestResponse, QueryRequest, QueryResponse
from app.ingest_pipeline import ingest_parsed_document
from app.query_pipeline import answer_query
from app.event_worker import event_worker

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events: startup and shutdown"""
    import threading
    
    # Startup
    logger.info("Starting RAG Service...")
    
    # Start event worker in a background thread
    def run_event_worker():
        import asyncio
        asyncio.run(event_worker())
        
    event_worker_thread = threading.Thread(target=run_event_worker, daemon=True)
    event_worker_thread.start()
    logger.info("RAG Event Worker started in background thread")
    
    app.state.event_worker_thread = event_worker_thread
    
    yield
    
    # Shutdown
    logger.info("Shutting down RAG Service...")
    
    import asyncio
    from app.event_worker import close_subscriptions
    await close_subscriptions()
    if event_worker_thread.is_alive():
        logger.info("Event Worker is still running, will shut down automatically")


# FastAPI app
app = FastAPI(
    title="RAG Service",
    description="Retrieval-Augmented Generation service for MicroDAO",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "rag-service",
        "version": "1.0.0"
    }


@app.post("/ingest", response_model=IngestResponse)
async def ingest_endpoint(request: IngestRequest):
    """
    Ingest parsed document from PARSER service into RAG
    
    Body:
    - dao_id: DAO identifier
    - doc_id: Document identifier
    - parsed_json: ParsedDocument JSON from PARSER service
    - user_id: Optional user identifier
    """
    try:
        result = ingest_parsed_document(
            dao_id=request.dao_id,
            doc_id=request.doc_id,
            parsed_json=request.parsed_json,
            user_id=request.user_id
        )
        
        return IngestResponse(**result)
        
    except Exception as e:
        logger.error(f"Ingest endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/query", response_model=QueryResponse)
async def query_endpoint(request: QueryRequest):
    """
    Answer query using RAG pipeline
    
    Body:
    - dao_id: DAO identifier
    - question: User question
    - top_k: Optional number of documents to retrieve
    - user_id: Optional user identifier
    """
    try:
        result = await answer_query(
            dao_id=request.dao_id,
            question=request.question,
            top_k=request.top_k,
            user_id=request.user_id
        )
        
        return QueryResponse(**result)
        
    except Exception as e:
        logger.error(f"Query endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    from app.core.config import settings
    
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True
    )

