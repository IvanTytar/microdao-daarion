"""
Pydantic Models для City Backend
"""

from pydantic import BaseModel, Field
from typing import Optional, List
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

