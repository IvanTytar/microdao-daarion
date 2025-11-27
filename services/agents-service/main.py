"""
DAARION Agents Service — Phase 6
Port: 7014
Agent CRUD, Events, Metrics, Context, Live WebSocket
"""
import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncpg

# Import routes
import routes_agents
import routes_events
import routes_invoke
import ws_events

# Import repositories
from repository_agents import AgentRepository
from repository_events import EventRepository

# Import NATS subscriber
from nats_subscriber import NATSSubscriber

# Import Phase 2: Agents Core components
from agent_router import AgentRouter
from agent_executor import AgentExecutor
from nats.aio.client import Client as NATS

# ============================================================================
# Configuration
# ============================================================================

PORT = int(os.getenv("PORT", "7014"))
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/daarion")
NATS_URL = os.getenv("NATS_URL", "nats://localhost:4222")

# ============================================================================
# Lifespan — Startup & Shutdown
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup:
    - Connect to PostgreSQL
    - Initialize repositories
    - Connect to NATS
    - Subscribe to NATS events
    - Start WebSocket event queue consumer
    
    Shutdown:
    - Close DB connection
    - Close NATS connection
    """
    print("🚀 Agents Service starting...")
    
    # ========================================================================
    # Startup
    # ========================================================================
    
    # Connect to PostgreSQL
    try:
        db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
        print(f"✅ PostgreSQL connected: {DATABASE_URL}")
    except Exception as e:
        print(f"❌ Failed to connect to PostgreSQL: {e}")
        raise
    
    # Initialize repositories
    agent_repo = AgentRepository(db_pool)
    event_repo = EventRepository(db_pool)
    
    # Inject repos into routes
    routes_agents.agent_repo = agent_repo
    routes_agents.event_repo = event_repo
    routes_events.event_repo = event_repo
    
    print("✅ Repositories initialized")
    
    # Connect to NATS
    nats_subscriber = None
    try:
        nats_subscriber = NATSSubscriber(NATS_URL, event_repo)
        await nats_subscriber.connect()
        await nats_subscriber.subscribe_all()
        print("✅ NATS subscriptions active")
    except Exception as e:
        print(f"⚠️  NATS connection failed (running without NATS): {e}")
    
    # Start WebSocket event queue consumer
    ws_task = asyncio.create_task(ws_events.event_queue_consumer())
    print("✅ WebSocket event queue consumer started")
    
    # Store in app state
    app.state.db_pool = db_pool
    app.state.agent_repo = agent_repo
    app.state.event_repo = event_repo
    app.state.nats_subscriber = nats_subscriber
    app.state.ws_task = ws_task
    
    print(f"🎉 Agents Service ready on port {PORT}")
    
    yield
    
    # ========================================================================
    # Shutdown
    # ========================================================================
    
    print("🛑 Agents Service shutting down...")
    
    # Cancel WebSocket task
    if not ws_task.done():
        ws_task.cancel()
        try:
            await ws_task
        except asyncio.CancelledError:
            pass
    
    # Close NATS
    if nats_subscriber:
        await nats_subscriber.close()
    
    # Close DB pool
    await db_pool.close()
    
    print("✅ Agents Service stopped")

# ============================================================================
# FastAPI App
# ============================================================================

app = FastAPI(
    title="DAARION Agents Service",
    description="Agent CRUD, Events, Metrics, Context, Live WebSocket",
    version="2.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Include Routers
# ============================================================================

app.include_router(routes_agents.router)
app.include_router(routes_events.router)
app.include_router(routes_invoke.router)  # Phase 2: Agents Core
app.include_router(ws_events.router)

# ============================================================================
# Health Check
# ============================================================================

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "service": "agents-service",
        "version": "2.0.0",
        "status": "healthy",
        "phase": "6"
    }

# ============================================================================
# Root
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "DAARION Agents Service",
        "version": "2.1.0",
        "phase": "6+2 (Agents Core)",
        "endpoints": {
            "health": "/health",
            "agents": "/agents",
            "blueprints": "/agents/blueprints",
            "events": "/agents/{agent_id}/events",
            "websocket": "/ws/agents/stream",
            "invoke": "/agents/invoke",
            "filter": "/agents/filter",
            "quota": "/agents/{agent_id}/quota"
        }
    }

# ============================================================================
# Run
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    print(f"""
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║          🤖 DAARION AGENTS SERVICE — PHASE 6 🤖             ║
    ║                                                              ║
    ║  Port:       {PORT:<50} ║
    ║  Database:   PostgreSQL                                      ║
    ║  NATS:       {NATS_URL:<50} ║
    ║                                                              ║
    ║  Features:                                                   ║
    ║    ✅ Agent CRUD (Create, Read, Update, Delete)            ║
    ║    ✅ Event Store (DB persistence)                         ║
    ║    ✅ Live WebSocket streams                               ║
    ║    ✅ NATS event subscriptions                             ║
    ║    ✅ Auth & PDP integration                               ║
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
