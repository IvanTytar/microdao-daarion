"""Matrix sync loop for presence aggregation"""
import asyncio
import logging
import httpx
from typing import Optional, Dict, Any, Callable, Awaitable

from config import (
    MATRIX_HS_URL,
    MATRIX_ACCESS_TOKEN,
    MATRIX_USER_ID,
    SYNC_TIMEOUT_MS
)

logger = logging.getLogger(__name__)


class MatrixSyncClient:
    """Client for Matrix /sync endpoint to get presence and typing events"""
    
    def __init__(
        self,
        on_presence: Callable[[str, str], Awaitable[None]],
        on_typing: Callable[[str, list], Awaitable[None]],
        on_room_member: Callable[[str, str, str], Awaitable[None]],
    ):
        self.base_url = MATRIX_HS_URL
        self.access_token = MATRIX_ACCESS_TOKEN
        self.user_id = MATRIX_USER_ID
        self.since_token: Optional[str] = None
        self.is_running = False
        
        # Callbacks
        self.on_presence = on_presence  # (user_id, status)
        self.on_typing = on_typing  # (room_id, typing_user_ids)
        self.on_room_member = on_room_member  # (room_id, user_id, membership)
        
        # Sync filter
        self.filter = {
            "presence": {
                "types": ["m.presence"]
            },
            "room": {
                "timeline": {"limit": 0},
                "state": {
                    "types": ["m.room.member"],
                    "lazy_load_members": True
                },
                "ephemeral": {
                    "types": ["m.typing"]
                }
            }
        }
    
    async def start(self):
        """Start the sync loop"""
        self.is_running = True
        logger.info(f"Starting Matrix sync loop as {self.user_id}")
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            while self.is_running:
                try:
                    await self._sync_once(client)
                except httpx.TimeoutException:
                    logger.debug("Sync timeout (normal for long-polling)")
                except httpx.HTTPStatusError as e:
                    logger.error(f"HTTP error during sync: {e.response.status_code}")
                    await asyncio.sleep(5)
                except Exception as e:
                    logger.error(f"Sync error: {e}")
                    await asyncio.sleep(5)
    
    async def stop(self):
        """Stop the sync loop"""
        self.is_running = False
        logger.info("Stopping Matrix sync loop")
    
    async def _sync_once(self, client: httpx.AsyncClient):
        """Perform one sync request"""
        import json
        
        params = {
            "timeout": str(SYNC_TIMEOUT_MS),
            "filter": json.dumps(self.filter)
        }
        
        if self.since_token:
            params["since"] = self.since_token
        
        response = await client.get(
            f"{self.base_url}/_matrix/client/v3/sync",
            params=params,
            headers={"Authorization": f"Bearer {self.access_token}"}
        )
        response.raise_for_status()
        data = response.json()
        
        # Update since token
        self.since_token = data.get("next_batch")
        
        # Process presence events
        await self._process_presence(data.get("presence", {}).get("events", []))
        
        # Process room events
        rooms = data.get("rooms", {})
        await self._process_rooms(rooms.get("join", {}))
    
    async def _process_presence(self, events: list):
        """Process m.presence events"""
        for event in events:
            if event.get("type") != "m.presence":
                continue
            
            user_id = event.get("sender")
            content = event.get("content", {})
            status = content.get("presence", "offline")
            
            if user_id:
                logger.debug(f"Presence update: {user_id} -> {status}")
                await self.on_presence(user_id, status)
    
    async def _process_rooms(self, joined_rooms: Dict[str, Any]):
        """Process room events (typing, membership)"""
        for room_id, room_data in joined_rooms.items():
            # Process ephemeral events (typing)
            ephemeral = room_data.get("ephemeral", {}).get("events", [])
            for event in ephemeral:
                if event.get("type") == "m.typing":
                    typing_users = event.get("content", {}).get("user_ids", [])
                    logger.debug(f"Typing in {room_id}: {typing_users}")
                    await self.on_typing(room_id, typing_users)
            
            # Process state events (membership)
            state = room_data.get("state", {}).get("events", [])
            for event in state:
                if event.get("type") == "m.room.member":
                    user_id = event.get("state_key")
                    membership = event.get("content", {}).get("membership", "leave")
                    if user_id:
                        logger.debug(f"Membership: {user_id} in {room_id} -> {membership}")
                        await self.on_room_member(room_id, user_id, membership)


async def get_room_members(room_id: str) -> list:
    """Get current members of a room"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(
                f"{MATRIX_HS_URL}/_matrix/client/v3/rooms/{room_id}/joined_members",
                headers={"Authorization": f"Bearer {MATRIX_ACCESS_TOKEN}"}
            )
            response.raise_for_status()
            data = response.json()
            return list(data.get("joined", {}).keys())
        except Exception as e:
            logger.error(f"Failed to get room members for {room_id}: {e}")
            return []


async def join_room(room_id_or_alias: str) -> Optional[str]:
    """Join a room and return the room_id"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{MATRIX_HS_URL}/_matrix/client/v3/join/{room_id_or_alias}",
                headers={"Authorization": f"Bearer {MATRIX_ACCESS_TOKEN}"},
                json={}
            )
            response.raise_for_status()
            data = response.json()
            return data.get("room_id")
        except Exception as e:
            logger.error(f"Failed to join room {room_id_or_alias}: {e}")
            return None

