"""
FastAPI HTTP Layer for DAGI Router

Provides HTTP endpoints for routing requests
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, ConfigDict
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
    model_config = ConfigDict(extra='allow')  # Дозволити додаткові поля для сумісності
    
    mode: Optional[str] = Field(None, description="Request mode (e.g., 'chat', 'crew')")
    agent: Optional[str] = Field(None, description="Agent ID (e.g., 'devtools')")
    message: Optional[str] = Field(None, description="User message")
    dao_id: Optional[str] = Field(None, description="DAO ID for microDAO routing")
    source: Optional[str] = Field(None, description="Source system (e.g., 'telegram', 'discord')")
    session_id: Optional[str] = Field(None, description="Session identifier")
    user_id: Optional[str] = Field(None, description="User identifier")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Additional payload data")
    context: Optional[Dict[str, Any]] = Field(None, description="Legacy: context on top level (will be migrated to payload.context)")


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
        logger.info(f"Raw payload type: {type(req.payload)}, keys: {list(req.payload.keys()) if req.payload else []}")
        logger.info(f"Raw context: {req.context}")
        
        # Нормалізувати payload: якщо є "context" на верхньому рівні (старий формат),
        # перемістити його в payload.context для уніфікованої обробки
        normalized_payload = req.payload.copy() if req.payload else {}
        
        # Перевірити, чи є context на верхньому рівні (legacy формат від gateway-bot)
        # Це потрібно для сумісності з DAARWIZZ
        if req.context:
            # Якщо context на верхньому рівні, перемістити в payload.context
            if "context" not in normalized_payload:
                normalized_payload["context"] = {}
            # Мержити context з верхнього рівня в payload.context
            if isinstance(req.context, dict):
                normalized_payload["context"].update(req.context)
                logger.info(f"✅ Migrated top-level context to payload.context for agent={req.agent}, keys={list(req.context.keys())}")
        
        logger.info(f"✅ Normalized payload keys: {list(normalized_payload.keys())}")
        if normalized_payload and "context" in normalized_payload:
            logger.info(f"✅ Context keys: {list(normalized_payload['context'].keys()) if isinstance(normalized_payload.get('context'), dict) else []}")
            if isinstance(normalized_payload.get('context'), dict) and "system_prompt" in normalized_payload['context']:
                sp = normalized_payload['context']['system_prompt']
                sp_len = len(sp) if sp else 0
                logger.info(f"✅ System prompt found in context: {sp_len} chars")
                logger.info(f"✅ System prompt preview: {sp[:100] if sp else 'None'}...")
        
        # Convert to internal RouterRequest
        rreq = RouterRequest(
            mode=req.mode,
            agent=req.agent,
            dao_id=req.dao_id,
            source=req.source,
            session_id=req.session_id,
            user_id=req.user_id,
            message=req.message,
            payload=normalized_payload,
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
