"""
DAARION Living Map Service — Phase 9A
Port: 7017
Aggregated network state visualization
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncpg

# Import modules
import routes
from snapshot_builder import SnapshotBuilder
from repository_history import HistoryRepository
from nats_subscriber import NATSSubscriber
from ws_stream import websocket_endpoint, broadcast_event

# ============================================================================
# Configuration
# ============================================================================

PORT = int(os.getenv("PORT", "7017"))
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/daarion")
NATS_URL = os.getenv("NATS_URL", "nats://localhost:4222")

# ============================================================================
# Lifespan — Startup & Shutdown
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and Shutdown"""
    print("🚀 Living Map Service starting...")
    
    # Connect to PostgreSQL
    try:
        db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
        print(f"✅ PostgreSQL connected")
    except Exception as e:
        print(f"❌ Failed to connect to PostgreSQL: {e}")
        raise
    
    app.state.db_pool = db_pool
    
    # Initialize components
    history_repo = HistoryRepository(db_pool)
    snapshot_builder = SnapshotBuilder()
    
    app.state.history_repo = history_repo
    app.state.snapshot_builder = snapshot_builder
    
    # Set dependencies for routes
    routes.set_snapshot_builder(snapshot_builder)
    routes.set_history_repo(history_repo)
    routes.set_ws_handler(websocket_endpoint)
    
    # Connect to NATS
    nats_sub = NATSSubscriber(NATS_URL, history_repo)
    try:
        await nats_sub.connect()
        await nats_sub.subscribe_all(event_callback=broadcast_event)
        app.state.nats_sub = nats_sub
        print("✅ NATS subscriber configured")
    except Exception as e:
        print(f"⚠️  NATS connection failed: {e}")
        print("⚠️  Service will run without NATS events")
        app.state.nats_sub = None
    
    print(f"🎉 Living Map Service ready on port {PORT}")
    
    yield
    
    # Shutdown
    if hasattr(app.state, 'nats_sub') and app.state.nats_sub:
        await app.state.nats_sub.close()
    
    await db_pool.close()
    print("✅ Living Map Service stopped")

# ============================================================================
# FastAPI App
# ============================================================================

app = FastAPI(
    title="DAARION Living Map Service",
    description="Aggregated network state visualization",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(routes.router)

@app.get("/")
async def root():
    return {
        "service": "DAARION Living Map Service",
        "version": "1.0.0",
        "phase": "9A",
        "endpoints": {
            "health": "/living-map/health",
            "snapshot": "/living-map/snapshot",
            "entities": "/living-map/entities",
            "history": "/living-map/history",
            "stream": "ws://localhost:7017/living-map/stream"
        }
    }

if __name__ == "__main__":
    import uvicorn
    
    print(f"""
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║          🗺️  DAARION LIVING MAP SERVICE — PHASE 9A 🗺️      ║
    ║                                                              ║
    ║  Port:       {PORT:<50} ║
    ║  Database:   PostgreSQL                                      ║
    ║  NATS:       JetStream                                       ║
    ║                                                              ║
    ║  Features:                                                   ║
    ║    ✅ Network State Aggregation                             ║
    ║    ✅ 4 Layers (City/Space/Nodes/Agents)                    ║
    ║    ✅ Real-time WebSocket Stream                            ║
    ║    ✅ Event History                                         ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        reload=False,
        log_level="info"
    )

