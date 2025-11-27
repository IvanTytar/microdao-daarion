"""
WebSocket Support for City Service

Real-time updates для City Dashboard
"""

from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
import asyncio
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Менеджер WebSocket з'єднань"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.subscriptions: Dict[str, List[WebSocket]] = {
            "city": [],
            "events": [],
            "metrics": [],
            "agents": [],
        }
    
    async def connect(self, websocket: WebSocket, channel: str = "city"):
        """Підключити WebSocket"""
        await websocket.accept()
        self.active_connections.append(websocket)
        if channel in self.subscriptions:
            self.subscriptions[channel].append(websocket)
        logger.info(f"Client connected to channel: {channel}")
    
    def disconnect(self, websocket: WebSocket):
        """Від'єднати WebSocket"""
        self.active_connections.remove(websocket)
        for channel in self.subscriptions.values():
            if websocket in channel:
                channel.remove(websocket)
        logger.info("Client disconnected")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Надіслати повідомлення конкретному клієнту"""
        await websocket.send_text(message)
    
    async def broadcast(self, message: str, channel: str = "city"):
        """Надіслати повідомлення всім клієнтам каналу"""
        if channel in self.subscriptions:
            for connection in self.subscriptions[channel]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to client: {e}")
    
    async def broadcast_json(self, data: Dict[str, Any], channel: str = "city"):
        """Надіслати JSON всім клієнтам каналу"""
        message = json.dumps(data)
        await self.broadcast(message, channel)


# Глобальний instance
manager = ConnectionManager()


async def city_updates_generator():
    """
    Генератор оновлень для City Dashboard
    
    TODO: Підключити до реальних джерел (NATS, Redis)
    """
    while True:
        await asyncio.sleep(5)  # Оновлення кожні 5 секунд
        
        # Mock update
        update = {
            "type": "city_update",
            "timestamp": "2025-11-24T10:00:00Z",
            "data": {
                "metrics": {
                    "activityIndex": 0.72,
                    "nodeAvgLoad": 0.65,
                },
                "nodes_online": 12
            }
        }
        
        await manager.broadcast_json(update, "city")


async def events_stream_generator():
    """
    Генератор потоку подій
    
    TODO: Підключити до NATS JetStream events.city.*
    """
    while True:
        await asyncio.sleep(3)  # Нові події кожні 3 секунди
        
        # Mock event
        event = {
            "type": "city_event",
            "timestamp": "2025-11-24T10:00:00Z",
            "event": {
                "id": f"evt-{asyncio.get_event_loop().time()}",
                "type": "node",
                "label": "Mock event for testing",
                "severity": "info"
            }
        }
        
        await manager.broadcast_json(event, "events")


async def metrics_stream_generator():
    """
    Генератор live метрик
    
    TODO: Підключити до Redis/Prometheus
    """
    while True:
        await asyncio.sleep(1)  # Метрики кожну секунду
        
        # Mock metrics
        metrics = {
            "type": "metrics_update",
            "timestamp": "2025-11-24T10:00:00Z",
            "metrics": {
                "activityIndex": 0.71 + (asyncio.get_event_loop().time() % 10) / 100,
                "natsTps": int(48000 + (asyncio.get_event_loop().time() % 1000)),
            }
        }
        
        await manager.broadcast_json(metrics, "metrics")


async def agents_presence_generator():
    """
    Генератор присутності агентів
    
    TODO: Підключити до Agent Registry
    """
    while True:
        await asyncio.sleep(10)  # Оновлення присутності кожні 10 секунд
        
        # Mock agent presence
        presence = {
            "type": "agent_presence",
            "timestamp": "2025-11-24T10:00:00Z",
            "agents": {
                "online": 42,
                "offline": 3,
                "busy": 5,
            }
        }
        
        await manager.broadcast_json(presence, "agents")





