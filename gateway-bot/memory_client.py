import asyncio
import os
import logging
import time
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
import httpx

logger = logging.getLogger(__name__)

MEMORY_SERVICE_URL = os.getenv("MEMORY_SERVICE_URL", "http://memory-service:8000")
CONTEXT_CACHE_TTL = float(os.getenv("MEMORY_CONTEXT_CACHE_TTL", "5"))


class MemoryClient:
    """Клієнт для роботи з Memory Service"""
    
    def __init__(self, base_url: str = MEMORY_SERVICE_URL):
        self.base_url = base_url.rstrip("/")
        self.timeout = 10.0
        self._context_cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}
    
    def _cache_key(
        self,
        user_id: str,
        agent_id: str,
        team_id: str,
        channel_id: Optional[str],
        limit: int
    ) -> str:
        return f"{user_id}:{agent_id}:{team_id}:{channel_id}:{limit}"
    
    async def get_context(
        self,
        user_id: str,
        agent_id: str,
        team_id: str,
        channel_id: Optional[str] = None,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Отримати контекст пам'яті для діалогу
        """
        cache_key = self._cache_key(user_id, agent_id, team_id, channel_id, limit)
        cached = self._context_cache.get(cache_key)
        now = time.monotonic()
        if cached and now - cached[0] < CONTEXT_CACHE_TTL:
            return cached[1]
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                facts_request = client.get(
                    f"{self.base_url}/facts",
                    params={"user_id": user_id, "team_id": team_id, "limit": limit},
                    headers={"Authorization": f"Bearer {user_id}"}
                )
                events_request = client.get(
                    f"{self.base_url}/agents/{agent_id}/memory",
                    params={
                        "team_id": team_id,
                        "channel_id": channel_id,
                        "scope": "short_term",
                        "kind": "message",
                        "limit": limit
                    },
                    headers={"Authorization": f"Bearer {user_id}"}
                )
                summaries_request = client.get(
                    f"{self.base_url}/summaries",
                    params={
                        "team_id": team_id,
                        "channel_id": channel_id,
                        "agent_id": agent_id,
                        "limit": 5
                    },
                    headers={"Authorization": f"Bearer {user_id}"}
                )
                
                facts_response, events_response, summaries_response = await asyncio.gather(
                    facts_request, events_request, summaries_request, return_exceptions=True
                )
                
                facts = facts_response.json() if isinstance(facts_response, httpx.Response) and facts_response.status_code == 200 else []
                events = (
                    events_response.json().get("items", [])
                    if isinstance(events_response, httpx.Response) and events_response.status_code == 200
                    else []
                )
                summaries = (
                    summaries_response.json().get("items", [])
                    if isinstance(summaries_response, httpx.Response) and summaries_response.status_code == 200
                    else []
                )
                
                result = {
                    "facts": facts,
                    "recent_events": events,
                    "dialog_summaries": summaries
                }
                self._context_cache[cache_key] = (now, result)
                return result
        except Exception as e:
            logger.warning(f"Memory context fetch failed: {e}")
            return {
                "facts": [],
                "recent_events": [],
                "dialog_summaries": []
            }
    
    async def save_chat_turn(
        self,
        agent_id: str,
        team_id: str,
        user_id: str,
        message: str,
        response: str,
        channel_id: Optional[str] = None,
        scope: str = "short_term",
        save_agent_response: bool = True,
        agent_metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Зберегти один turn діалогу (повідомлення + відповідь)
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Зберігаємо повідомлення користувача
                user_event = {
                    "agent_id": agent_id,
                    "team_id": team_id,
                    "channel_id": channel_id,
                    "user_id": user_id,
                    "scope": scope,
                    "kind": "message",
                    "body_text": message,
                    "body_json": {"type": "user_message", "source": "telegram"}
                }
                
                await client.post(
                    f"{self.base_url}/agents/{agent_id}/memory",
                    json=user_event,
                    headers={"Authorization": f"Bearer {user_id}"}
                )
                
                # Зберігаємо відповідь агента
                if save_agent_response and response:
                    agent_event = {
                        "agent_id": agent_id,
                        "team_id": team_id,
                        "channel_id": channel_id,
                        "user_id": user_id,
                        "scope": scope,
                        "kind": "message",
                        "body_text": response,
                        "body_json": {
                            "type": "agent_response",
                            "source": "telegram",
                            **(agent_metadata or {})
                        }
                    }
                    
                    await client.post(
                        f"{self.base_url}/agents/{agent_id}/memory",
                        json=agent_event,
                        headers={"Authorization": f"Bearer {user_id}"}
                    )
                
                return True
        except Exception as e:
            logger.warning(f"Failed to save chat turn: {e}")
            return False
    
    async def create_dialog_summary(
        self,
        team_id: str,
        channel_id: Optional[str],
        agent_id: str,
        user_id: Optional[str],
        period_start: datetime,
        period_end: datetime,
        summary_text: str,
        message_count: int = 0,
        participant_count: int = 0,
        topics: Optional[List[str]] = None,
        summary_json: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Створити підсумок діалогу для масштабування без переповнення контексту
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/summaries",
                    json={
                        "team_id": team_id,
                        "channel_id": channel_id,
                        "agent_id": agent_id,
                        "user_id": user_id,
                        "period_start": period_start.isoformat(),
                        "period_end": period_end.isoformat(),
                        "summary_text": summary_text,
                        "summary_json": summary_json,
                        "message_count": message_count,
                        "participant_count": participant_count,
                        "topics": topics or [],
                        "meta": {}
                    },
                    headers={"Authorization": f"Bearer {user_id or 'system'}"}
                )
                return response.status_code in [200, 201]
        except Exception as e:
            logger.warning(f"Failed to create dialog summary: {e}")
            return False
    
    async def upsert_fact(
        self,
        user_id: str,
        fact_key: str,
        fact_value: Optional[str] = None,
        fact_value_json: Optional[Dict[str, Any]] = None,
        team_id: Optional[str] = None
    ) -> bool:
        """
        Створити або оновити факт користувача
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/facts/upsert",
                    json={
                        "user_id": user_id,
                        "fact_key": fact_key,
                        "fact_value": fact_value,
                        "fact_value_json": fact_value_json,
                        "team_id": team_id
                    },
                    headers={"Authorization": f"Bearer {user_id}"}
                )
                return response.status_code in [200, 201]
        except Exception as e:
            logger.warning(f"Failed to upsert fact: {e}")
            return False
    
    async def get_fact(
        self,
        user_id: str,
        fact_key: str,
        team_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Отримати факт користувача
        
        Returns:
            Fact dict with fact_value and fact_value_json, or None if not found
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/facts/{fact_key}",
                    params={
                        "user_id": user_id,
                        "team_id": team_id
                    },
                    headers={"Authorization": f"Bearer {user_id}"}
                )
                if response.status_code == 200:
                    return response.json()
                return None
        except Exception as e:
            logger.warning(f"Failed to get fact: {e}")
            return None


# Глобальний екземпляр клієнта
memory_client = MemoryClient()

