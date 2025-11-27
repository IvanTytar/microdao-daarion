"""
PDP Client — Check permissions via pdp-service
Phase 8: DAO Dashboard
"""
from fastapi import HTTPException
import httpx
import os

PDP_SERVICE_URL = os.getenv("PDP_SERVICE_URL", "http://localhost:7012")

async def check_pdp_permission(
    action: str,
    resource: dict,
    context: dict,
    actor: dict
) -> bool:
    """
    Check permission via pdp-service
    Returns True if allowed, False otherwise
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{PDP_SERVICE_URL}/internal/pdp/evaluate",
                json={
                    "action": action,
                    "resource": resource,
                    "context": context,
                    "actor": actor
                }
            )
            response.raise_for_status()
            result = response.json()
            return result.get("decision") == "ALLOW"
        except httpx.HTTPError as e:
            print(f"⚠️  PDP error: {e}")
            return False  # Fail closed

async def require_permission(
    action: str,
    resource: dict,
    context: dict,
    actor: dict
):
    """
    Check permission and raise 403 if denied
    """
    allowed = await check_pdp_permission(action, resource, context, actor)
    if not allowed:
        raise HTTPException(status_code=403, detail=f"Permission denied: {action}")

