"""
City Backend API Routes
"""

from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Optional
import logging

from models_city import (
    CityRoomRead,
    CityRoomCreate,
    CityRoomDetail,
    CityRoomMessageRead,
    CityRoomMessageCreate,
    CityFeedEventRead
)
import repo_city
from common.redis_client import PresenceRedis, get_redis
from matrix_client import create_matrix_room, find_matrix_room_by_alias

logger = logging.getLogger(__name__)

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

