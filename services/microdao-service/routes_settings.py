"""
MicroDAO Settings Routes
Phase 7: Backend Completion
"""
from fastapi import APIRouter, HTTPException, Header
from typing import Dict, Any, Optional
import httpx
import os
from datetime import datetime

from models import SettingItem
from repository_microdao import MicrodaoRepository

router = APIRouter(tags=["settings"])

# Dependency injection (will be set in main.py)
repo: Optional[MicrodaoRepository] = None

# Service URLs
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:7011")
PDP_SERVICE_URL = os.getenv("PDP_SERVICE_URL", "http://localhost:7012")

# NATS publisher
nats_publisher = None

# ============================================================================
# Auth & PDP Helpers
# ============================================================================

async def get_actor_from_token(authorization: Optional[str] = Header(None)):
    """Get ActorIdentity from auth-service"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{AUTH_SERVICE_URL}/auth/me",
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

async def check_pdp_permission(
    action: str,
    resource: dict,
    context: dict,
    actor: dict
) -> bool:
    """Check permission via pdp-service"""
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
            return False

# ============================================================================
# Settings — Read
# ============================================================================

@router.get("/microdao/{slug}/settings", response_model=Dict[str, Any])
async def get_settings(
    slug: str,
    authorization: Optional[str] = Header(None)
):
    """
    Get all settings for a microDAO
    Requires: MICRODAO_READ permission
    """
    actor = await get_actor_from_token(authorization)
    
    # Get microDAO
    microdao = await repo.get_microdao_by_slug(slug)
    if not microdao:
        raise HTTPException(status_code=404, detail=f"MicroDAO '{slug}' not found")
    
    # Check PDP
    allowed = await check_pdp_permission(
        action="MICRODAO_READ",
        resource={"type": "MICRODAO", "id": microdao.id},
        context={},
        actor=actor
    )
    
    if not allowed:
        raise HTTPException(status_code=403, detail="Permission denied: cannot view settings")
    
    return await repo.get_settings(microdao.id)

# ============================================================================
# Settings — Update (Single Setting)
# ============================================================================

@router.post("/microdao/{slug}/settings", status_code=204)
async def update_setting(
    slug: str,
    setting: SettingItem,
    authorization: Optional[str] = Header(None)
):
    """
    Update a single setting
    Requires: MICRODAO_MANAGE permission
    """
    actor = await get_actor_from_token(authorization)
    
    # Get microDAO
    microdao = await repo.get_microdao_by_slug(slug)
    if not microdao:
        raise HTTPException(status_code=404, detail=f"MicroDAO '{slug}' not found")
    
    # Check PDP
    allowed = await check_pdp_permission(
        action="MICRODAO_MANAGE",
        resource={"type": "MICRODAO", "id": microdao.id},
        context={"operation": "update_settings"},
        actor=actor
    )
    
    if not allowed:
        raise HTTPException(status_code=403, detail="Permission denied: cannot manage settings")
    
    # Update setting
    await repo.upsert_setting(microdao.id, setting.key, setting.value)
    
    # Publish NATS event
    if nats_publisher:
        await nats_publisher(
            "microdao.event.settings_updated",
            {
                "microdao_id": microdao.id,
                "slug": microdao.slug,
                "setting_key": setting.key,
                "actor_id": actor.get("user_id"),
                "ts": datetime.now().isoformat()
            }
        )
    
    return None

# ============================================================================
# Settings — Bulk Update
# ============================================================================

@router.put("/microdao/{slug}/settings", status_code=204)
async def update_settings_bulk(
    slug: str,
    settings: Dict[str, Any],
    authorization: Optional[str] = Header(None)
):
    """
    Update multiple settings at once
    Requires: MICRODAO_MANAGE permission
    """
    actor = await get_actor_from_token(authorization)
    
    # Get microDAO
    microdao = await repo.get_microdao_by_slug(slug)
    if not microdao:
        raise HTTPException(status_code=404, detail=f"MicroDAO '{slug}' not found")
    
    # Check PDP
    allowed = await check_pdp_permission(
        action="MICRODAO_MANAGE",
        resource={"type": "MICRODAO", "id": microdao.id},
        context={"operation": "update_settings"},
        actor=actor
    )
    
    if not allowed:
        raise HTTPException(status_code=403, detail="Permission denied: cannot manage settings")
    
    # Update all settings
    for key, value in settings.items():
        await repo.upsert_setting(microdao.id, key, value)
    
    # Publish NATS event
    if nats_publisher:
        await nats_publisher(
            "microdao.event.settings_updated",
            {
                "microdao_id": microdao.id,
                "slug": microdao.slug,
                "updated_keys": list(settings.keys()),
                "actor_id": actor.get("user_id"),
                "ts": datetime.now().isoformat()
            }
        )
    
    return None

# ============================================================================
# Settings — Delete
# ============================================================================

@router.delete("/microdao/{slug}/settings/{key}", status_code=204)
async def delete_setting(
    slug: str,
    key: str,
    authorization: Optional[str] = Header(None)
):
    """
    Delete a setting
    Requires: MICRODAO_MANAGE permission
    """
    actor = await get_actor_from_token(authorization)
    
    # Get microDAO
    microdao = await repo.get_microdao_by_slug(slug)
    if not microdao:
        raise HTTPException(status_code=404, detail=f"MicroDAO '{slug}' not found")
    
    # Check PDP
    allowed = await check_pdp_permission(
        action="MICRODAO_MANAGE",
        resource={"type": "MICRODAO", "id": microdao.id},
        context={"operation": "delete_setting"},
        actor=actor
    )
    
    if not allowed:
        raise HTTPException(status_code=403, detail="Permission denied: cannot manage settings")
    
    # Delete setting
    success = await repo.delete_setting(microdao.id, key)
    
    if not success:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")
    
    # Publish NATS event
    if nats_publisher:
        await nats_publisher(
            "microdao.event.setting_deleted",
            {
                "microdao_id": microdao.id,
                "slug": microdao.slug,
                "setting_key": key,
                "actor_id": actor.get("user_id"),
                "ts": datetime.now().isoformat()
            }
        )
    
    return None

# ============================================================================
# Helper: Set repository
# ============================================================================

def set_repository(repository: MicrodaoRepository):
    """Set repository instance (called from main.py)"""
    global repo
    repo = repository

def set_nats_publisher(publisher_func):
    """Set NATS publisher function (called from main.py)"""
    global nats_publisher
    nats_publisher = publisher_func

