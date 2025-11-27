"""
WebSocket — Live Agent Events Stream
Phase 6: Real-time event streaming
"""
from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from typing import Set, Dict, Optional
import asyncio
import json
from datetime import datetime

from models import WSAgentEvent
from repository_events import EventRepository

router = APIRouter(tags=["websocket"])

# Global state for WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.all_connections: Set[WebSocket] = set()
        self.event_queue: asyncio.Queue = asyncio.Queue()
    
    async def connect(self, websocket: WebSocket, agent_id: Optional[str] = None):
        """Accept WebSocket connection"""
        await websocket.accept()
        
        if agent_id:
            if agent_id not in self.active_connections:
                self.active_connections[agent_id] = set()
            self.active_connections[agent_id].add(websocket)
        else:
            # Subscribe to all agents
            self.all_connections.add(websocket)
        
        print(f"✅ WS connected: {agent_id or 'ALL'} (total: {self.get_connection_count()})")
    
    def disconnect(self, websocket: WebSocket, agent_id: Optional[str] = None):
        """Remove WebSocket connection"""
        if agent_id and agent_id in self.active_connections:
            self.active_connections[agent_id].discard(websocket)
            if not self.active_connections[agent_id]:
                del self.active_connections[agent_id]
        else:
            self.all_connections.discard(websocket)
        
        print(f"❌ WS disconnected: {agent_id or 'ALL'} (total: {self.get_connection_count()})")
    
    async def broadcast_event(self, agent_id: str, event: WSAgentEvent):
        """Broadcast event to subscribers"""
        message = event.json()
        
        # Send to agent-specific subscribers
        if agent_id in self.active_connections:
            dead_connections = set()
            for connection in self.active_connections[agent_id]:
                try:
                    await connection.send_text(message)
                except Exception:
                    dead_connections.add(connection)
            
            # Clean up dead connections
            for conn in dead_connections:
                self.disconnect(conn, agent_id)
        
        # Send to "all agents" subscribers
        dead_connections = set()
        for connection in self.all_connections:
            try:
                await connection.send_text(message)
            except Exception:
                dead_connections.add(connection)
        
        for conn in dead_connections:
            self.disconnect(conn, None)
    
    def get_connection_count(self) -> int:
        """Get total active connections"""
        count = len(self.all_connections)
        for connections in self.active_connections.values():
            count += len(connections)
        return count
    
    async def push_event_to_queue(self, agent_id: str, event_kind: str, payload: dict):
        """Push event to queue (called from nats_subscriber or routes)"""
        event = WSAgentEvent(
            type="agent_event",
            agent_id=agent_id,
            ts=datetime.utcnow().isoformat(),
            kind=event_kind,
            payload=payload
        )
        await self.event_queue.put((agent_id, event))


manager = ConnectionManager()

# ============================================================================
# WebSocket Endpoint
# ============================================================================

@router.websocket("/ws/agents/stream")
async def websocket_agent_events(websocket: WebSocket, agent_id: Optional[str] = None):
    """
    WebSocket endpoint for live agent events
    
    Query params:
    - agent_id: subscribe to specific agent (optional)
    
    If agent_id is None, subscribe to all agents
    """
    await manager.connect(websocket, agent_id)
    
    try:
        # Keep connection alive and send events
        while True:
            # Wait for events from queue
            try:
                event_agent_id, event = await asyncio.wait_for(
                    manager.event_queue.get(),
                    timeout=30.0  # 30-second timeout for ping
                )
                
                # If subscribed to specific agent, only send its events
                if agent_id is None or event_agent_id == agent_id:
                    await websocket.send_text(event.json())
            
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                await websocket.send_json({"type": "ping", "ts": datetime.utcnow().isoformat()})
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, agent_id)
    except Exception as e:
        print(f"⚠️  WebSocket error: {e}")
        manager.disconnect(websocket, agent_id)

# ============================================================================
# Background Task — Event Queue Consumer
# ============================================================================

async def event_queue_consumer():
    """
    Background task that consumes events from queue and broadcasts to WS clients
    
    This runs in background alongside the main FastAPI app
    """
    print("🚀 Event queue consumer started")
    
    while True:
        try:
            # Get event from queue (with timeout to prevent blocking)
            agent_id, event = await asyncio.wait_for(
                manager.event_queue.get(),
                timeout=1.0
            )
            
            # Broadcast to WebSocket clients
            await manager.broadcast_event(agent_id, event)
        
        except asyncio.TimeoutError:
            # No events in queue, continue
            continue
        except Exception as e:
            print(f"⚠️  Event queue consumer error: {e}")
            await asyncio.sleep(1)

# ============================================================================
# Helper Functions (for use in other modules)
# ============================================================================

async def push_event_to_ws(agent_id: str, event_kind: str, payload: dict = None):
    """
    Push event to WebSocket stream
    Called from routes_agents or nats_subscriber
    """
    await manager.push_event_to_queue(agent_id, event_kind, payload or {})

