"""
DAARION DAO Service — Phase 8
Port: 7016
DAO Dashboard — Governance, Treasury, Voting
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncpg

# Import routes
import routes_dao
import routes_proposals

# Import repositories and services
from repository_dao import DaoRepository
from repository_proposals import ProposalRepository
from repository_votes import VoteRepository
from governance_engine import GovernanceEngine
from nats_client import NATSPublisher

# ============================================================================
# Configuration
# ============================================================================

PORT = int(os.getenv("PORT", "7016"))
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/daarion")
NATS_URL = os.getenv("NATS_URL", "nats://localhost:4222")

# ============================================================================
# Lifespan — Startup & Shutdown
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and Shutdown"""
    print("🚀 DAO Service starting...")
    
    # Connect to PostgreSQL
    try:
        db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
        print(f"✅ PostgreSQL connected")
    except Exception as e:
        print(f"❌ Failed to connect to PostgreSQL: {e}")
        raise
    
    app.state.db_pool = db_pool
    
    # Initialize repositories
    dao_repo = DaoRepository(db_pool)
    proposal_repo = ProposalRepository(db_pool)
    vote_repo = VoteRepository(db_pool)
    
    app.state.dao_repo = dao_repo
    app.state.proposal_repo = proposal_repo
    app.state.vote_repo = vote_repo
    
    # Initialize governance engine
    governance_engine = GovernanceEngine()
    app.state.governance_engine = governance_engine
    
    # Set repositories for routes
    routes_dao.set_dao_repository(dao_repo)
    routes_dao.set_nats_publisher(None)  # Will be set after NATS connects
    
    routes_proposals.set_dao_repository(dao_repo)
    routes_proposals.set_proposal_repository(proposal_repo)
    routes_proposals.set_vote_repository(vote_repo)
    routes_proposals.set_governance_engine(governance_engine)
    routes_proposals.set_nats_publisher(None)  # Will be set after NATS connects
    
    # Connect to NATS
    nats_pub = NATSPublisher(NATS_URL)
    try:
        await nats_pub.connect()
        app.state.nats_pub = nats_pub
        
        # Set NATS publisher for routes
        async def publish_wrapper(subject: str, payload: dict):
            await nats_pub.publish(subject, payload)
        
        routes_dao.set_nats_publisher(publish_wrapper)
        routes_proposals.set_nats_publisher(publish_wrapper)
        
        print("✅ NATS publisher configured")
    except Exception as e:
        print(f"⚠️  NATS connection failed: {e}")
        print("⚠️  Service will run without NATS events")
        app.state.nats_pub = None
    
    print(f"🎉 DAO Service ready on port {PORT}")
    
    yield
    
    # Shutdown
    if hasattr(app.state, 'nats_pub') and app.state.nats_pub:
        await app.state.nats_pub.close()
    
    await db_pool.close()
    print("✅ DAO Service stopped")

# ============================================================================
# FastAPI App
# ============================================================================

app = FastAPI(
    title="DAARION DAO Service",
    description="DAO Dashboard — Governance, Treasury, Voting",
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
app.include_router(routes_dao.router)
app.include_router(routes_proposals.router)

@app.get("/health")
async def health():
    return {
        "service": "dao-service",
        "version": "1.0.0",
        "status": "healthy",
        "phase": "8"
    }

@app.get("/")
async def root():
    return {
        "service": "DAARION DAO Service",
        "version": "1.0.0",
        "phase": "8",
        "endpoints": {
            "health": "/health",
            "daos": "/dao",
            "proposals": "/dao/{slug}/proposals",
            "votes": "/dao/{slug}/proposals/{proposal_slug}/votes"
        }
    }

if __name__ == "__main__":
    import uvicorn
    
    print(f"""
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║          🗳️  DAARION DAO SERVICE — PHASE 8 🗳️              ║
    ║                                                              ║
    ║  Port:       {PORT:<50} ║
    ║  Database:   PostgreSQL                                      ║
    ║                                                              ║
    ║  Features:                                                   ║
    ║    ✅ DAO Governance                                        ║
    ║    ✅ Proposals & Voting                                    ║
    ║    ✅ Treasury Management                                   ║
    ║    ✅ 3 Governance Models (simple/quadratic/delegated)      ║
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

