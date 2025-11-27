"""
MicroDAO Members Routes
Phase 7: Backend Completion
"""
from fastapi import APIRouter, HTTPException, Header
from typing import List, Optional
import httpx
import os
from datetime import datetime

from models import MicrodaoMember, MemberAdd, MemberUpdateRole
from repository_microdao import MicrodaoRepository

router = APIRouter(tags=["members"])

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
# Members — List
# ============================================================================

@router.get("/microdao/{slug}/members", response_model=List[MicrodaoMember])
async def list_members(
    slug: str,
    authorization: Optional[str] = Header(None)
):
    """
    List members of a microDAO
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
        raise HTTPException(status_code=403, detail="Permission denied: cannot view members")
    
    return await repo.list_members(microdao.id)

# ============================================================================
# Members — Add
# ============================================================================

@router.post("/microdao/{slug}/members", response_model=MicrodaoMember, status_code=201)
async def add_member(
    slug: str,
    data: MemberAdd,
    authorization: Optional[str] = Header(None)
):
    """
    Add member to microDAO
    Requires: MICRODAO_MANAGE_MEMBERS permission
    """
    actor = await get_actor_from_token(authorization)
    
    # Get microDAO
    microdao = await repo.get_microdao_by_slug(slug)
    if not microdao:
        raise HTTPException(status_code=404, detail=f"MicroDAO '{slug}' not found")
    
    # Check PDP
    allowed = await check_pdp_permission(
        action="MICRODAO_MANAGE_MEMBERS",
        resource={"type": "MICRODAO", "id": microdao.id},
        context={"operation": "add_member"},
        actor=actor
    )
    
    if not allowed:
        raise HTTPException(status_code=403, detail="Permission denied: cannot add members")
    
    # Validate role
    valid_roles = ["owner", "admin", "member", "guest"]
    if data.role not in valid_roles:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid role '{data.role}'. Must be one of: {', '.join(valid_roles)}"
        )
    
    # Add member
    member = await repo.add_member(microdao.id, data.user_id, data.role)
    
    # Publish NATS event
    if nats_publisher:
        await nats_publisher(
            "microdao.event.member_added",
            {
                "microdao_id": microdao.id,
                "slug": microdao.slug,
                "member_id": member.id,
                "user_id": data.user_id,
                "role": data.role,
                "actor_id": actor.get("user_id"),
                "ts": datetime.now().isoformat()
            }
        )
    
    return member

# ============================================================================
# Members — Update Role
# ============================================================================

@router.patch("/microdao/{slug}/members/{member_id}", response_model=MicrodaoMember)
async def update_member_role(
    slug: str,
    member_id: str,
    data: MemberUpdateRole,
    authorization: Optional[str] = Header(None)
):
    """
    Update member role in microDAO
    Requires: MICRODAO_MANAGE_MEMBERS permission
    """
    actor = await get_actor_from_token(authorization)
    
    # Get microDAO
    microdao = await repo.get_microdao_by_slug(slug)
    if not microdao:
        raise HTTPException(status_code=404, detail=f"MicroDAO '{slug}' not found")
    
    # Check PDP
    allowed = await check_pdp_permission(
        action="MICRODAO_MANAGE_MEMBERS",
        resource={"type": "MICRODAO", "id": microdao.id},
        context={"operation": "update_role"},
        actor=actor
    )
    
    if not allowed:
        raise HTTPException(status_code=403, detail="Permission denied: cannot update member roles")
    
    # Validate role
    valid_roles = ["owner", "admin", "member", "guest"]
    if data.role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{data.role}'. Must be one of: {', '.join(valid_roles)}"
        )
    
    # Get current members to find user_id
    members = await repo.list_members(microdao.id)
    member = next((m for m in members if m.id == member_id), None)
    
    if not member:
        raise HTTPException(status_code=404, detail=f"Member '{member_id}' not found")
    
    # Remove old member and add with new role (simple approach)
    await repo.remove_member(member_id)
    updated_member = await repo.add_member(microdao.id, member.user_id, data.role)
    
    # Publish NATS event
    if nats_publisher:
        await nats_publisher(
            "microdao.event.member_role_updated",
            {
                "microdao_id": microdao.id,
                "slug": microdao.slug,
                "member_id": updated_member.id,
                "user_id": member.user_id,
                "old_role": member.role,
                "new_role": data.role,
                "actor_id": actor.get("user_id"),
                "ts": datetime.now().isoformat()
            }
        )
    
    return updated_member

# ============================================================================
# Members — Remove
# ============================================================================

@router.delete("/microdao/{slug}/members/{member_id}", status_code=204)
async def remove_member(
    slug: str,
    member_id: str,
    authorization: Optional[str] = Header(None)
):
    """
    Remove member from microDAO
    Requires: MICRODAO_MANAGE_MEMBERS permission
    """
    actor = await get_actor_from_token(authorization)
    
    # Get microDAO
    microdao = await repo.get_microdao_by_slug(slug)
    if not microdao:
        raise HTTPException(status_code=404, detail=f"MicroDAO '{slug}' not found")
    
    # Check PDP
    allowed = await check_pdp_permission(
        action="MICRODAO_MANAGE_MEMBERS",
        resource={"type": "MICRODAO", "id": microdao.id},
        context={"operation": "remove_member"},
        actor=actor
    )
    
    if not allowed:
        raise HTTPException(status_code=403, detail="Permission denied: cannot remove members")
    
    # Get member info before removal
    members = await repo.list_members(microdao.id)
    member = next((m for m in members if m.id == member_id), None)
    
    if not member:
        raise HTTPException(status_code=404, detail=f"Member '{member_id}' not found")
    
    # Prevent removing the last owner
    if member.role == "owner":
        owners = [m for m in members if m.role == "owner"]
        if len(owners) <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot remove the last owner. Transfer ownership first."
            )
    
    # Remove member
    success = await repo.remove_member(member_id)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to remove member")
    
    # Publish NATS event
    if nats_publisher:
        await nats_publisher(
            "microdao.event.member_removed",
            {
                "microdao_id": microdao.id,
                "slug": microdao.slug,
                "member_id": member_id,
                "user_id": member.user_id,
                "role": member.role,
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

