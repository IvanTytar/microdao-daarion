"""
City Service Client Adapter
Phase 9: Living Map
"""
from typing import Dict, Any
from .base_client import BaseServiceClient
import os

class CityClient(BaseServiceClient):
    """Client for city-service"""
    
    def __init__(self):
        base_url = os.getenv("CITY_SERVICE_URL", "http://localhost:7001")
        super().__init__(base_url)
    
    async def get_city_snapshot(self) -> Dict[str, Any]:
        """Get city snapshot"""
        result = await self.get_with_fallback("/api/city/snapshot", fallback={})
        return result
    
    async def get_layer_data(self) -> Dict[str, Any]:
        """Get city layer data for Living Map"""
        snapshot = await self.get_city_snapshot()
        
        # Return as-is or transform if needed
        # This is a placeholder - actual structure depends on city-service
        return snapshot if snapshot else {
            "microdaos_total": 0,
            "active_users": 0,
            "active_agents": 0,
            "health": "unknown",
            "items": []
        }

