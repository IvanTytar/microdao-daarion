"""
Memory Service Client for Router
Used to get memory context for RAG queries
"""

import os
import logging
from typing import Optional, Dict, Any
import httpx

logger = logging.getLogger(__name__)

MEMORY_SERVICE_URL = os.getenv("MEMORY_SERVICE_URL", "http://memory-service:8000")


class MemoryClient:
    """Client for Memory Service"""
    
    def __init__(self, base_url: str = MEMORY_SERVICE_URL):
        self.base_url = base_url.rstrip("/")
        self.timeout = 10.0
    
    async def get_context(
        self,
        user_id: str,
        agent_id: str,
        team_id: str,
        channel_id: Optional[str] = None,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Get memory context for dialogue
        
        Returns:
            Dictionary with facts, recent_events, dialog_summaries
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Get user facts
                facts_response = await client.get(
                    f"{self.base_url}/facts",
                    params={"user_id": user_id, "team_id": team_id, "limit": limit}
                )
                facts = facts_response.json() if facts_response.status_code == 200 else []
                
                # Get recent memory events
                events_response = await client.get(
                    f"{self.base_url}/agents/{agent_id}/memory",
                    params={
                        "team_id": team_id,
                        "channel_id": channel_id,
                        "scope": "short_term",
                        "kind": "message",
                        "limit": limit
                    }
                )
                events = events_response.json().get("items", []) if events_response.status_code == 200 else []
                
                # Get dialog summaries
                summaries_response = await client.get(
                    f"{self.base_url}/summaries",
                    params={
                        "team_id": team_id,
                        "channel_id": channel_id,
                        "agent_id": agent_id,
                        "limit": 5
                    }
                )
                summaries = summaries_response.json().get("items", []) if summaries_response.status_code == 200 else []
                
                return {
                    "facts": facts,
                    "recent_events": events,
                    "dialog_summaries": summaries
                }
        except Exception as e:
            logger.warning(f"Memory context fetch failed: {e}")
            return {
                "facts": [],
                "recent_events": [],
                "dialog_summaries": []
            }


# Global client instance
memory_client = MemoryClient()

