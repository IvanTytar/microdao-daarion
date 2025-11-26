"""
Matrix Gateway Client for City Service
"""
import os
import httpx
import logging
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

MATRIX_GATEWAY_URL = os.getenv("MATRIX_GATEWAY_URL", "http://daarion-matrix-gateway:7025")


async def create_matrix_room(slug: str, name: str, visibility: str = "public") -> Tuple[Optional[str], Optional[str]]:
    """
    Create a Matrix room via Matrix Gateway.
    
    Returns:
        Tuple of (matrix_room_id, matrix_room_alias) or (None, None) on failure
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{MATRIX_GATEWAY_URL}/internal/matrix/rooms/create",
                json={
                    "slug": slug,
                    "name": name,
                    "visibility": visibility
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"Matrix room created: {data['matrix_room_id']}")
                return data["matrix_room_id"], data["matrix_room_alias"]
            else:
                logger.error(f"Failed to create Matrix room: {response.text}")
                return None, None
                
        except httpx.RequestError as e:
            logger.error(f"Matrix Gateway request error: {e}")
            return None, None
        except Exception as e:
            logger.error(f"Matrix room creation error: {e}")
            return None, None


async def find_matrix_room_by_alias(alias: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Find a Matrix room by alias via Matrix Gateway.
    
    Returns:
        Tuple of (matrix_room_id, matrix_room_alias) or (None, None) if not found
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(
                f"{MATRIX_GATEWAY_URL}/internal/matrix/rooms/find-by-alias",
                params={"alias": alias}
            )
            
            if response.status_code == 200:
                data = response.json()
                return data["matrix_room_id"], data["matrix_room_alias"]
            elif response.status_code == 404:
                return None, None
            else:
                logger.error(f"Failed to find Matrix room: {response.text}")
                return None, None
                
        except httpx.RequestError as e:
            logger.error(f"Matrix Gateway request error: {e}")
            return None, None


async def check_matrix_gateway_health() -> bool:
    """Check if Matrix Gateway is available."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            response = await client.get(f"{MATRIX_GATEWAY_URL}/healthz")
            return response.status_code == 200
        except Exception:
            return False

