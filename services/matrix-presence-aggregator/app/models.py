"""Data models for Presence Aggregator"""
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class AgentPresence(BaseModel):
    """Agent presence in a room"""
    agent_id: str
    display_name: str
    kind: str = "assistant"  # assistant, civic, oracle, builder
    status: str = "offline"  # online, offline, busy
    room_id: Optional[str] = None
    color: Optional[str] = None


class RoomPresence(BaseModel):
    room_id: str          # internal room id from DB
    matrix_room_id: str   # Matrix room ID (!xxx:domain)
    online: int
    typing: int
    agents: List[AgentPresence] = []  # Agents present in this room


class CityPresence(BaseModel):
    online_total: int
    rooms_online: int
    agents_online: int = 0


class PresenceSnapshot(BaseModel):
    type: str = "presence_update"
    timestamp: datetime
    city: CityPresence
    rooms: List[RoomPresence]
    agents: List[AgentPresence] = []  # All online agents


