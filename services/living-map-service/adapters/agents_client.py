"""
Agents Service Client Adapter
Phase 9: Living Map
"""
from typing import List, Dict, Any
from .base_client import BaseServiceClient
import os

class AgentsClient(BaseServiceClient):
    """Client for agents-service"""
    
    def __init__(self):
        base_url = os.getenv("AGENTS_SERVICE_URL", "http://localhost:7014")
        super().__init__(base_url)
    
    async def get_agents_list(self) -> List[Dict[str, Any]]:
        """Get list of all agents"""
        result = await self.get_with_fallback("/agents", fallback=[])
        return result if isinstance(result, list) else []
    
    async def get_agent_metrics_summary(self) -> Dict[str, Any]:
        """Get aggregated agent metrics"""
        # This endpoint might not exist yet, use fallback
        result = await self.get_with_fallback("/agents/metrics/summary", fallback={
            "total_agents": 0,
            "online_agents": 0,
            "total_llm_calls_24h": 0,
            "total_tokens_24h": 0
        })
        return result
    
    async def get_layer_data(self) -> Dict[str, Any]:
        """Get agents layer data for Living Map"""
        agents_list = await self.get_agents_list()
        metrics_summary = await self.get_agent_metrics_summary()
        
        # Transform to Living Map format
        items = []
        for agent in agents_list:
            items.append({
                "id": agent.get("id", agent.get("external_id", "unknown")),
                "name": agent.get("name", "Unknown Agent"),
                "kind": agent.get("kind", "assistant"),
                "microdao_id": agent.get("microdao_id"),
                "status": "online" if agent.get("is_active") else "offline",
                "usage": {
                    "llm_calls_24h": 0,  # TODO: Get from usage-engine
                    "tokens_24h": 0,
                    "messages_24h": 0
                },
                "model": agent.get("model"),
                "last_active": agent.get("updated_at")
            })
        
        return {
            "items": items,
            "total_agents": len(items),
            "online_agents": sum(1 for a in items if a["status"] == "online"),
            "total_llm_calls_24h": metrics_summary.get("total_llm_calls_24h", 0)
        }

