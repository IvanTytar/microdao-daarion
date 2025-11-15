"""
FastAPI HTTP Layer for DAGI Router

Provides HTTP endpoints for routing requests
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import logging

from router_models import RouterRequest
from router_app import RouterApp

logger = logging.getLogger(__name__)


# ============================================================================
# Request/Response Models
# ============================================================================

class IncomingRequest(BaseModel):
    """HTTP request format"""
    mode: Optional[str] = Field(None, description="Request mode (e.g., 'chat', 'crew')")
    agent: Optional[str] = Field(None, description="Agent ID (e.g., 'devtools')")
    message: Optional[str] = Field(None, description="User message")
    dao_id: Optional[str] = Field(None, description="DAO ID for microDAO routing")
    source: Optional[str] = Field(None, description="Source system (e.g., 'telegram', 'discord')")
    session_id: Optional[str] = Field(None, description="Session identifier")
    user_id: Optional[str] = Field(None, description="User identifier")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Additional payload data")


class RouterAPIResponse(BaseModel):
    """HTTP response format"""
    ok: bool
    provider: str
    data: Optional[Any] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ============================================================================
# Router Builder
# ============================================================================

def build_router_http(app_core: RouterApp) -> APIRouter:
    """
    Build FastAPI router with DAGI Router endpoints.
    
    Args:
        app_core: Initialized RouterApp instance
    
    Returns:
        FastAPI APIRouter with endpoints
    """
    
    router = APIRouter(tags=["DAGI Router"])
    
    @router.post(
        "/route",
        response_model=RouterAPIResponse,
        summary="Route request to appropriate provider",
        description="Main routing endpoint. Routes requests to LLM, DevTools, or other providers based on rules."
    )
    async def route_request(req: IncomingRequest):
        """
        Route incoming request to appropriate provider.
        
        Request determines routing based on:
        - agent: Which agent to use (devtools, etc.)
        - mode: Request mode (chat, crew, etc.)
        - payload.task_type: Type of task
        - Other metadata
        """
        logger.info(f"Incoming request: agent={req.agent}, mode={req.mode}")
        
        # Convert to internal RouterRequest
        rreq = RouterRequest(
            mode=req.mode,
            agent=req.agent,
            dao_id=req.dao_id,
            source=req.source,
            session_id=req.session_id,
            user_id=req.user_id,
            message=req.message,
            payload=req.payload,
        )
        
        # Handle request
        try:
            resp = await app_core.handle(rreq)
        except Exception as e:
            logger.error(f"Unexpected error: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Internal error: {str(e)}"
            )
        
        # Check response
        if not resp.ok:
            logger.error(f"Provider error: {resp.error}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=resp.error or "Provider error"
            )
        
        logger.info(f"Request successful via {resp.provider_id}")
        
        return RouterAPIResponse(
            ok=True,
            provider=resp.provider_id,
            data=resp.data,
            metadata=resp.metadata,
        )
    
    @router.get(
        "/health",
        summary="Health check",
        description="Check if router is healthy and operational"
    )
    async def health_check():
        """Health check endpoint"""
        return {
            "status": "healthy",
            "service": "dagi-router",
            "version": "1.0.0",
            "node": app_core.config.node.id,
        }
    
    @router.get(
        "/info",
        summary="Router information",
        description="Get information about router configuration"
    )
    async def router_info():
        """Get router info"""
        return {
            "node": {
                "id": app_core.config.node.id,
                "role": app_core.config.node.role,
                "env": app_core.config.node.env,
            },
            "providers": app_core.get_provider_info(),
            "routing": app_core.get_routing_info(),
        }
    
    @router.get(
        "/providers",
        summary="List providers",
        description="Get list of available providers"
    )
    async def list_providers():
        """List available providers"""
        return app_core.get_provider_info()
    
    @router.get(
        "/routing",
        summary="List routing rules",
        description="Get list of routing rules"
    )
    async def list_routing():
        """List routing rules"""
        return app_core.get_routing_info()
    
    return router
