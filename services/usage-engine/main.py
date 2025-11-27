"""
DAARION Usage Engine
Port: 7013
Collects and reports usage metrics (LLM, Tools, Agents, Messages)
"""
import os
import asyncio
import asyncpg
import nats
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from models import UsageQueryRequest, UsageQueryResponse
from collectors import UsageCollector
from aggregators import UsageAggregator

# ============================================================================
# Configuration
# ============================================================================

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/daarion")
NATS_URL = os.getenv("NATS_URL", "nats://nats:4222")

# ============================================================================
# Global State
# ============================================================================

db_pool: Optional[asyncpg.Pool] = None
nc: Optional[nats.NATS] = None
collector: Optional[UsageCollector] = None
aggregator: Optional[UsageAggregator] = None

# ============================================================================
# App Setup
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown"""
    global db_pool, nc, collector, aggregator
    
    print("🚀 Starting Usage Engine...")
    
    # Database
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    print("✅ Database pool created")
    
    # NATS
    try:
        nc = await nats.connect(NATS_URL)
        print(f"✅ Connected to NATS at {NATS_URL}")
    except Exception as e:
        print(f"❌ Failed to connect to NATS: {e}")
        nc = None
    
    # Collector
    if nc:
        collector = UsageCollector(nc, db_pool)
        await collector.start()
    else:
        print("⚠️  NATS not available, collector disabled")
    
    # Aggregator
    aggregator = UsageAggregator(db_pool)
    print("✅ Aggregator ready")
    
    print("✅ Usage Engine ready")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down Usage Engine...")
    if collector:
        await collector.stop()
    if nc:
        await nc.close()
    if db_pool:
        await db_pool.close()

app = FastAPI(
    title="DAARION Usage Engine",
    version="1.0.0",
    description="Usage tracking and reporting for LLM, Tools, Agents",
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

@app.get("/internal/usage/summary", response_model=UsageQueryResponse)
async def get_usage_summary(
    microdao_id: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None),
    period_hours: int = Query(24, ge=1, le=720)
):
    """
    Get aggregated usage summary
    
    Query parameters:
    - microdao_id: Filter by microDAO (optional)
    - agent_id: Filter by agent (optional)
    - period_hours: Time period (1-720 hours, default 24)
    """
    
    if not aggregator:
        raise HTTPException(500, "Aggregator not initialized")
    
    # Get summary
    summary = await aggregator.get_summary(
        microdao_id=microdao_id,
        agent_id=agent_id,
        period_hours=period_hours
    )
    
    # Get breakdowns
    models = await aggregator.get_model_breakdown(
        microdao_id=microdao_id,
        period_hours=period_hours
    )
    
    agents = await aggregator.get_agent_breakdown(
        microdao_id=microdao_id,
        period_hours=period_hours
    )
    
    tools = await aggregator.get_tool_breakdown(
        microdao_id=microdao_id,
        period_hours=period_hours
    )
    
    return UsageQueryResponse(
        summary=summary,
        models=models,
        agents=agents,
        tools=tools
    )

@app.get("/internal/usage/models")
async def get_model_usage(
    microdao_id: Optional[str] = Query(None),
    period_hours: int = Query(24, ge=1, le=720)
):
    """Get usage breakdown by model"""
    
    if not aggregator:
        raise HTTPException(500, "Aggregator not initialized")
    
    models = await aggregator.get_model_breakdown(
        microdao_id=microdao_id,
        period_hours=period_hours
    )
    
    return {"models": models}

@app.get("/internal/usage/agents")
async def get_agent_usage(
    microdao_id: Optional[str] = Query(None),
    period_hours: int = Query(24, ge=1, le=720)
):
    """Get usage breakdown by agent"""
    
    if not aggregator:
        raise HTTPException(500, "Aggregator not initialized")
    
    agents = await aggregator.get_agent_breakdown(
        microdao_id=microdao_id,
        period_hours=period_hours
    )
    
    return {"agents": agents}

@app.get("/internal/usage/tools")
async def get_tool_usage(
    microdao_id: Optional[str] = Query(None),
    period_hours: int = Query(24, ge=1, le=720)
):
    """Get usage breakdown by tool"""
    
    if not aggregator:
        raise HTTPException(500, "Aggregator not initialized")
    
    tools = await aggregator.get_tool_breakdown(
        microdao_id=microdao_id,
        period_hours=period_hours
    )
    
    return {"tools": tools}

@app.get("/health")
async def health():
    """Health check"""
    return {
        "status": "ok",
        "service": "usage-engine",
        "nats_connected": nc is not None,
        "collector_active": collector is not None,
        "aggregator_ready": aggregator is not None
    }

# ============================================================================
# Run
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7013)





