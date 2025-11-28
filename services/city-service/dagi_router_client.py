import os
from typing import Optional

import httpx


class DagiRouterClient:
    """HTTP клієнт для DAGI Router"""

    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self._client = httpx.AsyncClient(timeout=60.0)

    async def ask_agent(
        self,
        agent_id: str,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> dict:
        payload = {
            "prompt": prompt,
        }
        if system_prompt:
            payload["system_prompt"] = system_prompt

        response = await self._client.post(
            f"{self.base_url}/v1/agents/{agent_id}/infer",
            json=payload,
        )
        response.raise_for_status()
        return response.json()


_router_client: Optional[DagiRouterClient] = None


def get_dagi_router_client() -> DagiRouterClient:
    """Dependency factory for FastAPI"""
    global _router_client

    if _router_client is None:
        base_url = os.getenv("DAGI_ROUTER_URL", "http://localhost:9102")
        _router_client = DagiRouterClient(base_url)

    return _router_client


