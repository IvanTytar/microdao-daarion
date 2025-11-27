"""
Base HTTP Client for service adapters
Phase 9: Living Map
"""
import httpx
from typing import Optional, Any
import asyncio

class BaseServiceClient:
    """Base client with timeout and retry logic"""
    
    def __init__(self, base_url: str, timeout: float = 5.0):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
    
    async def get(
        self,
        path: str,
        params: Optional[dict] = None,
        headers: Optional[dict] = None
    ) -> Optional[Any]:
        """GET request with error handling"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}{path}",
                    params=params,
                    headers=headers or {}
                )
                response.raise_for_status()
                return response.json()
        except httpx.TimeoutException:
            print(f"⚠️  Timeout calling {self.base_url}{path}")
            return None
        except httpx.HTTPError as e:
            print(f"⚠️  HTTP error calling {self.base_url}{path}: {e}")
            return None
        except Exception as e:
            print(f"⚠️  Error calling {self.base_url}{path}: {e}")
            return None
    
    async def get_with_fallback(
        self,
        path: str,
        fallback: Any,
        params: Optional[dict] = None
    ) -> Any:
        """GET with fallback value if fails"""
        result = await self.get(path, params)
        return result if result is not None else fallback

