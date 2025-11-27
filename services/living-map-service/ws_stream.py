"""
WebSocket Stream for Living Map
Phase 9: Living Map
"""
from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict, Any, Callable
import asyncio
import json
from datetime import datetime

class ConnectionManager:
    """Manage WebSocket connections"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket):
        """Accept new connection"""
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)
        print(f"✅ WebSocket connected. Total: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove disconnected client"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"❌ WebSocket disconnected. Total: {len(self.active_connections)}")
    
    async def send_to_all(self, message: Dict[str, Any]):
        """Broadcast message to all connected clients"""
        if not self.active_connections:
            return
        
        # Serialize once
        text = json.dumps(message, default=str)
        
        # Send to all connections (remove failed ones)
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(text)
            except Exception as e:
                print(f"⚠️  Failed to send to WebSocket: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected
        for conn in disconnected:
            self.disconnect(conn)
    
    async def send_snapshot(self, snapshot: Dict[str, Any]):
        """Send snapshot to all connections"""
        await self.send_to_all({
            "kind": "snapshot",
            "data": snapshot
        })
    
    async def send_event(self, event: Dict[str, Any]):
        """Send event to all connections"""
        await self.send_to_all(event)
    
    async def send_ping(self):
        """Send ping to keep connections alive"""
        await self.send_to_all({
            "kind": "ping",
            "timestamp": datetime.now().isoformat()
        })

# Global connection manager instance
ws_manager = ConnectionManager()

async def broadcast_event(event: Dict[str, Any]):
    """Callback for NATS subscriber to broadcast events"""
    await ws_manager.send_event(event)

async def websocket_endpoint(websocket: WebSocket, get_snapshot_fn: Callable):
    """WebSocket endpoint handler"""
    await ws_manager.connect(websocket)
    
    try:
        # Send initial snapshot
        snapshot = await get_snapshot_fn()
        await websocket.send_json({
            "kind": "snapshot",
            "data": snapshot
        })
        
        # Keep connection alive and listen for messages
        while True:
            try:
                # Wait for any message (ping/pong)
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=30.0
                )
                # Echo back or ignore
            except asyncio.TimeoutError:
                # Send ping to keep alive
                await websocket.send_json({
                    "kind": "ping",
                    "timestamp": datetime.now().isoformat()
                })
    
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        ws_manager.disconnect(websocket)

