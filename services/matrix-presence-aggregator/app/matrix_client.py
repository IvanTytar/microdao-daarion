"""Matrix API client for presence aggregation"""
import httpx
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)


class MatrixClient:
    """Simplified Matrix client for reading members, presence, and typing"""
    
    def __init__(self, base_url: str, access_token: str, daemon_user: str = ""):
        self.base_url = base_url.rstrip("/")
        self.access_token = access_token
        self.daemon_user = daemon_user  # Filter this user from lists
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={"Authorization": f"Bearer {self.access_token}"},
            timeout=30.0
        )

    async def get_room_members(self, room_id: str) -> List[dict]:
        """Get all members of a room"""
        try:
            # Use joined_members for efficiency
            res = await self._client.get(
                f"/_matrix/client/v3/rooms/{room_id}/joined_members"
            )
            res.raise_for_status()
            data = res.json()
            
            # joined_members returns: {"joined": {"@user:domain": {...}}}
            joined = data.get("joined", {})
            members = []
            for user_id, info in joined.items():
                # Filter out presence daemon
                if user_id == self.daemon_user:
                    continue
                members.append({
                    "user_id": user_id,
                    "display_name": info.get("display_name"),
                    "avatar_url": info.get("avatar_url"),
                })
            return members
        except httpx.HTTPError as e:
            logger.error(f"Failed to get room members for {room_id}: {e}")
            return []

    async def get_room_typing(self, room_id: str) -> List[str]:
        """Get list of currently typing users in a room"""
        # Note: Matrix doesn't have a direct API for this
        # Typing info comes from /sync, which we'd need to run continuously
        # For now, return empty - we'll get typing from sync loop later
        return []

    async def get_presence(self, user_id: str) -> str:
        """Get presence status for a user"""
        try:
            res = await self._client.get(
                f"/_matrix/client/v3/presence/{user_id}/status"
            )
            if res.status_code != 200:
                return "offline"
            data = res.json()
            return data.get("presence", "offline")
        except httpx.HTTPError:
            return "offline"

    async def get_presence_batch(self, user_ids: List[str]) -> dict:
        """Get presence for multiple users (with caching)"""
        # For efficiency, we could batch these or use sync
        # For now, simple sequential calls with error handling
        result = {}
        for user_id in user_ids:
            result[user_id] = await self.get_presence(user_id)
        return result

    async def join_room(self, room_id_or_alias: str) -> Optional[str]:
        """Join a room and return the room_id"""
        try:
            res = await self._client.post(
                f"/_matrix/client/v3/join/{room_id_or_alias}",
                json={}
            )
            res.raise_for_status()
            data = res.json()
            return data.get("room_id")
        except httpx.HTTPError as e:
            logger.error(f"Failed to join room {room_id_or_alias}: {e}")
            return None

    async def close(self):
        await self._client.aclose()

