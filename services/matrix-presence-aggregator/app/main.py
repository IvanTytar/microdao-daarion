"""
Matrix Presence Aggregator - FastAPI Application

Provides REST and SSE endpoints for real-time presence data.
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import uvicorn
import logging

from .config import load_settings
from .matrix_client import MatrixClient
from .rooms_source import RoomsSource, StaticRoomsSource
from .aggregator import PresenceAggregator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

settings = load_settings()

app = FastAPI(
    title="Matrix Presence Aggregator",
    description="Real-time presence aggregation for DAARION City",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
matrix_client = MatrixClient(
    base_url=settings.matrix_base_url,
    access_token=settings.matrix_access_token,
    daemon_user=settings.presence_daemon_user,
)

# Choose rooms source
if settings.rooms_source == "database" and settings.db_dsn:
    rooms_source = RoomsSource(db_dsn=settings.db_dsn)
    logger.info(f"Using database rooms source: {settings.db_dsn[:30]}...")
elif settings.rooms_source == "static" and settings.rooms_config_path:
    rooms_source = StaticRoomsSource(config_path=settings.rooms_config_path)
    logger.info(f"Using static rooms source: {settings.rooms_config_path}")
else:
    # Fallback to database with default DSN
    rooms_source = RoomsSource(db_dsn=settings.db_dsn or "postgresql://postgres:postgres@localhost:5432/postgres")
    logger.warning("No rooms source configured, using default database")

aggregator = PresenceAggregator(
    matrix_client=matrix_client,
    rooms_source=rooms_source,
    poll_interval_seconds=settings.poll_interval_seconds,
)


@app.on_event("startup")
async def startup_event():
    logger.info("Starting Matrix Presence Aggregator...")
    asyncio.create_task(aggregator.run_forever())
    logger.info("Aggregator task started")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down...")
    aggregator.stop()
    await matrix_client.close()


@app.get("/health")
async def health():
    """Health check endpoint"""
    snapshot = aggregator.get_snapshot()
    return {
        "status": "healthy",
        "service": "matrix-presence-aggregator",
        "has_snapshot": snapshot is not None,
        "subscribers": len(aggregator._subscribers),
    }


@app.get("/presence/summary")
async def get_presence_summary():
    """
    Get current presence snapshot.
    
    Returns aggregated presence data for all rooms.
    """
    snapshot = aggregator.get_snapshot()
    if snapshot is None:
        return JSONResponse(
            content={"status": "initializing", "message": "Waiting for first poll"},
            status_code=503,
        )
    return snapshot.model_dump()


@app.get("/presence/stream")
async def presence_stream(request: Request):
    """
    SSE stream of presence updates.
    
    Clients receive real-time updates whenever presence changes.
    """
    async def event_generator():
        q = aggregator.register_subscriber()
        
        # Send initial snapshot immediately
        initial = aggregator.get_snapshot()
        if initial is not None:
            yield f"data: {initial.model_dump_json()}\n\n"

        try:
            while True:
                if await request.is_disconnected():
                    break

                try:
                    snapshot = await asyncio.wait_for(q.get(), timeout=15.0)
                    yield f"data: {snapshot.model_dump_json()}\n\n"
                except asyncio.TimeoutError:
                    # Keep connection alive
                    yield ": keep-alive\n\n"
                    continue

        finally:
            aggregator.unregister_subscriber(q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.http_host,
        port=settings.http_port,
        reload=True,
    )

