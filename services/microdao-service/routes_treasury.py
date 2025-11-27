"""
MicroDAO Treasury Routes
Phase 7: Backend Completion
"""
from fastapi import APIRouter, HTTPException, Header
from typing import List, Optional
from decimal import Decimal
import httpx
import os
from datetime import datetime

from models import TreasuryItem, TreasuryUpdate
from repository_microdao import MicrodaoRepository

router = APIRouter(tags=["treasury"])

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
# Treasury — Read
# ============================================================================

@router.get("/microdao/{slug}/treasury", response_model=List[TreasuryItem])
async def get_treasury(
    slug: str,
    authorization: Optional[str] = Header(None)
):
    """
    Get treasury balances for a microDAO
    Requires: MICRODAO_READ_TREASURY permission
    """
    actor = await get_actor_from_token(authorization)
    
    # Get microDAO
    microdao = await repo.get_microdao_by_slug(slug)
    if not microdao:
        raise HTTPException(status_code=404, detail=f"MicroDAO '{slug}' not found")
    
    # Check PDP
    allowed = await check_pdp_permission(
        action="MICRODAO_READ_TREASURY",
        resource={"type": "MICRODAO", "id": microdao.id},
        context={},
        actor=actor
    )
    
    if not allowed:
        raise HTTPException(status_code=403, detail="Permission denied: cannot view treasury")
    
    return await repo.get_treasury_items(microdao.id)

# ============================================================================
# Treasury — Update (Delta)
# ============================================================================

@router.post("/microdao/{slug}/treasury", response_model=TreasuryItem)
async def update_treasury(
    slug: str,
    token_symbol: str,
    delta: Decimal,
    authorization: Optional[str] = Header(None)
):
    """
    Apply delta to treasury balance
    Requires: MICRODAO_MANAGE_TREASURY permission
    
    Query params:
    - token_symbol: Token to update (e.g., "DAARION", "USDT")
    - delta: Amount to add (positive) or subtract (negative)
    """
    actor = await get_actor_from_token(authorization)
    
    # Get microDAO
    microdao = await repo.get_microdao_by_slug(slug)
    if not microdao:
        raise HTTPException(status_code=404, detail=f"MicroDAO '{slug}' not found")
    
    # Check PDP
    allowed = await check_pdp_permission(
        action="MICRODAO_MANAGE_TREASURY",
        resource={"type": "MICRODAO", "id": microdao.id},
        context={"operation": "update_balance"},
        actor=actor
    )
    
    if not allowed:
        raise HTTPException(status_code=403, detail="Permission denied: cannot manage treasury")
    
    # Apply delta
    try:
        treasury_item = await repo.apply_treasury_delta(microdao.id, token_symbol, delta)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Publish NATS event
    if nats_publisher:
        await nats_publisher(
            "microdao.event.treasury_updated",
            {
                "microdao_id": microdao.id,
                "slug": microdao.slug,
                "token_symbol": token_symbol,
                "delta": str(delta),
                "new_balance": str(treasury_item.balance),
                "actor_id": actor.get("user_id"),
                "ts": datetime.now().isoformat()
            }
        )
    
    return treasury_item

# ============================================================================
# Treasury — Set Balance (Direct)
# ============================================================================

@router.put("/microdao/{slug}/treasury/{token_symbol}", response_model=TreasuryItem)
async def set_treasury_balance(
    slug: str,
    token_symbol: str,
    balance: Decimal,
    authorization: Optional[str] = Header(None)
):
    """
    Set treasury balance directly (admin operation)
    Requires: MICRODAO_MANAGE_TREASURY permission
    """
    actor = await get_actor_from_token(authorization)
    
    # Get microDAO
    microdao = await repo.get_microdao_by_slug(slug)
    if not microdao:
        raise HTTPException(status_code=404, detail=f"MicroDAO '{slug}' not found")
    
    # Check PDP
    allowed = await check_pdp_permission(
        action="MICRODAO_MANAGE_TREASURY",
        resource={"type": "MICRODAO", "id": microdao.id},
        context={"operation": "set_balance"},
        actor=actor
    )
    
    if not allowed:
        raise HTTPException(status_code=403, detail="Permission denied: cannot manage treasury")
    
    # Set balance
    try:
        treasury_item = await repo.set_treasury_balance(microdao.id, token_symbol, balance)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Publish NATS event
    if nats_publisher:
        await nats_publisher(
            "microdao.event.treasury_updated",
            {
                "microdao_id": microdao.id,
                "slug": microdao.slug,
                "token_symbol": token_symbol,
                "operation": "set_balance",
                "new_balance": str(treasury_item.balance),
                "actor_id": actor.get("user_id"),
                "ts": datetime.now().isoformat()
            }
        )
    
    return treasury_item

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

