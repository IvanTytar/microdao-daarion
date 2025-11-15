"""
CrewAI Provider
Orchestrates multi-agent workflows via CrewAI backend.
"""
import logging
from typing import Dict, Any, Optional
import httpx

from providers.base import Provider
from router_models import RouterRequest, RouterResponse

logger = logging.getLogger(__name__)


class CrewAIProvider(Provider):
    """
    Provider that routes requests to a CrewAI orchestrator backend.
    
    The backend manages multi-agent workflows using CrewAI framework.
    """
    
    def __init__(
        self,
        provider_id: str,
        base_url: str,
        timeout: int = 120,
        **kwargs
    ):
        super().__init__(provider_id)
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        logger.info(f"CrewAIProvider initialized: {provider_id} → {base_url}")
    
    async def call(self, request: RouterRequest) -> RouterResponse:
        """
        Route request to CrewAI orchestrator backend.
        
        Expected request.payload format:
        {
            "workflow": "microdao_onboarding" | "code_review" | etc.,
            "input": {
                "user_id": "...",
                "channel": "...",
                ...
            }
        }
        """
        try:
            # Extract workflow and input from payload
            workflow = request.payload.get("workflow") if request.payload else None
            if not workflow:
                return RouterResponse(
                    ok=False,
                    provider_id=self.id,
                    error="Missing 'workflow' in request payload"
                )
            
            workflow_input = request.payload.get("input", {}) if request.payload else {}
            
            # Build request body with metadata
            body = {
                "workflow": workflow,
                "input": workflow_input,
                "meta": {
                    "mode": request.mode,
                    "agent": request.agent,
                    "dao_id": request.dao_id,
                    "user_id": request.user_id,
                    "source": request.source,
                    "session_id": request.session_id,
                }
            }
            
            # Call CrewAI backend
            url = f"{self.base_url}/workflow/run"
            logger.info(f"CrewAI workflow call: {workflow} → {url}")
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=body)
                response.raise_for_status()
                
                data = response.json()
                
                return RouterResponse(
                    ok=True,
                    provider_id=self.id,
                    data=data,
                    metadata={
                        "provider_type": "orchestrator",
                        "workflow": workflow,
                        "status_code": response.status_code
                    }
                )
        
        except httpx.HTTPStatusError as e:
            logger.error(f"CrewAI HTTP error: {e}")
            return RouterResponse(
                ok=False,
                provider_id=self.id,
                error=f"HTTP {e.response.status_code}: {e.response.text}"
            )
        
        except httpx.RequestError as e:
            logger.error(f"CrewAI request error: {e}")
            return RouterResponse(
                ok=False,
                provider_id=self.id,
                error=f"Request failed: {str(e)}"
            )
        
        except Exception as e:
            logger.error(f"CrewAI error: {e}")
            return RouterResponse(
                ok=False,
                provider_id=self.id,
                error=str(e)
            )
