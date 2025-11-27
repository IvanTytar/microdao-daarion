"""
MicroDAO CRUD Routes
Phase 7: Backend Completion
"""
from fastapi import APIRouter, HTTPException, Header
from typing import List, Optional
import httpx
import os

from models import MicrodaoCreate, MicrodaoUpdate, MicrodaoRead
from repository_microdao import MicrodaoRepository

router = APIRouter(prefix="/microdao", tags=["microdao"])

# Dependency injection (will be set in main.py)
repo: Optional[MicrodaoRepository] = None

# Service URLs
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:7011")
PDP_SERVICE_URL = os.getenv("PDP_SERVICE_URL", "http://localhost:7012")

# NATS publisher (will be set in main.py)
nats_publisher = None

# ============================================================================
# Auth & PDP Helpers
# ============================================================================

async def get_actor_from_token(authorization: Optional[str] = Header(None)):
    """
    Get ActorIdentity from auth-service
    Returns actor dict or raises 401
    """
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

# ============================================================================
# CRUD — List
# ============================================================================

@router.get("", response_model=List[MicrodaoRead])
async def list_microdaos(authorization: Optional[str] = Header(None)):
    """
    List microDAOs where current user is a member
    Requires: valid auth token
    """
    actor = await get_actor_from_token(authorization)
    user_id = actor.get("user_id")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid actor identity")
    
    return await repo.list_microdaos_for_user(user_id)

# ============================================================================
# CRUD — Create
# ============================================================================

@router.post("", response_model=MicrodaoRead, status_code=201)
async def create_microdao(
    data: MicrodaoCreate,
    authorization: Optional[str] = Header(None)
):
    """
    Create new microDAO
    Requires: MICRODAO_CREATE permission
    """
    actor = await get_actor_from_token(authorization)
    user_id = actor.get("user_id")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid actor identity")
    
    # Check PDP
    allowed = await check_pdp_permission(
        action="MICRODAO_CREATE",
        resource={"type": "MICRODAO"},
        context={"operation": "create"},
        actor=actor
    )
    
    if not allowed:
        raise HTTPException(status_code=403, detail="Permission denied: cannot create microDAO")
    
    # Check if slug already exists
    existing = await repo.get_microdao_by_slug(data.slug)
    if existing:
        raise HTTPException(status_code=409, detail=f"MicroDAO with slug '{data.slug}' already exists")
    
    # Create microDAO
    microdao = await repo.create_microdao(data, user_id)
    
    # Publish NATS event
    if nats_publisher:
        await nats_publisher(
            "microdao.event.created",
            {
                "microdao_id": microdao.id,
                "slug": microdao.slug,
                "name": microdao.name,
                "owner_user_id": user_id,
                "actor_id": user_id,
                "ts": microdao.created_at.isoformat()
            }
        )
    
    return microdao

# ============================================================================
# CRUD — Read (by slug)
# ============================================================================

@router.get("/{slug}", response_model=MicrodaoRead)
async def get_microdao(
    slug: str,
    authorization: Optional[str] = Header(None)
):
    """
    Get microDAO by slug
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
        raise HTTPException(status_code=403, detail="Permission denied: cannot read this microDAO")
    
    return microdao

# ============================================================================
# CRUD — Update
# ============================================================================

@router.put("/{slug}", response_model=MicrodaoRead)
async def update_microdao(
    slug: str,
    data: MicrodaoUpdate,
    authorization: Optional[str] = Header(None)
):
    """
    Update microDAO
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
        context={"operation": "update"},
        actor=actor
    )
    
    if not allowed:
        raise HTTPException(status_code=403, detail="Permission denied: cannot manage this microDAO")
    
    # Update
    updated = await repo.update_microdao(microdao.id, data)
    
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update microDAO")
    
    # Publish NATS event
    if nats_publisher:
        await nats_publisher(
            "microdao.event.updated",
            {
                "microdao_id": updated.id,
                "slug": updated.slug,
                "actor_id": actor.get("user_id"),
                "changes": data.model_dump(exclude_unset=True),
                "ts": updated.updated_at.isoformat()
            }
        )
    
    return updated

# ============================================================================
# CRUD — Delete (Soft)
# ============================================================================

@router.delete("/{slug}", status_code=204)
async def delete_microdao(
    slug: str,
    authorization: Optional[str] = Header(None)
):
    """
    Soft delete microDAO (set is_active = false)
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
        context={"operation": "delete"},
        actor=actor
    )
    
    if not allowed:
        raise HTTPException(status_code=403, detail="Permission denied: cannot delete this microDAO")
    
    # Delete
    success = await repo.delete_microdao(microdao.id)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete microDAO")
    
    # Publish NATS event
    if nats_publisher:
        await nats_publisher(
            "microdao.event.deleted",
            {
                "microdao_id": microdao.id,
                "slug": microdao.slug,
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

