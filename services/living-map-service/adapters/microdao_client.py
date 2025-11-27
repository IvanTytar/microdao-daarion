"""
MicroDAO Service Client Adapter
Phase 9: Living Map
"""
from typing import List, Dict, Any
from .base_client import BaseServiceClient
import os

class MicrodaoClient(BaseServiceClient):
    """Client for microdao-service"""
    
    def __init__(self):
        base_url = os.getenv("MICRODAO_SERVICE_URL", "http://localhost:7015")
        super().__init__(base_url)
    
    async def get_microdaos_list(self) -> List[Dict[str, Any]]:
        """Get list of all microDAOs"""
        # Note: This endpoint might require auth, using internal endpoint if available
        result = await self.get_with_fallback("/internal/microdaos", fallback=[])
        if not result:
            result = await self.get_with_fallback("/microdao", fallback=[])
        return result if isinstance(result, list) else []
    
    async def get_layer_data(self) -> Dict[str, Any]:
        """Get city layer data for Living Map"""
        microdaos_list = await self.get_microdaos_list()
        
        # Transform to Living Map format
        items = []
        total_agents = 0
        total_nodes = 0
        total_members = 0
        
        for microdao in microdaos_list:
            agents_count = microdao.get("agent_count", 0)
            nodes_count = microdao.get("node_count", 0)
            members_count = microdao.get("member_count", 0)
            
            total_agents += agents_count
            total_nodes += nodes_count
            total_members += members_count
            
            items.append({
                "id": microdao.get("external_id", f"microdao:{microdao.get('id')}"),
                "slug": microdao.get("slug", "unknown"),
                "name": microdao.get("name", "Unknown microDAO"),
                "status": "active" if microdao.get("is_active") else "inactive",
                "agents": agents_count,
                "nodes": nodes_count,
                "members": members_count,
                "description": microdao.get("description")
            })
        
        return {
            "microdaos_total": len(items),
            "active_users": total_members,
            "active_agents": total_agents,
            "health": "green" if len(items) > 0 else "yellow",
            "items": items
        }

