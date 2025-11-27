"""
Space Service Client Adapter
Phase 9: Living Map
"""
from typing import Dict, Any
from .base_client import BaseServiceClient
import os

class SpaceClient(BaseServiceClient):
    """Client for space-service"""
    
    def __init__(self):
        base_url = os.getenv("SPACE_SERVICE_URL", "http://localhost:7002")
        super().__init__(base_url)
    
    async def get_space_scene(self) -> Dict[str, Any]:
        """Get space scene data"""
        result = await self.get_with_fallback("/api/space/scene", fallback={})
        return result
    
    async def get_layer_data(self) -> Dict[str, Any]:
        """Get space layer data for Living Map"""
        scene = await self.get_space_scene()
        
        # Extract planets and nodes from scene
        # Format depends on space-service implementation
        planets = scene.get("planets", [])
        nodes = scene.get("nodes", [])
        
        return {
            "planets": planets,
            "nodes": nodes
        }

