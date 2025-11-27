"""
NATS Subscriber for Living Map events
Phase 9: Living Map
"""
import json
import asyncio
from nats.aio.client import Client as NATS
from typing import Callable, Optional
from repository_history import HistoryRepository

class NATSSubscriber:
    """Subscribe to NATS subjects and log events"""
    
    def __init__(self, nats_url: str, history_repo: HistoryRepository):
        self.nats_url = nats_url
        self.history_repo = history_repo
        self.nc: Optional[NATS] = None
        self.subscriptions = []
        self.event_callback: Optional[Callable] = None
    
    async def connect(self):
        """Connect to NATS"""
        self.nc = NATS()
        await self.nc.connect(self.nats_url)
        print(f"✅ NATS connected: {self.nats_url}")
    
    async def subscribe_all(self, event_callback: Optional[Callable] = None):
        """Subscribe to all Living Map relevant subjects"""
        if not self.nc:
            raise RuntimeError("NATS not connected")
        
        self.event_callback = event_callback
        
        subjects = [
            "city.event.*",
            "dao.event.*",
            "microdao.event.*",
            "node.metrics.*",
            "agent.event.*",
            "usage.llm.*",
            "usage.agent.*",
            "messaging.message.created"
        ]
        
        for subject in subjects:
            try:
                sub = await self.nc.subscribe(subject, cb=self._handle_message)
                self.subscriptions.append(sub)
                print(f"📡 Subscribed to: {subject}")
            except Exception as e:
                print(f"⚠️  Failed to subscribe to {subject}: {e}")
    
    async def _handle_message(self, msg):
        """Handle incoming NATS message"""
        try:
            # Decode payload
            payload = json.loads(msg.data.decode())
            subject = msg.subject
            
            # Extract entity info
            entity_id = payload.get("id") or payload.get("entity_id") or payload.get("agent_id") or payload.get("dao_id")
            entity_type = self._infer_entity_type(subject)
            
            # Log to history
            await self.history_repo.add_event(
                event_type=subject,
                payload=payload,
                source_service=self._extract_service(subject),
                entity_id=entity_id,
                entity_type=entity_type
            )
            
            # Notify callback (for WebSocket broadcast)
            if self.event_callback:
                await self.event_callback({
                    "kind": "event",
                    "event_type": subject,
                    "timestamp": payload.get("ts") or payload.get("timestamp"),
                    "payload": payload
                })
            
            print(f"📥 Event logged: {subject}")
        
        except Exception as e:
            print(f"❌ Error handling message from {msg.subject}: {e}")
    
    def _infer_entity_type(self, subject: str) -> str:
        """Infer entity type from NATS subject"""
        if "agent" in subject:
            return "agent"
        elif "dao" in subject:
            return "dao"
        elif "microdao" in subject:
            return "microdao"
        elif "node" in subject:
            return "node"
        elif "city" in subject:
            return "city"
        elif "space" in subject:
            return "space"
        else:
            return "unknown"
    
    def _extract_service(self, subject: str) -> str:
        """Extract service name from subject"""
        parts = subject.split(".")
        if len(parts) > 0:
            return f"{parts[0]}-service"
        return "unknown"
    
    async def close(self):
        """Close NATS connection"""
        if self.nc:
            await self.nc.close()
            print("✅ NATS connection closed")

