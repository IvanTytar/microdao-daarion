"""
NATS Client — Publish microDAO events
Phase 7: Backend Completion
"""
import json
from typing import Optional, Dict, Any
from nats.aio.client import Client as NATS

class NATSPublisher:
    def __init__(self, nats_url: str):
        self.nats_url = nats_url
        self.nc: Optional[NATS] = None
    
    async def connect(self):
        """Connect to NATS"""
        self.nc = NATS()
        await self.nc.connect(self.nats_url)
        print(f"✅ NATS connected: {self.nats_url}")
    
    async def publish(self, subject: str, payload: Dict[str, Any]):
        """
        Publish event to NATS
        
        Args:
            subject: NATS subject (e.g., "microdao.event.created")
            payload: Event payload as dict
        """
        if not self.nc:
            print(f"⚠️  NATS not connected, skipping publish to {subject}")
            return
        
        try:
            message = json.dumps(payload).encode()
            await self.nc.publish(subject, message)
            print(f"📤 Published to {subject}: {payload.get('microdao_id', 'unknown')}")
        except Exception as e:
            print(f"❌ Failed to publish to {subject}: {e}")
    
    async def close(self):
        """Close NATS connection"""
        if self.nc:
            await self.nc.close()
            print("✅ NATS connection closed")

