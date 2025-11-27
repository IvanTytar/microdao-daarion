"""
Usage Engine Client Adapter
Phase 9: Living Map
"""
from typing import Dict, Any
from .base_client import BaseServiceClient
import os

class UsageClient(BaseServiceClient):
    """Client for usage-engine"""
    
    def __init__(self):
        base_url = os.getenv("USAGE_ENGINE_URL", "http://localhost:7013")
        super().__init__(base_url)
    
    async def get_usage_summary(self, period_hours: int = 24) -> Dict[str, Any]:
        """Get usage summary for period"""
        result = await self.get_with_fallback(
            "/internal/usage/summary",
            fallback={
                "total_llm_calls": 0,
                "total_tokens": 0,
                "period_hours": period_hours
            },
            params={"period_hours": period_hours}
        )
        return result
    
    async def get_agent_usage(self, agent_id: str) -> Dict[str, Any]:
        """Get usage for specific agent"""
        result = await self.get_with_fallback(
            f"/internal/usage/agent/{agent_id}",
            fallback={
                "llm_calls_24h": 0,
                "tokens_24h": 0,
                "messages_24h": 0
            }
        )
        return result

