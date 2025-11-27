"""
Living Map Service Models
Phase 9: Full Stack Living Map
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from decimal import Decimal

# ============================================================================
# Layer Types
# ============================================================================

LayerType = Literal["city", "space", "nodes", "agents"]
EntityType = Literal["city", "space", "node", "agent", "dao", "microdao", "channel"]
EntityStatus = Literal["active", "inactive", "online", "offline", "warning", "error", "idle"]

# ============================================================================
# City Layer Models
# ============================================================================

class CityItem(BaseModel):
    """MicroDAO in City layer"""
    id: str
    slug: str
    name: str
    status: EntityStatus
    agents: int = 0
    nodes: int = 0
    members: int = 0
    description: Optional[str] = None

class CityLayer(BaseModel):
    """City layer data"""
    microdaos_total: int = 0
    active_users: int = 0
    active_agents: int = 0
    health: str = "green"
    items: List[CityItem] = []

# ============================================================================
# Space Layer Models
# ============================================================================

class PlanetItem(BaseModel):
    """DAO planet in Space layer"""
    id: str
    name: str
    type: str = "dao"
    status: EntityStatus
    orbits: List[str] = []  # node IDs
    treasury_value: Optional[Decimal] = None
    active_proposals: int = 0

class NodeInSpace(BaseModel):
    """Node in Space layer (orbital view)"""
    id: str
    name: str
    status: EntityStatus
    cpu: float = 0.0
    gpu: float = 0.0
    memory: float = 0.0
    alerts: List[str] = []

class SpaceLayer(BaseModel):
    """Space layer data"""
    planets: List[PlanetItem] = []
    nodes: List[NodeInSpace] = []

# ============================================================================
# Nodes Layer Models
# ============================================================================

class NodeMetrics(BaseModel):
    """Node hardware metrics"""
    cpu: float = 0.0
    gpu: float = 0.0
    ram: float = 0.0
    disk: float = 0.0
    net_in: int = 0
    net_out: int = 0
    temperature: Optional[float] = None

class NodeItem(BaseModel):
    """Node in Nodes layer"""
    id: str
    name: str
    microdao_id: Optional[str] = None
    status: EntityStatus
    metrics: NodeMetrics
    alerts: List[str] = []
    uptime_seconds: Optional[int] = None
    last_seen: Optional[datetime] = None

class NodesLayer(BaseModel):
    """Nodes layer data"""
    items: List[NodeItem] = []
    total_cpu: float = 0.0
    total_gpu: float = 0.0
    total_ram: float = 0.0

# ============================================================================
# Agents Layer Models
# ============================================================================

class AgentUsage(BaseModel):
    """Agent usage statistics"""
    llm_calls_24h: int = 0
    tokens_24h: int = 0
    messages_24h: int = 0
    avg_response_time_ms: Optional[float] = None

class AgentItem(BaseModel):
    """Agent in Agents layer"""
    id: str
    name: str
    kind: str
    microdao_id: Optional[str] = None
    status: EntityStatus
    usage: AgentUsage
    model: Optional[str] = None
    last_active: Optional[datetime] = None

class AgentsLayer(BaseModel):
    """Agents layer data"""
    items: List[AgentItem] = []
    total_agents: int = 0
    online_agents: int = 0
    total_llm_calls_24h: int = 0

# ============================================================================
# Snapshot Models
# ============================================================================

class SnapshotMeta(BaseModel):
    """Metadata for snapshot"""
    source_services: List[str] = []
    generated_at: datetime
    version: str = "1.0"
    request_id: Optional[str] = None

class LivingMapSnapshot(BaseModel):
    """Complete Living Map state"""
    generated_at: datetime
    layers: Dict[str, Any]  # Flexible for different layer structures
    meta: SnapshotMeta

class LivingMapSnapshotTyped(BaseModel):
    """Typed version of Living Map snapshot"""
    generated_at: datetime
    layers: Dict[str, Any] = Field(default_factory=dict)
    meta: SnapshotMeta

    class Config:
        arbitrary_types_allowed = True

# ============================================================================
# Entity Models
# ============================================================================

class EntitySummary(BaseModel):
    """Minimal entity info for lists"""
    id: str
    type: EntityType
    label: str
    status: EntityStatus
    layer: LayerType

class EntityDetail(BaseModel):
    """Detailed entity information"""
    id: str
    type: EntityType
    layer: LayerType
    data: Dict[str, Any]

# ============================================================================
# History / Event Models
# ============================================================================

class HistoryItem(BaseModel):
    """Single history event"""
    id: str
    timestamp: datetime
    event_type: str
    payload: Dict[str, Any]
    source_service: Optional[str] = None
    entity_id: Optional[str] = None
    entity_type: Optional[str] = None

class HistoryResponse(BaseModel):
    """History query response"""
    items: List[HistoryItem]
    total: int
    has_more: bool = False

# ============================================================================
# WebSocket Models
# ============================================================================

class WSMessageType(BaseModel):
    """WebSocket message type"""
    kind: Literal["snapshot", "event", "ping", "error"]

class WSSnapshotMessage(BaseModel):
    """WebSocket snapshot message"""
    kind: Literal["snapshot"] = "snapshot"
    data: LivingMapSnapshot

class WSEventMessage(BaseModel):
    """WebSocket event message"""
    kind: Literal["event"] = "event"
    event_type: str
    timestamp: datetime
    payload: Dict[str, Any]

class WSPingMessage(BaseModel):
    """WebSocket ping message"""
    kind: Literal["ping"] = "ping"
    timestamp: datetime

class WSErrorMessage(BaseModel):
    """WebSocket error message"""
    kind: Literal["error"] = "error"
    error: str
    timestamp: datetime

# ============================================================================
# Query Parameters
# ============================================================================

class HistoryQueryParams(BaseModel):
    """Query parameters for history endpoint"""
    since: Optional[datetime] = None
    until: Optional[datetime] = None
    event_type: Optional[str] = None
    entity_id: Optional[str] = None
    limit: int = Field(default=200, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)

class EntitiesQueryParams(BaseModel):
    """Query parameters for entities endpoint"""
    type: Optional[EntityType] = None
    layer: Optional[LayerType] = None
    status: Optional[EntityStatus] = None
    limit: int = Field(default=100, ge=1, le=500)
    offset: int = Field(default=0, ge=0)

