"""
Global Presence Gateway for City Service

Subscribes to NATS presence events from matrix-presence-aggregator
and broadcasts to WebSocket clients.
"""
import asyncio
import json
import logging
from typing import Dict, Set, Optional
import os

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

# NATS URL
NATS_URL = os.getenv("NATS_URL", "nats://localhost:4222")


class GlobalPresenceManager:
    """Manages WebSocket connections for global room presence"""
    
    def __init__(self):
        self.connections: Set[WebSocket] = set()
        self.room_presence: Dict[str, dict] = {}  # slug -> {online_count, typing_count}
        self.nc = None  # NATS connection
        self.is_running = False
    
    async def connect(self, websocket: WebSocket):
        """Add a new WebSocket client"""
        await websocket.accept()
        self.connections.add(websocket)
        
        # Send initial snapshot
        await self._send_snapshot(websocket)
        
        logger.info(f"Global presence client connected. Total: {len(self.connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket client"""
        self.connections.discard(websocket)
        logger.info(f"Global presence client disconnected. Total: {len(self.connections)}")
    
    async def _send_snapshot(self, websocket: WebSocket):
        """Send current presence snapshot to a client"""
        rooms = [
            {
                "room_slug": slug,
                "online_count": data.get("online_count", 0),
                "typing_count": data.get("typing_count", 0)
            }
            for slug, data in self.room_presence.items()
        ]
        
        await websocket.send_json({
            "type": "snapshot",
            "rooms": rooms
        })
    
    async def broadcast(self, message: dict):
        """Broadcast a message to all connected clients"""
        if not self.connections:
            return
        
        disconnected = set()
        
        for websocket in self.connections:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send to websocket: {e}")
                disconnected.add(websocket)
        
        # Remove disconnected clients
        for ws in disconnected:
            self.connections.discard(ws)
    
    def update_room_presence(self, slug: str, online_count: int, typing_count: int):
        """Update cached presence for a room"""
        self.room_presence[slug] = {
            "online_count": online_count,
            "typing_count": typing_count
        }
    
    async def start_nats_subscriber(self):
        """Start NATS subscription for presence events"""
        try:
            import nats
            
            self.nc = await nats.connect(NATS_URL)
            self.is_running = True
            logger.info(f"Connected to NATS at {NATS_URL} for presence events")
            
            # Subscribe to room presence events
            await self.nc.subscribe("city.presence.room.*", cb=self._on_room_presence)
            
            logger.info("Subscribed to city.presence.room.*")
            
        except ImportError:
            logger.warning("nats-py not installed, NATS presence disabled")
        except Exception as e:
            logger.error(f"Failed to connect to NATS: {e}")
    
    async def _on_room_presence(self, msg):
        """Handle room presence event from NATS"""
        try:
            data = json.loads(msg.data.decode())
            
            slug = data.get("room_slug")
            online_count = data.get("online_count", 0)
            typing_count = data.get("typing_count", 0)
            
            if slug:
                # Update cache
                self.update_room_presence(slug, online_count, typing_count)
                
                # Broadcast to WebSocket clients
                await self.broadcast({
                    "type": "room.presence",
                    "room_slug": slug,
                    "online_count": online_count,
                    "typing_count": typing_count
                })
                
                logger.debug(f"Room presence update: {slug} -> {online_count} online, {typing_count} typing")
        
        except Exception as e:
            logger.error(f"Error processing NATS presence event: {e}")
    
    async def stop(self):
        """Stop NATS subscription"""
        self.is_running = False
        if self.nc:
            await self.nc.drain()
            logger.info("NATS connection closed")


# Global instance
global_presence_manager = GlobalPresenceManager()


async def websocket_global_presence(websocket: WebSocket):
    """
    WebSocket endpoint for global room presence
    /ws/city/global-presence
    
    Sends:
    - Initial snapshot of all room presence
    - Real-time updates when presence changes
    """
    await global_presence_manager.connect(websocket)
    
    try:
        while True:
            # Keep connection alive, handle pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    
    except WebSocketDisconnect:
        global_presence_manager.disconnect(websocket)


async def start_presence_gateway():
    """Start the global presence gateway (call on startup)"""
    await global_presence_manager.start_nats_subscriber()


async def stop_presence_gateway():
    """Stop the global presence gateway (call on shutdown)"""
    await global_presence_manager.stop()

