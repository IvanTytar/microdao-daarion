"""
Matrix Presence Aggregator Service

Aggregates Matrix presence/typing events and publishes to NATS
for real-time city presence in DAARION.
"""
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict

import httpx
from fastapi import FastAPI

from config import (
    CITY_SERVICE_URL,
    INTERNAL_API_KEY,
    ROOM_PRESENCE_THROTTLE_MS,
    ROOM_MAPPING_REFRESH_INTERVAL_S
)
from models import PresenceState
from matrix_sync import MatrixSyncClient, get_room_members, join_room
from nats_publisher import PresencePublisher

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global state
state = PresenceState()
publisher = PresencePublisher()
sync_client: MatrixSyncClient = None


async def fetch_room_mappings() -> Dict[str, str]:
    """Fetch room_id -> slug mappings from city-service"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(
                f"{CITY_SERVICE_URL}/api/city/rooms",
                headers={"X-Internal-API-Key": INTERNAL_API_KEY}
            )
            response.raise_for_status()
            rooms = response.json()
            
            mappings = {}
            for room in rooms:
                matrix_room_id = room.get("matrix_room_id")
                slug = room.get("slug")
                if matrix_room_id and slug:
                    mappings[matrix_room_id] = slug
            
            logger.info(f"Fetched {len(mappings)} room mappings from city-service")
            return mappings
        except Exception as e:
            logger.error(f"Failed to fetch room mappings: {e}")
            return {}


async def refresh_room_mappings_loop():
    """Periodically refresh room mappings"""
    while True:
        try:
            mappings = await fetch_room_mappings()
            if mappings:
                state.set_room_mapping(mappings)
                
                # Join all mapped rooms
                for room_id in mappings.keys():
                    await join_room(room_id)
                    # Fetch initial members
                    members = await get_room_members(room_id)
                    for user_id in members:
                        state.add_room_member(room_id, user_id)
        except Exception as e:
            logger.error(f"Error refreshing room mappings: {e}")
        
        await asyncio.sleep(ROOM_MAPPING_REFRESH_INTERVAL_S)


async def on_presence(user_id: str, status: str):
    """Handle presence update from Matrix"""
    affected_slugs = state.update_user_presence(user_id, status)
    
    # Publish updates for affected rooms
    for slug in affected_slugs:
        room_id = state.slug_to_room_id.get(slug)
        if room_id:
            room = state.get_room_presence(room_id)
            if room and state.should_publish(room_id, ROOM_PRESENCE_THROTTLE_MS):
                await publisher.publish_room_presence(room)


async def on_typing(room_id: str, typing_user_ids: list):
    """Handle typing update from Matrix"""
    slug = state.update_room_typing(room_id, typing_user_ids)
    
    if slug:
        room = state.get_room_presence(room_id)
        if room and state.should_publish(room_id, ROOM_PRESENCE_THROTTLE_MS):
            await publisher.publish_room_presence(room)


async def on_room_member(room_id: str, user_id: str, membership: str):
    """Handle membership change from Matrix"""
    if membership == "join":
        state.add_room_member(room_id, user_id)
    else:
        state.remove_room_member(room_id, user_id)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    global sync_client
    
    # Startup
    logger.info("Starting Matrix Presence Aggregator")
    
    # Connect to NATS
    await publisher.connect()
    
    # Initial room mapping fetch
    mappings = await fetch_room_mappings()
    if mappings:
        state.set_room_mapping(mappings)
        # Join all rooms and get initial members
        for room_id in mappings.keys():
            await join_room(room_id)
            members = await get_room_members(room_id)
            for user_id in members:
                state.add_room_member(room_id, user_id)
    
    # Start sync client
    sync_client = MatrixSyncClient(
        on_presence=on_presence,
        on_typing=on_typing,
        on_room_member=on_room_member
    )
    
    # Start background tasks
    asyncio.create_task(sync_client.start())
    asyncio.create_task(refresh_room_mappings_loop())
    
    logger.info("Matrix Presence Aggregator started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Matrix Presence Aggregator")
    if sync_client:
        await sync_client.stop()
    await publisher.disconnect()


app = FastAPI(
    title="Matrix Presence Aggregator",
    description="Aggregates Matrix presence events for DAARION city",
    version="1.0.0",
    lifespan=lifespan
)


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "matrix-presence-aggregator",
        "nats_connected": publisher.is_connected,
        "rooms_tracked": len(state.rooms),
        "users_tracked": len(state.users)
    }


@app.get("/status")
async def status():
    """Detailed status endpoint"""
    rooms = []
    for room in state.get_all_room_presences():
        rooms.append({
            "slug": room.city_room_slug,
            "room_id": room.room_id,
            "online_count": room.online_count,
            "typing_count": len(room.typing_user_ids)
        })
    
    return {
        "nats_connected": publisher.is_connected,
        "sync_running": sync_client.is_running if sync_client else False,
        "rooms": rooms,
        "total_users_tracked": len(state.users)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7026)

