"""
DAARION MicroDAO Service — Phase 7
Port: 7015
MicroDAO Console — Backend Complete
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncpg

# Import routes
import routes_microdao
import routes_members
import routes_treasury
import routes_settings

# Import repository and NATS
from repository_microdao import MicrodaoRepository
from nats_client import NATSPublisher

# ============================================================================
# Configuration
# ============================================================================

PORT = int(os.getenv("PORT", "7015"))
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
    - Initialize repository
    - Connect to NATS
    - Set up routes with dependencies
    
    Shutdown:
    - Close DB connection
    - Close NATS connection
    """
    print("🚀 MicroDAO Service starting...")
    
    # Connect to PostgreSQL
    try:
        db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
        print(f"✅ PostgreSQL connected")
    except Exception as e:
        print(f"❌ Failed to connect to PostgreSQL: {e}")
        raise
    
    app.state.db_pool = db_pool
    
    # Initialize repository
    repo = MicrodaoRepository(db_pool)
    app.state.repo = repo
    
    # Set repository for all routes
    routes_microdao.set_repository(repo)
    routes_members.set_repository(repo)
    routes_treasury.set_repository(repo)
    routes_settings.set_repository(repo)
    
    # Connect to NATS
    nats_pub = NATSPublisher(NATS_URL)
    try:
        await nats_pub.connect()
        app.state.nats_pub = nats_pub
        
        # Set NATS publisher for all routes
        async def publish_wrapper(subject: str, payload: dict):
            await nats_pub.publish(subject, payload)
        
        routes_microdao.set_nats_publisher(publish_wrapper)
        routes_members.set_nats_publisher(publish_wrapper)
        routes_treasury.set_nats_publisher(publish_wrapper)
        routes_settings.set_nats_publisher(publish_wrapper)
        
        print("✅ NATS publisher configured")
    except Exception as e:
        print(f"⚠️  NATS connection failed: {e}")
        print("⚠️  Service will run without NATS events")
        app.state.nats_pub = None
    
    print(f"🎉 MicroDAO Service ready on port {PORT}")
    
    yield
    
    # Shutdown
    if hasattr(app.state, 'nats_pub') and app.state.nats_pub:
        await app.state.nats_pub.close()
    
    await db_pool.close()
    print("✅ MicroDAO Service stopped")

app = FastAPI(
    title="DAARION MicroDAO Service",
    description="MicroDAO Console (MVP)",
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

# Include routers
app.include_router(routes_microdao.router)
app.include_router(routes_members.router)
app.include_router(routes_treasury.router)
app.include_router(routes_settings.router)

@app.get("/health")
async def health():
    return {
        "service": "microdao-service",
        "version": "1.0.0",
        "status": "healthy",
        "phase": "7"
    }

@app.get("/")
async def root():
    return {
        "service": "DAARION MicroDAO Service",
        "version": "1.0.0",
        "phase": "7",
        "endpoints": {
            "health": "/health",
            "microdaos": "/microdao",
            "members": "/microdao/{slug}/members",
            "treasury": "/microdao/{slug}/treasury"
        }
    }

if __name__ == "__main__":
    import uvicorn
    
    print(f"""
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║          🏛️ DAARION MICRODAO SERVICE — PHASE 7 🏛️         ║
    ║                                                              ║
    ║  Port:       {PORT:<50} ║
    ║  Database:   PostgreSQL                                      ║
    ║                                                              ║
    ║  Features:                                                   ║
    ║    ✅ MicroDAO CRUD                                         ║
    ║    ✅ Member management                                     ║
    ║    ✅ Treasury tracking                                     ║
    ║    ✅ Settings & roles                                      ║
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

