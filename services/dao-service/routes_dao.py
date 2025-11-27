"""
DAO Routes — CRUD for DAO, Members, Treasury
Phase 8: DAO Dashboard
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime

from models import (
    DaoCreate, DaoUpdate, DaoRead, DaoOverview,
    DaoMember, MemberAdd,
    DaoTreasuryItem, TreasuryUpdate
)
from auth_client import get_actor_from_token
from pdp_client import require_permission

router = APIRouter(prefix="/dao", tags=["dao"])

# Repositories (will be injected via dependency)
dao_repo = None
nats_publisher = None

# ============================================================================
# DAO — CRUD
# ============================================================================

@router.get("", response_model=List[DaoRead])
async def list_daos(actor: dict = Depends(get_actor_from_token)):
    """List DAOs where actor is a member"""
    user_id = actor.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid actor identity")
    
    return await dao_repo.list_daos_for_user(user_id)

@router.post("", response_model=DaoRead, status_code=201)
async def create_dao(
    data: DaoCreate,
    actor: dict = Depends(get_actor_from_token)
):
    """Create new DAO"""
    user_id = actor.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid actor identity")
    
    # Check PDP
    await require_permission(
        action="DAO_CREATE",
        resource={"type": "DAO"},
        context={"operation": "create"},
        actor=actor
    )
    
    # Check if slug already exists
    existing = await dao_repo.get_dao_by_slug(data.slug)
    if existing:
        raise HTTPException(status_code=409, detail=f"DAO with slug '{data.slug}' already exists")
    
    # Create DAO
    dao = await dao_repo.create_dao(data, user_id)
    
    # Publish NATS event
    if nats_publisher:
        await nats_publisher.publish(
            "dao.event.created",
            {
                "dao_id": dao.id,
                "slug": dao.slug,
                "name": dao.name,
                "microdao_id": dao.microdao_id,
                "owner_user_id": user_id,
                "actor_id": user_id,
                "ts": dao.created_at.isoformat()
            }
        )
    
    return dao

@router.get("/{slug}", response_model=DaoOverview)
async def get_dao(
    slug: str,
    actor: dict = Depends(get_actor_from_token)
):
    """Get DAO overview by slug"""
    dao_overview = await dao_repo.get_dao_overview_by_slug(slug)
    if not dao_overview:
        raise HTTPException(status_code=404, detail=f"DAO '{slug}' not found")
    
    # Check PDP
    await require_permission(
        action="DAO_READ",
        resource={"type": "DAO", "id": dao_overview.dao.id},
        context={},
        actor=actor
    )
    
    return dao_overview

@router.put("/{slug}", response_model=DaoRead)
async def update_dao(
    slug: str,
    data: DaoUpdate,
    actor: dict = Depends(get_actor_from_token)
):
    """Update DAO"""
    dao = await dao_repo.get_dao_by_slug(slug)
    if not dao:
        raise HTTPException(status_code=404, detail=f"DAO '{slug}' not found")
    
    # Check PDP
    await require_permission(
        action="DAO_MANAGE",
        resource={"type": "DAO", "id": dao.id},
        context={"operation": "update"},
        actor=actor
    )
    
    # Update
    updated = await dao_repo.update_dao(dao.id, data)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update DAO")
    
    # Publish NATS event
    if nats_publisher:
        await nats_publisher.publish(
            "dao.event.updated",
            {
                "dao_id": updated.id,
                "slug": updated.slug,
                "actor_id": actor.get("user_id"),
                "changes": data.model_dump(exclude_unset=True),
                "ts": updated.updated_at.isoformat()
            }
        )
    
    return updated

@router.delete("/{slug}", status_code=204)
async def delete_dao(
    slug: str,
    actor: dict = Depends(get_actor_from_token)
):
    """Soft delete DAO"""
    dao = await dao_repo.get_dao_by_slug(slug)
    if not dao:
        raise HTTPException(status_code=404, detail=f"DAO '{slug}' not found")
    
    # Check PDP
    await require_permission(
        action="DAO_MANAGE",
        resource={"type": "DAO", "id": dao.id},
        context={"operation": "delete"},
        actor=actor
    )
    
    # Delete
    success = await dao_repo.delete_dao(dao.id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete DAO")
    
    # Publish NATS event
    if nats_publisher:
        await nats_publisher.publish(
            "dao.event.deleted",
            {
                "dao_id": dao.id,
                "slug": dao.slug,
                "actor_id": actor.get("user_id"),
                "ts": datetime.now().isoformat()
            }
        )
    
    return None

# ============================================================================
# Members
# ============================================================================

@router.get("/{slug}/members", response_model=List[DaoMember])
async def list_members(
    slug: str,
    actor: dict = Depends(get_actor_from_token)
):
    """List DAO members"""
    dao = await dao_repo.get_dao_by_slug(slug)
    if not dao:
        raise HTTPException(status_code=404, detail=f"DAO '{slug}' not found")
    
    # Check PDP
    await require_permission(
        action="DAO_READ",
        resource={"type": "DAO", "id": dao.id},
        context={},
        actor=actor
    )
    
    return await dao_repo.list_members(dao.id)

@router.post("/{slug}/members", response_model=DaoMember, status_code=201)
async def add_member(
    slug: str,
    data: MemberAdd,
    actor: dict = Depends(get_actor_from_token)
):
    """Add member to DAO"""
    dao = await dao_repo.get_dao_by_slug(slug)
    if not dao:
        raise HTTPException(status_code=404, detail=f"DAO '{slug}' not found")
    
    # Check PDP
    await require_permission(
        action="DAO_MANAGE_MEMBERS",
        resource={"type": "DAO", "id": dao.id},
        context={"operation": "add_member"},
        actor=actor
    )
    
    # Add member
    member = await dao_repo.add_member(dao.id, data.user_id, data.role)
    
    # Publish NATS event
    if nats_publisher:
        await nats_publisher.publish(
            "dao.event.member_added",
            {
                "dao_id": dao.id,
                "slug": dao.slug,
                "member_id": member.id,
                "user_id": data.user_id,
                "role": data.role,
                "actor_id": actor.get("user_id"),
                "ts": datetime.now().isoformat()
            }
        )
    
    return member

@router.delete("/{slug}/members/{member_id}", status_code=204)
async def remove_member(
    slug: str,
    member_id: str,
    actor: dict = Depends(get_actor_from_token)
):
    """Remove member from DAO"""
    dao = await dao_repo.get_dao_by_slug(slug)
    if not dao:
        raise HTTPException(status_code=404, detail=f"DAO '{slug}' not found")
    
    # Check PDP
    await require_permission(
        action="DAO_MANAGE_MEMBERS",
        resource={"type": "DAO", "id": dao.id},
        context={"operation": "remove_member"},
        actor=actor
    )
    
    # Get member info
    members = await dao_repo.list_members(dao.id)
    member = next((m for m in members if m.id == member_id), None)
    if not member:
        raise HTTPException(status_code=404, detail=f"Member '{member_id}' not found")
    
    # Prevent removing last owner
    if member.role == "owner":
        owners = [m for m in members if m.role == "owner"]
        if len(owners) <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot remove the last owner"
            )
    
    # Remove
    success = await dao_repo.remove_member(member_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to remove member")
    
    # Publish NATS event
    if nats_publisher:
        await nats_publisher.publish(
            "dao.event.member_removed",
            {
                "dao_id": dao.id,
                "slug": dao.slug,
                "member_id": member_id,
                "user_id": member.user_id,
                "role": member.role,
                "actor_id": actor.get("user_id"),
                "ts": datetime.now().isoformat()
            }
        )
    
    return None

# ============================================================================
# Treasury
# ============================================================================

@router.get("/{slug}/treasury", response_model=List[DaoTreasuryItem])
async def get_treasury(
    slug: str,
    actor: dict = Depends(get_actor_from_token)
):
    """Get treasury balances"""
    dao = await dao_repo.get_dao_by_slug(slug)
    if not dao:
        raise HTTPException(status_code=404, detail=f"DAO '{slug}' not found")
    
    # Check PDP
    await require_permission(
        action="DAO_READ_TREASURY",
        resource={"type": "DAO", "id": dao.id},
        context={},
        actor=actor
    )
    
    return await dao_repo.get_treasury_items(dao.id)

@router.post("/{slug}/treasury", response_model=DaoTreasuryItem)
async def update_treasury(
    slug: str,
    data: TreasuryUpdate,
    actor: dict = Depends(get_actor_from_token)
):
    """Apply delta to treasury balance"""
    dao = await dao_repo.get_dao_by_slug(slug)
    if not dao:
        raise HTTPException(status_code=404, detail=f"DAO '{slug}' not found")
    
    # Check PDP
    await require_permission(
        action="DAO_MANAGE_TREASURY",
        resource={"type": "DAO", "id": dao.id},
        context={"operation": "update_balance"},
        actor=actor
    )
    
    # Apply delta
    try:
        item = await dao_repo.apply_treasury_delta(dao.id, data.token_symbol, data.delta)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Publish NATS event
    if nats_publisher:
        await nats_publisher.publish(
            "dao.event.treasury_updated",
            {
                "dao_id": dao.id,
                "slug": dao.slug,
                "token_symbol": data.token_symbol,
                "delta": str(data.delta),
                "new_balance": str(item.balance),
                "actor_id": actor.get("user_id"),
                "ts": datetime.now().isoformat()
            }
        )
    
    return item

# ============================================================================
# Helpers
# ============================================================================

def set_dao_repository(repo):
    """Set DAO repository (called from main.py)"""
    global dao_repo
    dao_repo = repo

def set_nats_publisher(publisher):
    """Set NATS publisher (called from main.py)"""
    global nats_publisher
    nats_publisher = publisher

