"""Data models for Presence Aggregator"""
from pydantic import BaseModel
from typing import List
from datetime import datetime


class RoomPresence(BaseModel):
    room_id: str          # internal room id from DB
    matrix_room_id: str   # Matrix room ID (!xxx:domain)
    online: int
    typing: int


class CityPresence(BaseModel):
    online_total: int
    rooms_online: int


class PresenceSnapshot(BaseModel):
    type: str = "presence_update"
    timestamp: datetime
    city: CityPresence
    rooms: List[RoomPresence]

