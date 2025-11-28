"""
Pydantic Models для City Backend
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# =============================================================================
# City Rooms
# =============================================================================

class CityRoomBase(BaseModel):
    slug: str
    name: str
    description: Optional[str] = None


class CityRoomCreate(CityRoomBase):
    pass


class CityRoomRead(CityRoomBase):
    id: str
    is_default: bool
    created_at: datetime
    created_by: Optional[str] = None
    members_online: int = 0
    last_event: Optional[str] = None
    # Matrix integration
    matrix_room_id: Optional[str] = None
    matrix_room_alias: Optional[str] = None


# =============================================================================
# City Room Messages
# =============================================================================

class CityRoomMessageBase(BaseModel):
    body: str = Field(..., min_length=1, max_length=10000)


class CityRoomMessageCreate(CityRoomMessageBase):
    pass


class CityRoomMessageRead(CityRoomMessageBase):
    id: str
    room_id: str
    author_user_id: Optional[str] = None
    author_agent_id: Optional[str] = None
    username: Optional[str] = "Anonymous"  # Для frontend
    created_at: datetime


# =============================================================================
# City Room Detail (з повідомленнями)
# =============================================================================

class CityRoomDetail(CityRoomRead):
    messages: List[CityRoomMessageRead] = []
    online_members: List[str] = []  # user_ids


# =============================================================================
# City Feed Events
# =============================================================================

class CityFeedEventRead(BaseModel):
    id: str
    kind: str  # 'room_message', 'agent_reply', 'system', 'dao_event'
    room_id: Optional[str] = None
    user_id: Optional[str] = None
    agent_id: Optional[str] = None
    payload: dict
    created_at: datetime


# =============================================================================
# Presence
# =============================================================================

class PresenceUpdate(BaseModel):
    user_id: str
    status: str  # 'online', 'offline', 'away'
    last_seen: Optional[datetime] = None


class PresenceBulkUpdate(BaseModel):
    users: List[PresenceUpdate]


# =============================================================================
# WebSocket Messages
# =============================================================================

class WSRoomMessage(BaseModel):
    event: str  # 'room.message', 'room.join', 'room.leave'
    room_id: Optional[str] = None
    user_id: Optional[str] = None
    message: Optional[CityRoomMessageRead] = None


class WSPresenceMessage(BaseModel):
    event: str  # 'presence.heartbeat', 'presence.update'
    user_id: str
    status: Optional[str] = None


# =============================================================================
# City Map (2D Map)
# =============================================================================

class CityMapRoom(BaseModel):
    """Room representation on 2D city map"""
    id: str
    slug: str
    name: str
    description: Optional[str] = None
    room_type: str = "public"
    zone: str = "central"
    icon: Optional[str] = None
    color: Optional[str] = None
    # Map coordinates
    x: int = 0
    y: int = 0
    w: int = 1
    h: int = 1
    # Matrix integration
    matrix_room_id: Optional[str] = None


class CityMapConfig(BaseModel):
    """Global city map configuration"""
    grid_width: int = 6
    grid_height: int = 3
    cell_size: int = 100
    background_url: Optional[str] = None


class CityMapResponse(BaseModel):
    """Full city map response"""
    config: CityMapConfig
    rooms: List[CityMapRoom]


# =============================================================================
# Agents (for Agent Presence)
# =============================================================================

class AgentRead(BaseModel):
    """Agent representation"""
    id: str
    display_name: str
    kind: str = "assistant"  # assistant, civic, oracle, builder
    avatar_url: Optional[str] = None
    color: str = "cyan"
    status: str = "offline"  # online, offline, busy
    current_room_id: Optional[str] = None
    capabilities: List[str] = []


class AgentSummary(BaseModel):
    """Agent summary for Agent Console"""
    id: str
    display_name: str
    kind: str = "assistant"
    avatar_url: Optional[str] = None
    status: str = "offline"
    is_public: bool = False
    public_slug: Optional[str] = None
    public_title: Optional[str] = None
    district: Optional[str] = None
    home_node: Optional[HomeNodeView] = None
    microdao_memberships: List[Dict[str, Any]] = []


class AgentPresence(BaseModel):
    """Agent presence in a room"""
    agent_id: str
    display_name: str
    kind: str
    status: str
    room_id: Optional[str] = None
    color: Optional[str] = None
    node_id: Optional[str] = None
    district: Optional[str] = None
    model: Optional[str] = None
    role: Optional[str] = None
    avatar_url: Optional[str] = None


# =============================================================================
# Citizens
# =============================================================================

class CityPresenceRoomView(BaseModel):
    room_id: Optional[str] = None
    slug: Optional[str] = None
    name: Optional[str] = None


class CityPresenceView(BaseModel):
    primary_room_slug: Optional[str] = None
    rooms: List[CityPresenceRoomView] = []


class HomeNodeView(BaseModel):
    """Home node information for agent/citizen"""
    id: Optional[str] = None
    name: Optional[str] = None
    hostname: Optional[str] = None
    roles: List[str] = []
    environment: Optional[str] = None


class PublicCitizenSummary(BaseModel):
    slug: str
    display_name: str
    public_title: Optional[str] = None
    public_tagline: Optional[str] = None
    avatar_url: Optional[str] = None
    kind: Optional[str] = None
    district: Optional[str] = None
    primary_room_slug: Optional[str] = None
    public_skills: List[str] = []
    online_status: Optional[str] = "unknown"
    status: Optional[str] = None  # backward compatibility
    # Home node info
    home_node: Optional[HomeNodeView] = None


class PublicCitizenProfile(BaseModel):
    slug: str
    display_name: str
    kind: Optional[str] = None
    public_title: Optional[str] = None
    public_tagline: Optional[str] = None
    district: Optional[str] = None
    avatar_url: Optional[str] = None
    status: Optional[str] = None
    node_id: Optional[str] = None
    public_skills: List[str] = []
    city_presence: Optional[CityPresenceView] = None
    dais_public: Dict[str, Any]
    interaction: Dict[str, Any]
    metrics_public: Dict[str, Any]
    admin_panel_url: Optional[str] = None
    microdao: Optional[Dict[str, Any]] = None
    # Home node info
    home_node: Optional[HomeNodeView] = None


class CitizenInteractionInfo(BaseModel):
    slug: str
    display_name: str
    primary_room_slug: Optional[str] = None
    primary_room_id: Optional[str] = None
    primary_room_name: Optional[str] = None
    matrix_user_id: Optional[str] = None
    district: Optional[str] = None
    microdao_slug: Optional[str] = None
    microdao_name: Optional[str] = None


class CitizenAskRequest(BaseModel):
    question: str
    context: Optional[str] = None


class CitizenAskResponse(BaseModel):
    answer: str
    agent_display_name: str
    agent_id: str


# =============================================================================
# MicroDAO
# =============================================================================

class MicrodaoCitizenView(BaseModel):
    slug: str
    display_name: str
    public_title: Optional[str] = None
    public_tagline: Optional[str] = None
    avatar_url: Optional[str] = None
    district: Optional[str] = None
    primary_room_slug: Optional[str] = None


class MicrodaoSummary(BaseModel):
    """MicroDAO summary for list view"""
    id: str
    slug: str
    name: str
    description: Optional[str] = None
    district: Optional[str] = None
    orchestrator_agent_id: Optional[str] = None
    is_active: bool
    logo_url: Optional[str] = None
    agents_count: int
    rooms_count: int
    channels_count: int


class MicrodaoChannelView(BaseModel):
    """Channel/integration view for MicroDAO"""
    kind: str           # 'matrix' | 'telegram' | 'city_room' | 'crew'
    ref_id: str
    display_name: Optional[str] = None
    is_primary: bool


class MicrodaoAgentView(BaseModel):
    """Agent view within MicroDAO"""
    agent_id: str
    display_name: str
    role: Optional[str] = None
    is_core: bool


class MicrodaoDetail(BaseModel):
    """Full MicroDAO detail view"""
    id: str
    slug: str
    name: str
    description: Optional[str] = None
    district: Optional[str] = None
    orchestrator_agent_id: Optional[str] = None
    orchestrator_display_name: Optional[str] = None
    is_active: bool
    is_public: bool
    logo_url: Optional[str] = None
    agents: List[MicrodaoAgentView]
    channels: List[MicrodaoChannelView]
    public_citizens: List[MicrodaoCitizenView] = []


class AgentMicrodaoMembership(BaseModel):
    microdao_id: str
    microdao_slug: str
    microdao_name: str
    role: Optional[str] = None
    is_core: bool = False


class MicrodaoOption(BaseModel):
    id: str
    slug: str
    name: str
    district: Optional[str] = None
    is_active: bool = True

