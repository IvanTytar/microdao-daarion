"""NATS publisher for presence events"""
import asyncio
import json
import logging
from typing import Optional
import nats
from nats.aio.client import Client as NATS

from config import NATS_URL
from models import RoomPresence

logger = logging.getLogger(__name__)


class PresencePublisher:
    """Publishes presence events to NATS"""
    
    def __init__(self):
        self.nc: Optional[NATS] = None
        self.is_connected = False
    
    async def connect(self):
        """Connect to NATS"""
        try:
            self.nc = await nats.connect(NATS_URL)
            self.is_connected = True
            logger.info(f"Connected to NATS at {NATS_URL}")
        except Exception as e:
            logger.error(f"Failed to connect to NATS: {e}")
            self.is_connected = False
    
    async def disconnect(self):
        """Disconnect from NATS"""
        if self.nc:
            await self.nc.drain()
            self.is_connected = False
            logger.info("Disconnected from NATS")
    
    async def publish_room_presence(self, room: RoomPresence):
        """Publish room presence event"""
        if not self.is_connected or not self.nc:
            logger.warning("Not connected to NATS, skipping publish")
            return
        
        if not room.city_room_slug:
            logger.debug(f"Room {room.room_id} has no slug, skipping")
            return
        
        subject = f"city.presence.room.{room.city_room_slug}"
        payload = {
            "type": "room.presence",
            "room_slug": room.city_room_slug,
            "matrix_room_id": room.room_id,
            "matrix_room_alias": room.alias,
            "online_count": room.online_count,
            "typing_count": len(room.typing_user_ids),
            "typing_users": room.typing_user_ids,
            "last_event_ts": int(room.last_event_ts * 1000)
        }
        
        try:
            await self.nc.publish(subject, json.dumps(payload).encode())
            logger.debug(f"Published to {subject}: online={room.online_count}, typing={len(room.typing_user_ids)}")
        except Exception as e:
            logger.error(f"Failed to publish to NATS: {e}")
    
    async def publish_user_presence(self, user_id: str, status: str, last_active_ts: float):
        """Publish user presence event"""
        if not self.is_connected or not self.nc:
            return
        
        # Extract localpart from @user:domain
        localpart = user_id.split(":")[0].lstrip("@")
        subject = f"city.presence.user.{localpart}"
        payload = {
            "type": "user.presence",
            "matrix_user_id": user_id,
            "status": status,
            "last_active_ts": int(last_active_ts * 1000)
        }
        
        try:
            await self.nc.publish(subject, json.dumps(payload).encode())
            logger.debug(f"Published user presence: {user_id} -> {status}")
        except Exception as e:
            logger.error(f"Failed to publish user presence: {e}")

