"""
DAARION Space Service

Агрегатор даних для Space Dashboard (planets, nodes, events)
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="DAARION Space Service",
    version="1.0.0",
    description="Space data aggregator for DAARION cosmic layer"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: обмежити в production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Models
# ============================================================================

class Position3D(BaseModel):
    x: float
    y: float
    z: float


class SpacePlanetSatellite(BaseModel):
    node_id: str
    gpu_load: float = Field(ge=0, le=1)
    latency: float
    agents: int


class SpacePlanet(BaseModel):
    dao_id: str
    name: str
    health: str = Field(pattern="^(good|warn|critical)$")
    treasury: float
    activity: float = Field(ge=0, le=1)
    governance_temperature: float
    anomaly_score: float
    position: Position3D
    node_count: int
    satellites: List[SpacePlanetSatellite]


class SpaceNodeGpu(BaseModel):
    load: float = Field(ge=0, le=1)
    vram_used: float
    vram_total: float
    temperature: float


class SpaceNodeCpu(BaseModel):
    load: float = Field(ge=0, le=1)
    temperature: float


class SpaceNodeMemory(BaseModel):
    used: float
    total: float


class SpaceNodeNetwork(BaseModel):
    latency: float
    bandwidth_in: float
    bandwidth_out: float
    packet_loss: float


class SpaceNode(BaseModel):
    node_id: str
    name: str
    microdao: str
    gpu: SpaceNodeGpu
    cpu: SpaceNodeCpu
    memory: SpaceNodeMemory
    network: SpaceNodeNetwork
    agents: int
    status: str = Field(pattern="^(healthy|degraded|offline)$")


class SpaceEvent(BaseModel):
    type: str
    dao_id: Optional[str] = None
    node_id: Optional[str] = None
    timestamp: int
    severity: str = Field(pattern="^(info|warn|error|critical)$")
    meta: Dict[str, Any]


# ============================================================================
# Mock Data
# ============================================================================

MOCK_PLANETS = [
    SpacePlanet(
        dao_id="dao:3",
        name="Aurora Circle",
        health="good",
        treasury=513200,
        activity=0.84,
        governance_temperature=72,
        anomaly_score=0.04,
        position=Position3D(x=120, y=40, z=-300),
        node_count=12,
        satellites=[
            SpacePlanetSatellite(
                node_id="node:03",
                gpu_load=0.66,
                latency=14,
                agents=22
            )
        ]
    )
]

MOCK_NODES = [
    SpaceNode(
        node_id="node:03",
        name="Quantum Relay",
        microdao="microdao:7",
        gpu=SpaceNodeGpu(load=0.72, vram_used=30.1, vram_total=40.0, temperature=71),
        cpu=SpaceNodeCpu(load=0.44, temperature=62),
        memory=SpaceNodeMemory(used=11.2, total=32.0),
        network=SpaceNodeNetwork(latency=12, bandwidth_in=540, bandwidth_out=430, packet_loss=0.01),
        agents=14,
        status="healthy"
    )
]

MOCK_EVENTS = [
    SpaceEvent(
        type="dao.vote.opened",
        dao_id="dao:3",
        timestamp=1735680041,
        severity="info",
        meta={"proposal_id": "P-173", "title": "Budget Allocation 2025"}
    ),
    SpaceEvent(
        type="node.alert.overload",
        node_id="node:05",
        timestamp=1735680024,
        severity="warn",
        meta={"gpu_load": 0.92}
    )
]


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "space-service"}


@app.get("/space/planets", response_model=List[SpacePlanet])
async def get_planets():
    """
    Повертає DAO-планети у космічному шарі DAARION
    
    Джерела даних:
    - DAO state → microDAO service (PostgreSQL)
    - Node metrics → NATS node.metrics.*
    - Space events → NATS JetStream events.space.*
    """
    try:
        logger.info("Fetching space planets")
        # TODO: замінити на реальну агрегацію з microDAO service
        return MOCK_PLANETS
    except Exception as e:
        logger.error(f"Error fetching planets: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch planets")


@app.get("/space/nodes", response_model=List[SpaceNode])
async def get_nodes():
    """
    Повертає усі ноди в космічній мережі DAARION
    
    Джерела даних:
    - Node metrics → NATS node.metrics.* → Redis/Timescale
    - Agent counts → Router → Agent Registry
    """
    try:
        logger.info("Fetching space nodes")
        # TODO: замінити на реальні метрики з NATS
        return MOCK_NODES
    except Exception as e:
        logger.error(f"Error fetching nodes: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch nodes")


@app.get("/space/events", response_model=List[SpaceEvent])
async def get_space_events(
    seconds: int = Query(default=120, description="Time window in seconds")
):
    """
    Поточні DAO/Node/Space події
    
    Джерела даних:
    - NATS JetStream events.space.*
    - DAO events → dao.event.*
    - Node alerts → node.alerts.*
    """
    try:
        logger.info(f"Fetching space events (last {seconds}s)")
        # TODO: замінити на реальні події з JetStream
        return MOCK_EVENTS
    except Exception as e:
        logger.error(f"Error fetching events: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch events")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7002)




