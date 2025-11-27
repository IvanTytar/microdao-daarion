"""
DAO Service Client Adapter
Phase 9: Living Map
"""
from typing import List, Dict, Any
from .base_client import BaseServiceClient
import os

class DaoClient(BaseServiceClient):
    """Client for dao-service"""
    
    def __init__(self):
        base_url = os.getenv("DAO_SERVICE_URL", "http://localhost:7016")
        super().__init__(base_url)
    
    async def get_daos_list(self) -> List[Dict[str, Any]]:
        """Get list of all DAOs"""
        result = await self.get_with_fallback("/dao", fallback=[])
        return result if isinstance(result, list) else []
    
    async def get_proposals_summary(self) -> Dict[str, Any]:
        """Get proposals summary across all DAOs"""
        # This endpoint might not exist, return placeholder
        return {
            "total_proposals": 0,
            "active_proposals": 0
        }
    
    async def get_layer_data(self) -> Dict[str, Any]:
        """Get space layer data for Living Map (DAO planets)"""
        daos_list = await self.get_daos_list()
        
        # Transform to Living Map format (DAOs as planets)
        planets = []
        for dao in daos_list:
            planets.append({
                "id": f"dao:{dao.get('slug', dao.get('id'))}",
                "name": dao.get("name", "Unknown DAO"),
                "type": "dao",
                "status": "active" if dao.get("is_active") else "inactive",
                "orbits": [],  # TODO: Link nodes to DAOs
                "treasury_value": None,
                "active_proposals": 0
            })
        
        return {
            "planets": planets,
            "nodes": []  # Nodes will be added from space-service
        }

