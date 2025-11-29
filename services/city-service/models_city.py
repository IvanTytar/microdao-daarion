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


class NodeAgentSummary(BaseModel):
    """Summary of a node agent (Guardian or Steward)"""
    id: str
    name: str
    kind: Optional[str] = None
    slug: Optional[str] = None


class NodeMicrodaoSummary(BaseModel):
    """Summary of a MicroDAO hosted on a node (via orchestrator)"""
    id: str
    slug: str
    name: str
    rooms_count: int = 0


class NodeProfile(BaseModel):
    """Node profile for Node Directory"""
    node_id: str
    name: str
    hostname: Optional[str] = None
    roles: List[str] = []
    environment: str = "unknown"
    status: str = "offline"
    gpu_info: Optional[str] = None
    agents_total: int = 0
    agents_online: int = 0
    last_heartbeat: Optional[str] = None
    guardian_agent_id: Optional[str] = None
    steward_agent_id: Optional[str] = None
    guardian_agent: Optional[NodeAgentSummary] = None
    steward_agent: Optional[NodeAgentSummary] = None
    microdaos: List[NodeMicrodaoSummary] = []


class ModelBindings(BaseModel):
    """Agent model bindings for AI capabilities"""
    primary_model: Optional[str] = None  # e.g., "qwen3:8b"
    supported_kinds: List[str] = []  # e.g., ["text", "vision", "audio"]


class UsageStats(BaseModel):
    """Agent usage statistics"""
    tokens_total_24h: Optional[int] = None
    calls_total_24h: Optional[int] = None
    last_active: Optional[str] = None


class MicrodaoBadge(BaseModel):
    """MicroDAO badge for agent display"""
    id: str
    name: str
    slug: Optional[str] = None
    role: Optional[str] = None  # orchestrator, member, etc.
    is_public: bool = True
    is_platform: bool = False


class AgentSummary(BaseModel):
    """Unified Agent summary for Agent Console and Citizens"""
    id: str
    slug: Optional[str] = None
    display_name: str
    title: Optional[str] = None  # public_title
    tagline: Optional[str] = None  # public_tagline
    kind: str = "assistant"
    avatar_url: Optional[str] = None
    status: str = "offline"
    
    # Node info
    node_id: Optional[str] = None
    node_label: Optional[str] = None  # "НОДА1" / "НОДА2"
    home_node: Optional[HomeNodeView] = None
    
    # Visibility & roles
    visibility_scope: str = "city"  # global, microdao, private
    is_listed_in_directory: bool = True
    is_system: bool = False
    is_public: bool = False
    is_orchestrator: bool = False  # Can create/manage microDAOs
    
    # MicroDAO
    primary_microdao_id: Optional[str] = None
    primary_microdao_name: Optional[str] = None
    primary_microdao_slug: Optional[str] = None
    district: Optional[str] = None
    microdaos: List[MicrodaoBadge] = []
    microdao_memberships: List[Dict[str, Any]] = []  # backward compatibility
    
    # Skills
    public_skills: List[str] = []
    
    # Future: model bindings and usage stats
    model_bindings: Optional[ModelBindings] = None
    usage_stats: Optional[UsageStats] = None


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
    node_id: Optional[str] = None

    # TASK 037A: Alignment
    home_microdao_slug: Optional[str] = None
    home_microdao_name: Optional[str] = None
    primary_city_room: Optional["CityRoomSummary"] = None


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
    
    # Visibility & type
    is_public: bool = True
    is_platform: bool = False  # Is a platform/district
    is_active: bool = True
    
    # Orchestrator
    orchestrator_agent_id: Optional[str] = None
    orchestrator_agent_name: Optional[str] = None
    
    # Hierarchy
    parent_microdao_id: Optional[str] = None
    parent_microdao_slug: Optional[str] = None
    
    # Stats
    logo_url: Optional[str] = None
    member_count: int = 0  # alias for agents_count
    agents_count: int = 0  # backward compatibility
    room_count: int = 0  # alias for rooms_count
    rooms_count: int = 0  # backward compatibility
    channels_count: int = 0


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


class CityRoomSummary(BaseModel):
    """Summary of a city room for chat embedding and multi-room support"""
    id: str
    slug: str
    name: str
    matrix_room_id: Optional[str] = None
    microdao_id: Optional[str] = None
    microdao_slug: Optional[str] = None
    room_role: Optional[str] = None  # 'primary', 'lobby', 'team', 'research', 'security', 'governance'
    is_public: bool = True
    sort_order: int = 100


class MicrodaoRoomsList(BaseModel):
    """List of rooms belonging to a MicroDAO"""
    microdao_id: str
    microdao_slug: str
    rooms: List[CityRoomSummary] = []


class MicrodaoRoomUpdate(BaseModel):
    """Update request for MicroDAO room settings"""
    room_role: Optional[str] = None
    is_public: Optional[bool] = None
    sort_order: Optional[int] = None
    set_primary: Optional[bool] = None  # if true, mark as primary


class AttachExistingRoomRequest(BaseModel):
    """Request to attach an existing city room to a MicroDAO"""
    room_id: str
    room_role: Optional[str] = None
    is_public: bool = True
    sort_order: int = 100


class MicrodaoDetail(BaseModel):
    """Full MicroDAO detail view"""
    id: str
    slug: str
    name: str
    description: Optional[str] = None
    district: Optional[str] = None
    
    # Visibility & type
    is_public: bool = True
    is_platform: bool = False
    is_active: bool = True
    
    # Orchestrator
    orchestrator_agent_id: Optional[str] = None
    orchestrator_display_name: Optional[str] = None
    
    # Hierarchy
    parent_microdao_id: Optional[str] = None
    parent_microdao_slug: Optional[str] = None
    child_microdaos: List["MicrodaoSummary"] = []
    
    # Content
    logo_url: Optional[str] = None
    agents: List[MicrodaoAgentView] = []
    channels: List[MicrodaoChannelView] = []
    
    # Multi-room support
    rooms: List[CityRoomSummary] = []
    public_citizens: List[MicrodaoCitizenView] = []
    
    # Primary city room for chat
    primary_city_room: Optional[CityRoomSummary] = None


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


# =============================================================================
# Visibility Updates (Task 029)
# =============================================================================

class AgentVisibilityUpdate(BaseModel):
    """Update agent visibility settings"""
    is_public: bool
    visibility_scope: Optional[str] = None  # 'global' | 'microdao' | 'private'


class MicrodaoVisibilityUpdate(BaseModel):
    """Update MicroDAO visibility settings"""
    is_public: bool
    is_platform: Optional[bool] = None  # Upgrade to platform/district


class MicrodaoCreateRequest(BaseModel):
    """Request to create MicroDAO from agent (orchestrator flow)"""
    name: str
    slug: str
    description: Optional[str] = None
    make_platform: bool = False  # If true -> is_platform = true
    is_public: bool = True
    parent_microdao_id: Optional[str] = None

