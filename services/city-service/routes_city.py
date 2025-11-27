"""
City Backend API Routes
"""

from fastapi import APIRouter, HTTPException, Depends, Body, Header, Query
from typing import List, Optional
import logging
import httpx
import os

from models_city import (
    CityRoomRead,
    CityRoomCreate,
    CityRoomDetail,
    CityRoomMessageRead,
    CityRoomMessageCreate,
    CityFeedEventRead,
    CityMapRoom,
    CityMapConfig,
    CityMapResponse,
    AgentRead,
    AgentPresence
)
import repo_city
from common.redis_client import PresenceRedis, get_redis
from matrix_client import create_matrix_room, find_matrix_room_by_alias

logger = logging.getLogger(__name__)

# JWT validation (simplified for MVP)
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://daarion-auth:7020")
MATRIX_GATEWAY_URL = os.getenv("MATRIX_GATEWAY_URL", "http://daarion-matrix-gateway:7025")

router = APIRouter(prefix="/city", tags=["city"])


# =============================================================================
# City Rooms API
# =============================================================================

@router.get("/rooms", response_model=List[CityRoomRead])
async def get_city_rooms(limit: int = 100, offset: int = 0):
    """
    Отримати список всіх City Rooms
    """
    try:
        rooms = await repo_city.get_all_rooms(limit=limit, offset=offset)
        
        # Додати online count (приблизно)
        online_count = await PresenceRedis.get_online_count()
        
        result = []
        for room in rooms:
            result.append({
                **room,
                "members_online": online_count if room.get("is_default") else max(1, online_count // 2),
                "last_event": None  # TODO: з останнього повідомлення
            })
        
        return result
    except Exception as e:
        logger.error(f"Failed to get city rooms: {e}")
        raise HTTPException(status_code=500, detail="Failed to get city rooms")


@router.post("/rooms", response_model=CityRoomRead)
async def create_city_room(payload: CityRoomCreate):
    """
    Створити нову City Room (автоматично створює Matrix room)
    """
    try:
        # TODO: витягнути user_id з JWT
        created_by = "u_system"  # Mock для MVP
        
        # Перевірити чи не існує вже
        existing = await repo_city.get_room_by_slug(payload.slug)
        if existing:
            raise HTTPException(status_code=409, detail="Room with this slug already exists")
        
        # Створити Matrix room
        matrix_room_id, matrix_room_alias = await create_matrix_room(
            slug=payload.slug,
            name=payload.name,
            visibility="public"
        )
        
        if not matrix_room_id:
            logger.warning(f"Failed to create Matrix room for {payload.slug}, proceeding without Matrix")
        
        room = await repo_city.create_room(
            slug=payload.slug,
            name=payload.name,
            description=payload.description,
            created_by=created_by,
            matrix_room_id=matrix_room_id,
            matrix_room_alias=matrix_room_alias
        )
        
        # Додати початкове повідомлення
        await repo_city.create_room_message(
            room_id=room["id"],
            body=f"Кімната '{payload.name}' створена! Ласкаво просимо! 🎉",
            author_agent_id="ag_system"
        )
        
        # Додати в feed
        await repo_city.create_feed_event(
            kind="system",
            room_id=room["id"],
            payload={"action": "room_created", "room_name": payload.name, "matrix_room_id": matrix_room_id}
        )
        
        return {**room, "members_online": 1, "last_event": None}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create city room: {e}")
        raise HTTPException(status_code=500, detail="Failed to create city room")


@router.get("/rooms/{room_id}", response_model=CityRoomDetail)
async def get_city_room(room_id: str):
    """
    Отримати деталі City Room з повідомленнями
    """
    try:
        room = await repo_city.get_room_by_id(room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        
        messages = await repo_city.get_room_messages(room_id, limit=50)
        
        # Додати username до повідомлень
        for msg in messages:
            if msg.get("author_user_id"):
                msg["username"] = f"User-{msg['author_user_id'][-4:]}"  # Mock
            elif msg.get("author_agent_id"):
                msg["username"] = "System Agent"
            else:
                msg["username"] = "Anonymous"
        
        online_users = await PresenceRedis.get_all_online()
        
        return {
            **room,
            "members_online": len(online_users),
            "last_event": None,
            "messages": messages,
            "online_members": online_users[:20]  # Перші 20
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get city room: {e}")
        raise HTTPException(status_code=500, detail="Failed to get city room")


@router.post("/rooms/{room_id}/messages", response_model=CityRoomMessageRead)
async def send_city_room_message(room_id: str, payload: CityRoomMessageCreate):
    """
    Надіслати повідомлення в City Room
    """
    try:
        # Перевірити чи кімната існує
        room = await repo_city.get_room_by_id(room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        
        # TODO: витягнути user_id з JWT
        author_user_id = "u_mock_user"  # Mock для MVP
        
        # Створити повідомлення
        message = await repo_city.create_room_message(
            room_id=room_id,
            body=payload.body,
            author_user_id=author_user_id
        )
        
        # Додати в feed
        await repo_city.create_feed_event(
            kind="room_message",
            room_id=room_id,
            user_id=author_user_id,
            payload={"body": payload.body[:100], "message_id": message["id"]}
        )
        
        # TODO: Broadcast WS event
        # await ws_manager.broadcast_to_room(room_id, {
        #     "event": "room.message",
        #     "message": message
        # })
        
        # Додати username
        message["username"] = f"User-{author_user_id[-4:]}"
        
        return message
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send room message: {e}")
        raise HTTPException(status_code=500, detail="Failed to send message")


@router.post("/rooms/{room_id}/join")
async def join_city_room(room_id: str):
    """
    Приєднатися до City Room (для tracking)
    """
    # TODO: витягнути user_id з JWT
    user_id = "u_mock_user"
    
    # Для MVP просто повертаємо success
    # У production можна зберігати active memberships в Redis
    
    logger.info(f"User {user_id} joined room {room_id}")
    return {"status": "joined", "room_id": room_id}


@router.post("/rooms/{room_id}/leave")
async def leave_city_room(room_id: str):
    """
    Покинути City Room
    """
    # TODO: витягнути user_id з JWT
    user_id = "u_mock_user"
    
    logger.info(f"User {user_id} left room {room_id}")
    return {"status": "left", "room_id": room_id}


# =============================================================================
# Matrix Backfill API (Internal)
# =============================================================================

@router.post("/matrix/backfill")
async def backfill_matrix_rooms():
    """
    Backfill Matrix rooms for existing City Rooms that don't have Matrix integration.
    This is an internal endpoint for admin use.
    """
    try:
        rooms_without_matrix = await repo_city.get_rooms_without_matrix()
        
        results = {
            "processed": 0,
            "created": 0,
            "found": 0,
            "failed": 0,
            "details": []
        }
        
        for room in rooms_without_matrix:
            results["processed"] += 1
            slug = room["slug"]
            name = room["name"]
            room_id = room["id"]
            
            # Спочатку спробувати знайти існуючу Matrix room
            alias = f"#city_{slug}:daarion.space"
            matrix_room_id, matrix_room_alias = await find_matrix_room_by_alias(alias)
            
            if matrix_room_id:
                # Знайдено існуючу
                await repo_city.update_room_matrix(room_id, matrix_room_id, matrix_room_alias)
                results["found"] += 1
                results["details"].append({
                    "room_id": room_id,
                    "slug": slug,
                    "status": "found",
                    "matrix_room_id": matrix_room_id
                })
            else:
                # Створити нову
                matrix_room_id, matrix_room_alias = await create_matrix_room(slug, name, "public")
                
                if matrix_room_id:
                    await repo_city.update_room_matrix(room_id, matrix_room_id, matrix_room_alias)
                    results["created"] += 1
                    results["details"].append({
                        "room_id": room_id,
                        "slug": slug,
                        "status": "created",
                        "matrix_room_id": matrix_room_id
                    })
                else:
                    results["failed"] += 1
                    results["details"].append({
                        "room_id": room_id,
                        "slug": slug,
                        "status": "failed",
                        "error": "Could not create Matrix room"
                    })
        
        logger.info(f"Matrix backfill completed: {results['processed']} processed, "
                   f"{results['created']} created, {results['found']} found, {results['failed']} failed")
        
        return results
    
    except Exception as e:
        logger.error(f"Matrix backfill failed: {e}")
        raise HTTPException(status_code=500, detail=f"Backfill failed: {str(e)}")


# =============================================================================
# Chat Bootstrap API (Matrix Integration)
# =============================================================================

async def validate_jwt_token(authorization: str) -> Optional[dict]:
    """Validate JWT token via auth-service introspect endpoint."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    token = authorization.replace("Bearer ", "")
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(
                f"{AUTH_SERVICE_URL}/api/auth/introspect",
                json={"token": token}
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("active"):
                    return {"user_id": data.get("sub"), "email": data.get("email"), "roles": data.get("roles", [])}
            return None
        except Exception as e:
            logger.error(f"JWT validation error: {e}")
            return None


@router.get("/chat/bootstrap")
async def chat_bootstrap(
    room_slug: str = Query(..., description="City room slug"),
    authorization: Optional[str] = Header(None)
):
    """
    Bootstrap Matrix chat for a city room.
    
    Returns Matrix credentials and room info for the authenticated user.
    """
    # Validate JWT
    user_info = await validate_jwt_token(authorization)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid or missing authorization token")
    
    user_id = user_info.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token: missing user_id")
    
    # Get room by slug
    room = await repo_city.get_room_by_slug(room_slug)
    if not room:
        raise HTTPException(status_code=404, detail=f"Room '{room_slug}' not found")
    
    # Check if room has Matrix integration
    matrix_room_id = room.get("matrix_room_id")
    matrix_room_alias = room.get("matrix_room_alias")
    
    if not matrix_room_id:
        raise HTTPException(
            status_code=400, 
            detail="Room does not have Matrix integration. Run /city/matrix/backfill first."
        )
    
    # Get Matrix user token from matrix-gateway
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            token_resp = await client.post(
                f"{MATRIX_GATEWAY_URL}/internal/matrix/users/token",
                json={"user_id": user_id}
            )
            
            if token_resp.status_code != 200:
                error = token_resp.json()
                logger.error(f"Failed to get Matrix token: {error}")
                raise HTTPException(status_code=500, detail="Failed to get Matrix credentials")
            
            matrix_creds = token_resp.json()
            
        except httpx.RequestError as e:
            logger.error(f"Matrix gateway request error: {e}")
            raise HTTPException(status_code=503, detail="Matrix service unavailable")
    
    # Return bootstrap data
    return {
        "matrix_hs_url": f"https://app.daarion.space",  # Through nginx proxy
        "matrix_user_id": matrix_creds["matrix_user_id"],
        "matrix_access_token": matrix_creds["access_token"],
        "matrix_device_id": matrix_creds["device_id"],
        "matrix_room_id": matrix_room_id,
        "matrix_room_alias": matrix_room_alias,
        "room": {
            "id": room["id"],
            "slug": room["slug"],
            "name": room["name"],
            "description": room.get("description")
        }
    }


# =============================================================================
# City Feed API
# =============================================================================

@router.get("/feed", response_model=List[CityFeedEventRead])
async def get_city_feed(limit: int = 20, offset: int = 0):
    """
    Отримати City Feed (останні події)
    """
    try:
        events = await repo_city.get_feed_events(limit=limit, offset=offset)
        return events
    except Exception as e:
        logger.error(f"Failed to get city feed: {e}")
        raise HTTPException(status_code=500, detail="Failed to get city feed")


# =============================================================================
# City Map API (2D Map)
# =============================================================================

@router.get("/map", response_model=CityMapResponse)
async def get_city_map():
    """
    Отримати дані для 2D мапи міста.
    
    Повертає:
    - config: розміри сітки та налаштування
    - rooms: список кімнат з координатами
    """
    try:
        # Отримати конфігурацію
        config_data = await repo_city.get_map_config()
        config = CityMapConfig(
            grid_width=config_data.get("grid_width", 6),
            grid_height=config_data.get("grid_height", 3),
            cell_size=config_data.get("cell_size", 100),
            background_url=config_data.get("background_url")
        )
        
        # Отримати кімнати з координатами
        rooms_data = await repo_city.get_rooms_for_map()
        rooms = []
        
        for room in rooms_data:
            rooms.append(CityMapRoom(
                id=room["id"],
                slug=room["slug"],
                name=room["name"],
                description=room.get("description"),
                room_type=room.get("room_type", "public"),
                zone=room.get("zone", "central"),
                icon=room.get("icon"),
                color=room.get("color"),
                x=room.get("map_x", 0),
                y=room.get("map_y", 0),
                w=room.get("map_w", 1),
                h=room.get("map_h", 1),
                matrix_room_id=room.get("matrix_room_id")
            ))
        
        return CityMapResponse(config=config, rooms=rooms)
    
    except Exception as e:
        logger.error(f"Failed to get city map: {e}")
        raise HTTPException(status_code=500, detail="Failed to get city map")


# =============================================================================
# Agents API
# =============================================================================

@router.get("/agents", response_model=List[AgentRead])
async def get_agents():
    """
    Отримати список всіх агентів
    """
    try:
        agents = await repo_city.get_all_agents()
        result = []
        
        for agent in agents:
            capabilities = agent.get("capabilities", [])
            if isinstance(capabilities, str):
                import json
                capabilities = json.loads(capabilities)
            
            result.append(AgentRead(
                id=agent["id"],
                display_name=agent["display_name"],
                kind=agent.get("kind", "assistant"),
                avatar_url=agent.get("avatar_url"),
                color=agent.get("color", "cyan"),
                status=agent.get("status", "offline"),
                current_room_id=agent.get("current_room_id"),
                capabilities=capabilities
            ))
        
        return result
    
    except Exception as e:
        logger.error(f"Failed to get agents: {e}")
        raise HTTPException(status_code=500, detail="Failed to get agents")


@router.get("/agents/online", response_model=List[AgentPresence])
async def get_online_agents():
    """
    Отримати список онлайн агентів (для presence)
    """
    try:
        agents = await repo_city.get_online_agents()
        result = []
        
        for agent in agents:
            result.append(AgentPresence(
                agent_id=agent["id"],
                display_name=agent["display_name"],
                kind=agent.get("kind", "assistant"),
                status=agent.get("status", "offline"),
                room_id=agent.get("current_room_id"),
                color=agent.get("color", "cyan")
            ))
        
        return result
    
    except Exception as e:
        logger.error(f"Failed to get online agents: {e}")
        raise HTTPException(status_code=500, detail="Failed to get online agents")


@router.get("/rooms/{room_id}/agents", response_model=List[AgentPresence])
async def get_room_agents(room_id: str):
    """
    Отримати агентів у конкретній кімнаті
    """
    try:
        agents = await repo_city.get_agents_by_room(room_id)
        result = []
        
        for agent in agents:
            result.append(AgentPresence(
                agent_id=agent["id"],
                display_name=agent["display_name"],
                kind=agent.get("kind", "assistant"),
                status=agent.get("status", "offline"),
                room_id=room_id,
                color=agent.get("color", "cyan")
            ))
        
        return result
    
    except Exception as e:
        logger.error(f"Failed to get room agents: {e}")
        raise HTTPException(status_code=500, detail="Failed to get room agents")

