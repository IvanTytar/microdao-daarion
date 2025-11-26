"""Data models for Presence Aggregator"""
from dataclasses import dataclass, field
from typing import Dict, List, Set, Optional
from datetime import datetime
import time


@dataclass
class UserPresence:
    user_id: str  # "@user:domain"
    status: str  # "online" | "offline" | "unavailable"
    last_active_ts: float = field(default_factory=time.time)


@dataclass
class RoomPresence:
    room_id: str  # "!....:daarion.space"
    alias: Optional[str] = None  # "#city_energy:daarion.space"
    city_room_slug: Optional[str] = None  # "energy"
    online_count: int = 0
    typing_user_ids: List[str] = field(default_factory=list)
    last_event_ts: float = field(default_factory=time.time)
    last_published_ts: float = 0  # For throttling


class PresenceState:
    """In-memory state for presence aggregation"""
    
    def __init__(self):
        self.users: Dict[str, UserPresence] = {}
        self.rooms: Dict[str, RoomPresence] = {}
        self.room_members: Dict[str, Set[str]] = {}  # room_id -> set of user_ids
        self.room_id_to_slug: Dict[str, str] = {}  # matrix_room_id -> city_room_slug
        self.slug_to_room_id: Dict[str, str] = {}  # city_room_slug -> matrix_room_id
    
    def update_user_presence(self, user_id: str, status: str) -> List[str]:
        """
        Update user presence and return list of affected room slugs
        """
        prev_status = self.users.get(user_id, UserPresence(user_id, "offline")).status
        self.users[user_id] = UserPresence(user_id, status)
        
        # Find rooms where this user is a member
        affected_slugs = []
        for room_id, members in self.room_members.items():
            if user_id in members:
                slug = self.room_id_to_slug.get(room_id)
                if slug:
                    # Recalculate online count for this room
                    self._recalculate_room_online_count(room_id)
                    affected_slugs.append(slug)
        
        return affected_slugs
    
    def update_room_typing(self, room_id: str, typing_user_ids: List[str]) -> Optional[str]:
        """
        Update typing users for a room and return the slug if changed
        """
        if room_id not in self.rooms:
            slug = self.room_id_to_slug.get(room_id)
            if slug:
                self.rooms[room_id] = RoomPresence(room_id, city_room_slug=slug)
            else:
                return None
        
        room = self.rooms[room_id]
        if room.typing_user_ids != typing_user_ids:
            room.typing_user_ids = typing_user_ids
            room.last_event_ts = time.time()
            return room.city_room_slug
        
        return None
    
    def add_room_member(self, room_id: str, user_id: str):
        """Add a user to a room's member list"""
        if room_id not in self.room_members:
            self.room_members[room_id] = set()
        self.room_members[room_id].add(user_id)
    
    def remove_room_member(self, room_id: str, user_id: str):
        """Remove a user from a room's member list"""
        if room_id in self.room_members:
            self.room_members[room_id].discard(user_id)
    
    def _recalculate_room_online_count(self, room_id: str):
        """Recalculate online count for a room based on member presence"""
        if room_id not in self.rooms:
            slug = self.room_id_to_slug.get(room_id)
            if slug:
                self.rooms[room_id] = RoomPresence(room_id, city_room_slug=slug)
            else:
                return
        
        members = self.room_members.get(room_id, set())
        online_count = 0
        for user_id in members:
            user = self.users.get(user_id)
            if user and user.status in ("online", "unavailable"):
                online_count += 1
        
        self.rooms[room_id].online_count = online_count
        self.rooms[room_id].last_event_ts = time.time()
    
    def get_room_presence(self, room_id: str) -> Optional[RoomPresence]:
        """Get presence info for a room"""
        return self.rooms.get(room_id)
    
    def get_all_room_presences(self) -> List[RoomPresence]:
        """Get presence info for all tracked rooms"""
        return list(self.rooms.values())
    
    def set_room_mapping(self, mappings: Dict[str, str]):
        """Set room_id -> slug mapping"""
        self.room_id_to_slug = mappings
        self.slug_to_room_id = {v: k for k, v in mappings.items()}
        
        # Initialize RoomPresence for all mapped rooms
        for room_id, slug in mappings.items():
            if room_id not in self.rooms:
                self.rooms[room_id] = RoomPresence(room_id, city_room_slug=slug)
            else:
                self.rooms[room_id].city_room_slug = slug
    
    def should_publish(self, room_id: str, throttle_ms: int) -> bool:
        """Check if we should publish an event (throttling)"""
        room = self.rooms.get(room_id)
        if not room:
            return False
        
        now = time.time() * 1000  # ms
        if now - room.last_published_ts >= throttle_ms:
            room.last_published_ts = now
            return True
        return False

