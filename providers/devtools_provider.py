"""
DevTools Provider
Calls a DevTools backend over HTTP for development operations:
- fs_read, fs_write
- run_tests
- notebook_execute
"""
import logging
from typing import Dict, Any, Optional
import httpx

from providers.base import Provider
from router_models import RouterRequest, RouterResponse

logger = logging.getLogger(__name__)


class DevToolsProvider(Provider):
    """
    Provider that routes requests to a DevTools backend service.
    
    The backend implements tools for:
    - File system operations (read/write)
    - CI operations (run tests)
    - Notebook execution
    - Git operations (future)
    """
    
    def __init__(
        self,
        provider_id: str,
        base_url: str,
        timeout: int = 30,
        **kwargs
    ):
        super().__init__(provider_id)
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        logger.info(f"DevToolsProvider initialized: {provider_id} → {base_url}")
    
    async def call(self, request: RouterRequest) -> RouterResponse:
        """
        Route request to DevTools backend.
        
        Expected request.payload format:
        {
            "tool": "fs_read" | "fs_write" | "run_tests" | "notebook_execute",
            "params": {...}
        }
        """
        try:
            # Extract tool and params from payload
            tool = request.payload.get("tool") if request.payload else None
            if not tool:
                return RouterResponse(
                    ok=False,
                    provider_id=self.id,
                    error="Missing 'tool' in request payload"
                )
            
            params = request.payload.get("params", {}) if request.payload else {}
            
            # Map tool to endpoint
            endpoint_map = {
                "fs_read": "/fs/read",
                "fs_write": "/fs/write",
                "run_tests": "/ci/run-tests",
                "notebook_execute": "/notebook/execute",
            }
            
            endpoint = endpoint_map.get(tool)
            if not endpoint:
                return RouterResponse(
                    ok=False,
                    provider_id=self.id,
                    error=f"Unknown tool: {tool}. Available: {list(endpoint_map.keys())}"
                )
            
            # Build request body
            body = {
                "dao_id": request.dao_id,
                "user_id": request.user_id,
                "source": request.source,
                **params
            }
            
            # Call backend
            url = f"{self.base_url}{endpoint}"
            logger.info(f"DevTools call: {tool} → {url}")
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=body)
                response.raise_for_status()
                
                data = response.json()
                
                return RouterResponse(
                    ok=True,
                    provider_id=self.id,
                    data=data,
                    metadata={
                        "provider_type": "devtools",
                        "tool": tool,
                        "endpoint": endpoint,
                        "status_code": response.status_code
                    }
                )
        
        except httpx.HTTPStatusError as e:
            logger.error(f"DevTools HTTP error: {e}")
            return RouterResponse(
                ok=False,
                provider_id=self.id,
                error=f"HTTP {e.response.status_code}: {e.response.text}"
            )
        
        except httpx.RequestError as e:
            logger.error(f"DevTools request error: {e}")
            return RouterResponse(
                ok=False,
                provider_id=self.id,
                error=f"Request failed: {str(e)}"
            )
        
        except Exception as e:
            logger.error(f"DevTools error: {e}")
            return RouterResponse(
                ok=False,
                provider_id=self.id,
                error=str(e)
            )
