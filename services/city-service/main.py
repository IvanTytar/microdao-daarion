"""
DAARION City Service

Агрегатор даних для City Dashboard + City Rooms + Presence
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import logging
import asyncio

# Import new modules
import routes_city
import ws_city
import repo_city
import migrations  # Import migrations
from common.redis_client import get_redis, close_redis
from presence_gateway import (
    websocket_global_presence,
    start_presence_gateway,
    stop_presence_gateway
)

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from fastapi.staticfiles import StaticFiles
import os

# ... imports ...

app = FastAPI(
    title="DAARION City Service",
    version="2.0.0",
    description="City snapshot aggregator + Rooms + Presence for DAARION ecosystem"
)

# Create static directory if not exists
os.makedirs("static/uploads", exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: обмежити в production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(routes_city.router)
app.include_router(routes_city.public_router)
app.include_router(routes_city.api_router)

# ============================================================================
# Models
# ============================================================================

class CityUser(BaseModel):
    id: str
    handle: str
    archetype: str
    microdaoId: Optional[str] = None


class CityMicroDAO(BaseModel):
    id: str
    name: str
    members: int
    humans: int
    agents: int
    balanceDcr: float
    activity24h: float = Field(ge=0, le=1)


class CityMetrics(BaseModel):
    activityIndex: float = Field(ge=0, le=1)
    avgAgentLatencyMs: float
    natsTps: int
    nodeAvgLoad: float = Field(ge=0, le=1)
    errorRate: float
    questEngagement: float = Field(ge=0, le=1)


class CityNode(BaseModel):
    id: str
    label: str
    gpuLoad: float = Field(ge=0, le=1)
    latencyMs: float
    agents: int
    status: str = Field(pattern="^(healthy|warn|critical)$")


class CityAgentSummary(BaseModel):
    id: str
    name: str
    role: str
    status: str = Field(pattern="^(online|offline|busy)$")
    lastAction: Optional[str] = None


class CityQuestSummary(BaseModel):
    id: str
    label: str
    progress: float = Field(ge=0, le=1)


class CityEvent(BaseModel):
    id: str
    type: str = Field(pattern="^(dao|node|matrix|quest|system)$")
    label: str
    timestamp: str
    severity: str = Field(pattern="^(info|warn|error)$")


class CitySnapshot(BaseModel):
    user: CityUser
    microdao: Optional[CityMicroDAO]
    metrics: CityMetrics
    nodes: List[CityNode]
    agents: List[CityAgentSummary]
    quests: List[CityQuestSummary]
    events: List[CityEvent]


# ============================================================================
# Mock Data (тимчасово, до інтеграції з реальними джерелами)
# ============================================================================

MOCK_CITY_SNAPSHOT = CitySnapshot(
    user=CityUser(
        id="user:93",
        handle="@alice:daarion.city",
        archetype="Explorer",
        microdaoId="microdao:7"
    ),
    microdao=CityMicroDAO(
        id="microdao:7",
        name="Quantum Garden",
        members=7,
        humans=4,
        agents=3,
        balanceDcr=12820,
        activity24h=0.84
    ),
    metrics=CityMetrics(
        activityIndex=0.71,
        avgAgentLatencyMs=13,
        natsTps=48200,
        nodeAvgLoad=0.66,
        errorRate=0.009,
        questEngagement=0.62
    ),
    nodes=[
        CityNode(
            id="node:03",
            label="Quantum Relay",
            gpuLoad=0.72,
            latencyMs=14,
            agents=14,
            status="healthy"
        ),
        CityNode(
            id="node:04",
            label="Atlas Engine",
            gpuLoad=0.88,
            latencyMs=19,
            agents=11,
            status="warn"
        )
    ],
    agents=[
        CityAgentSummary(
            id="agent:sofia",
            name="Sofia-Prime",
            role="System Architect",
            status="online",
            lastAction="Summarized DAO events 2m ago"
        )
    ],
    quests=[
        CityQuestSummary(id="q1", label="Visit Space Map", progress=0.4),
        CityQuestSummary(id="q2", label="Vote in DAO proposal", progress=0.0),
    ],
    events=[
        CityEvent(
            id="evt-1133",
            type="dao",
            label="New proposal in Aurora Circle",
            timestamp="2025-11-24T09:12:11Z",
            severity="info"
        ),
        CityEvent(
            id="evt-1134",
            type="node",
            label="NODE-03 GPU spike",
            timestamp="2025-11-24T09:12:14Z",
            severity="warn"
        )
    ]
)


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "city-service"}


@app.get("/api/city/snapshot", response_model=CitySnapshot)
async def get_city_snapshot():
    """
    Повертає повний знімок стану міста DAARION
    
    Агрегує дані з:
    - Auth / Profile service
    - microDAO service
    - Metrics collector (NATS → Redis/TSDB)
    - NodeMetrics Agent (NATS node.metrics.*)
    - Agent Registry
    - Quest Engine
    - JetStream Stream events.city.*
    """
    try:
        # TODO: замінити на реальну агрегацію даних
        logger.info("Fetching city snapshot")
        return MOCK_CITY_SNAPSHOT
    except Exception as e:
        logger.error(f"Error fetching city snapshot: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch city snapshot")


# ============================================================================
# WebSocket Endpoints
# ============================================================================

from websocket import (
    manager,
    city_updates_generator,
    events_stream_generator,
    metrics_stream_generator,
    agents_presence_generator,
)


@app.websocket("/ws/city")
async def websocket_city(websocket: WebSocket):
    """
    WebSocket для live оновлень City Dashboard
    
    Надсилає оновлення метрик, нод, агентів кожні 5 секунд
    """
    await manager.connect(websocket, "city")
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.websocket("/ws/events")
async def websocket_events(websocket: WebSocket):
    """
    WebSocket для потоку подій міста
    
    Надсилає нові події в реальному часі
    """
    await manager.connect(websocket, "events")
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.websocket("/ws/metrics")
async def websocket_metrics(websocket: WebSocket):
    """
    WebSocket для live метрик
    
    Надсилає оновлення метрик кожну секунду
    """
    await manager.connect(websocket, "metrics")
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.websocket("/ws/agents")
async def websocket_agents(websocket: WebSocket):
    """
    WebSocket для присутності агентів
    
    Надсилає оновлення присутності агентів
    """
    await manager.connect(websocket, "agents")
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.websocket("/ws/city/rooms/{room_id}")
async def websocket_room_endpoint(websocket: WebSocket, room_id: str):
    """WebSocket для City Room"""
    await ws_city.websocket_city_room(websocket, room_id)


@app.websocket("/ws/city/presence")
async def websocket_presence_endpoint(websocket: WebSocket):
    """WebSocket для Presence System (user heartbeats)"""
    await ws_city.websocket_city_presence(websocket)


@app.websocket("/ws/city/global-presence")
async def websocket_global_presence_endpoint(websocket: WebSocket):
    """WebSocket для Global Room Presence (aggregated from Matrix)"""
    await websocket_global_presence(websocket)


@app.on_event("startup")
async def startup_event():
    """Запустити background tasks для WebSocket оновлень"""
    logger.info("🚀 City Service starting...")
    
    # Initialize Redis
    try:
        await get_redis()
        logger.info("✅ Redis connection established")
    except Exception as e:
        logger.error(f"❌ Redis connection failed: {e}")
    
    # Run DB Migrations
    try:
        await migrations.run_migrations()
        logger.info("✅ DB Migrations completed")
    except Exception as e:
        logger.error(f"❌ DB Migrations failed: {e}")

    # Background tasks
    asyncio.create_task(city_updates_generator())
    asyncio.create_task(events_stream_generator())
    asyncio.create_task(metrics_stream_generator())
    asyncio.create_task(agents_presence_generator())
    asyncio.create_task(ws_city.presence_cleanup_task())
    
    # Start global presence gateway (NATS subscriber)
    try:
        await start_presence_gateway()
        logger.info("✅ Global presence gateway started")
    except Exception as e:
        logger.warning(f"⚠️ Global presence gateway failed to start: {e}")
    
    logger.info("✅ WebSocket background tasks started")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup при зупинці"""
    logger.info("🛑 City Service shutting down...")
    await stop_presence_gateway()
    await repo_city.close_pool()
    await close_redis()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7001)

