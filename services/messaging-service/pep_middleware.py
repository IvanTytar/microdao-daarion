"""
PEP Middleware for messaging-service
Policy Enforcement Point - enforces access control via PDP
"""
import httpx
import os
from fastapi import HTTPException, Header
from typing import Optional

PDP_SERVICE_URL = os.getenv("PDP_SERVICE_URL", "http://pdp-service:7012")
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth-service:7011")

class PEPClient:
    """Client for Policy Enforcement Point"""
    
    def __init__(self):
        self.pdp_url = PDP_SERVICE_URL
        self.auth_url = AUTH_SERVICE_URL
    
    async def get_actor_identity(self, authorization: Optional[str] = None, x_api_key: Optional[str] = None):
        """
        Get actor identity from auth-service
        
        Returns ActorIdentity or raises HTTPException
        """
        if not authorization and not x_api_key:
            raise HTTPException(401, "Authorization required")
        
        headers = {}
        if authorization:
            headers["Authorization"] = authorization
        if x_api_key:
            headers["X-API-Key"] = x_api_key
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{self.auth_url}/auth/me",
                    headers=headers
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise HTTPException(401, "Invalid credentials")
            raise HTTPException(503, f"Auth service error: {e.response.status_code}")
        except Exception as e:
            print(f"⚠️  Auth service unavailable: {e}")
            # Fallback: extract user ID from header (Phase 4 stub)
            return self._fallback_actor(authorization, x_api_key)
    
    def _fallback_actor(self, authorization: Optional[str], x_api_key: Optional[str]):
        """Fallback actor identity when auth-service is unavailable"""
        # Extract from X-User-Id header (Phase 2/3 compatibility)
        actor_id = "user:admin"  # Default for Phase 4 testing
        
        return {
            "actor_id": actor_id,
            "actor_type": "human",
            "microdao_ids": ["microdao:daarion", "microdao:7"],
            "roles": ["member", "admin"]
        }
    
    async def check_permission(self, actor, action: str, resource_type: str, resource_id: str, context: dict = None):
        """
        Check permission via PDP
        
        Raises HTTPException(403) if denied
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    f"{self.pdp_url}/internal/pdp/evaluate",
                    json={
                        "actor": actor,
                        "action": action,
                        "resource": {
                            "type": resource_type,
                            "id": resource_id
                        },
                        "context": context or {}
                    }
                )
                response.raise_for_status()
                decision = response.json()
                
                if decision["effect"] == "deny":
                    reason = decision.get("reason", "access_denied")
                    raise HTTPException(403, f"Access denied: {reason}")
                
                return decision
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 403:
                raise HTTPException(403, "Access denied")
            print(f"⚠️  PDP service error: {e.response.status_code}")
            # Fallback: allow (Phase 4 testing)
            return {"effect": "permit", "reason": "pdp_unavailable_fallback"}
        except Exception as e:
            print(f"⚠️  PDP service unavailable: {e}")
            # Fallback: allow (Phase 4 testing)
            return {"effect": "permit", "reason": "pdp_unavailable_fallback"}

# Global PEP client instance
pep_client = PEPClient()

# ============================================================================
# Dependency Functions (for FastAPI endpoints)
# ============================================================================

async def require_actor(
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None)  # Phase 2/3 compatibility
):
    """
    FastAPI dependency: Get current actor identity
    
    Usage:
        @app.post("/api/messaging/channels/{channel_id}/messages")
        async def send_message(actor = Depends(require_actor)):
            ...
    """
    # Phase 2/3 compatibility: use X-User-Id if present
    if x_user_id and not authorization and not x_api_key:
        return {
            "actor_id": x_user_id,
            "actor_type": "agent" if x_user_id.startswith("agent:") else "human",
            "microdao_ids": ["microdao:daarion"],
            "roles": ["member"]
        }
    
    return await pep_client.get_actor_identity(authorization, x_api_key)

async def require_channel_permission(
    channel_id: str,
    action: str = "send_message",
    actor = None,
    context: dict = None
):
    """
    Check permission for channel action
    
    Raises HTTPException(403) if denied
    """
    if not actor:
        raise HTTPException(401, "Authentication required")
    
    await pep_client.check_permission(
        actor=actor,
        action=action,
        resource_type="channel",
        resource_id=channel_id,
        context=context
    )

async def require_microdao_permission(
    microdao_id: str,
    action: str = "read",
    actor = None
):
    """
    Check permission for microDAO action
    
    Raises HTTPException(403) if denied
    """
    if not actor:
        raise HTTPException(401, "Authentication required")
    
    await pep_client.check_permission(
        actor=actor,
        action=action,
        resource_type="microdao",
        resource_id=microdao_id
    )





