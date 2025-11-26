"""
WebSocket Endpoints для City Backend
Rooms + Presence System
"""

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set, Optional
import json
import asyncio
import logging

from common.redis_client import PresenceRedis

logger = logging.getLogger(__name__)


# =============================================================================
# WebSocket Connection Manager
# =============================================================================

class CityWSManager:
    """Менеджер WebSocket підключень для City"""
    
    def __init__(self):
        # room_id -> set of websockets
        self.room_connections: Dict[str, Set[WebSocket]] = {}
        # presence connections
        self.presence_connections: Set[WebSocket] = set()
    
    async def connect_to_room(self, websocket: WebSocket, room_id: str):
        """Підключити клієнта до кімнати"""
        await websocket.accept()
        
        if room_id not in self.room_connections:
            self.room_connections[room_id] = set()
        
        self.room_connections[room_id].add(websocket)
        logger.info(f"✅ Client connected to room {room_id}. Total: {len(self.room_connections[room_id])}")
    
    def disconnect_from_room(self, websocket: WebSocket, room_id: str):
        """Від'єднати клієнта від кімнати"""
        if room_id in self.room_connections:
            self.room_connections[room_id].discard(websocket)
            
            if len(self.room_connections[room_id]) == 0:
                del self.room_connections[room_id]
            
            logger.info(f"❌ Client disconnected from room {room_id}")
    
    async def broadcast_to_room(self, room_id: str, message: dict):
        """Broadcast повідомлення всім клієнтам кімнати"""
        if room_id not in self.room_connections:
            return
        
        disconnected = set()
        
        for websocket in self.room_connections[room_id]:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send to websocket: {e}")
                disconnected.add(websocket)
        
        # Видалити disconnected
        for ws in disconnected:
            self.room_connections[room_id].discard(ws)
    
    # Presence methods
    
    async def connect_to_presence(self, websocket: WebSocket):
        """Підключити клієнта до Presence System"""
        await websocket.accept()
        self.presence_connections.add(websocket)
        logger.info(f"✅ Client connected to presence. Total: {len(self.presence_connections)}")
    
    def disconnect_from_presence(self, websocket: WebSocket):
        """Від'єднати клієнта від Presence System"""
        self.presence_connections.discard(websocket)
        logger.info(f"❌ Client disconnected from presence")
    
    async def broadcast_presence_update(self, message: dict):
        """Broadcast presence update всім клієнтам"""
        disconnected = set()
        
        for websocket in self.presence_connections:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send presence update: {e}")
                disconnected.add(websocket)
        
        # Видалити disconnected
        for ws in disconnected:
            self.presence_connections.discard(ws)


# Global manager instance
ws_manager = CityWSManager()


# =============================================================================
# WebSocket Endpoints
# =============================================================================

async def websocket_city_room(websocket: WebSocket, room_id: str):
    """
    WebSocket для City Room
    /ws/city/rooms/{room_id}
    """
    await ws_manager.connect_to_room(websocket, room_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                event = message.get("event")
                
                if event == "room.join":
                    # User joined room
                    user_id = message.get("user_id", "anonymous")
                    await ws_manager.broadcast_to_room(room_id, {
                        "event": "room.join",
                        "room_id": room_id,
                        "user_id": user_id
                    })
                
                elif event == "room.leave":
                    # User left room
                    user_id = message.get("user_id", "anonymous")
                    await ws_manager.broadcast_to_room(room_id, {
                        "event": "room.leave",
                        "room_id": room_id,
                        "user_id": user_id
                    })
                
                elif event == "room.message.send":
                    # New message (але краще через HTTP API)
                    logger.info(f"Message via WS (should use HTTP): {message}")
                
                else:
                    logger.warning(f"Unknown event: {event}")
            
            except json.JSONDecodeError:
                logger.error("Invalid JSON from client")
    
    except WebSocketDisconnect:
        ws_manager.disconnect_from_room(websocket, room_id)


async def websocket_city_presence(websocket: WebSocket):
    """
    WebSocket для Presence System
    /ws/city/presence
    """
    await ws_manager.connect_to_presence(websocket)
    
    current_user_id: Optional[str] = None
    
    try:
        while True:
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                event = message.get("event")
                
                if event == "presence.heartbeat":
                    user_id = message.get("user_id")
                    if not user_id:
                        continue
                    
                    current_user_id = user_id
                    
                    # Оновити Redis
                    await PresenceRedis.set_online(user_id)
                    
                    # Broadcast presence update
                    await ws_manager.broadcast_presence_update({
                        "event": "presence.update",
                        "user_id": user_id,
                        "status": "online"
                    })
                    
                    logger.debug(f"Heartbeat from {user_id}")
                
                else:
                    logger.warning(f"Unknown presence event: {event}")
            
            except json.JSONDecodeError:
                logger.error("Invalid JSON from client")
    
    except WebSocketDisconnect:
        ws_manager.disconnect_from_presence(websocket)
        
        # Видалити з Redis
        if current_user_id:
            logger.info(f"User {current_user_id} disconnected, presence will expire via TTL")


# =============================================================================
# Background Task: Presence Cleanup
# =============================================================================

async def presence_cleanup_task():
    """
    Background task для очищення offline користувачів
    Запускається кожні 60 секунд
    """
    while True:
        try:
            await asyncio.sleep(60)
            
            # Redis автоматично видаляє keys з TTL
            # Тут можна додати додаткову логіку якщо потрібно
            online_users = await PresenceRedis.get_all_online()
            logger.info(f"Presence cleanup: {len(online_users)} users online")
        
        except Exception as e:
            logger.error(f"Presence cleanup error: {e}")

