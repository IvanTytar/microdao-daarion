"""
NATS Client — Publish DAO events
Phase 8: DAO Dashboard
"""
import json
from typing import Dict, Any, Optional
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
        """Publish event to NATS"""
        if not self.nc:
            print(f"⚠️  NATS not connected, skipping publish to {subject}")
            return
        
        try:
            message = json.dumps(payload, default=str).encode()
            await self.nc.publish(subject, message)
            print(f"📤 Published to {subject}: {payload.get('dao_id', 'unknown')}")
        except Exception as e:
            print(f"❌ Failed to publish to {subject}: {e}")
    
    async def close(self):
        """Close NATS connection"""
        if self.nc:
            await self.nc.close()
            print("✅ NATS connection closed")

