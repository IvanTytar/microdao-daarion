"""
Agent CRUD Routes
Phase 6: Create, Read, Update, Delete agents
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from typing import List, Optional
import httpx

from models import AgentCreate, AgentUpdate, AgentRead, AgentBlueprint
from repository_agents import AgentRepository
from repository_events import EventRepository

router = APIRouter(prefix="/agents", tags=["agents"])

# Dependency injection (will be set in main.py)
agent_repo: Optional[AgentRepository] = None
event_repo: Optional[EventRepository] = None

# Service URLs (from env)
import os
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:7011")
PDP_SERVICE_URL = os.getenv("PDP_SERVICE_URL", "http://localhost:7012")

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
# Blueprints
# ============================================================================

@router.get("/blueprints", response_model=List[AgentBlueprint])
async def list_blueprints():
    """List all agent blueprints"""
    return await agent_repo.list_blueprints()

# ============================================================================
# CRUD — Create
# ============================================================================

@router.post("", response_model=AgentRead, status_code=201)
async def create_agent(
    data: AgentCreate,
    actor: dict = Depends(get_actor_from_token)
):
    """
    Create new agent
    Requires: MANAGE permission on AGENT:*
    """
    # Check PDP
    allowed = await check_pdp_permission(
        action="MANAGE",
        resource={"type": "AGENT", "id": "*"},
        context={"operation": "create", "kind": data.kind.value},
        actor=actor
    )
    
    if not allowed:
        raise HTTPException(status_code=403, detail="Permission denied: cannot create agent")
    
    # Create agent
    try:
        agent = await agent_repo.create_agent(
            data,
            actor_id=actor.get("actor_id")
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Log event
    await event_repo.log_event(
        agent.external_id,
        "created",
        payload={
            "name": agent.name,
            "kind": agent.kind.value,
            "blueprint_id": agent.blueprint_id,
            "created_by": actor.get("actor_id")
        }
    )
    
    return agent

# ============================================================================
# CRUD — Read
# ============================================================================

@router.get("", response_model=List[AgentRead])
async def list_agents(
    microdao_id: Optional[str] = None,
    kind: Optional[str] = None,
    is_active: bool = True
):
    """
    List agents with filters
    
    For now, no auth required (read-only)
    TODO: Filter by actor's microdao_ids in Phase 6.5
    """
    return await agent_repo.list_agents(
        microdao_id=microdao_id,
        kind=kind,
        is_active=is_active
    )

@router.get("/{agent_id}", response_model=AgentRead)
async def get_agent(agent_id: str):
    """
    Get agent by ID
    
    For now, no auth required (read-only)
    TODO: PDP check in Phase 6.5
    """
    agent = await agent_repo.get_agent_by_external_id(agent_id)
    
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    
    return agent

# ============================================================================
# CRUD — Update
# ============================================================================

@router.patch("/{agent_id}", response_model=AgentRead)
async def update_agent(
    agent_id: str,
    data: AgentUpdate,
    actor: dict = Depends(get_actor_from_token)
):
    """
    Update agent
    Requires: MANAGE permission on AGENT:{agent_id}
    """
    # Check agent exists
    existing = await agent_repo.get_agent_by_external_id(agent_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    
    # Check PDP
    allowed = await check_pdp_permission(
        action="MANAGE",
        resource={"type": "AGENT", "id": agent_id},
        context={"operation": "update"},
        actor=actor
    )
    
    if not allowed:
        raise HTTPException(status_code=403, detail="Permission denied: cannot update agent")
    
    # Update
    try:
        agent = await agent_repo.update_agent(agent_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Log event
    changed_fields = {k: v for k, v in data.dict(exclude_unset=True).items()}
    await event_repo.log_event(
        agent_id,
        "updated",
        payload={
            "changed_fields": changed_fields,
            "updated_by": actor.get("actor_id")
        }
    )
    
    return agent

# ============================================================================
# CRUD — Delete
# ============================================================================

@router.delete("/{agent_id}", status_code=204)
async def delete_agent(
    agent_id: str,
    actor: dict = Depends(get_actor_from_token)
):
    """
    Delete (deactivate) agent
    Requires: MANAGE permission on AGENT:{agent_id}
    """
    # Check agent exists
    existing = await agent_repo.get_agent_by_external_id(agent_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    
    # Check PDP
    allowed = await check_pdp_permission(
        action="MANAGE",
        resource={"type": "AGENT", "id": agent_id},
        context={"operation": "delete"},
        actor=actor
    )
    
    if not allowed:
        raise HTTPException(status_code=403, detail="Permission denied: cannot delete agent")
    
    # Soft delete
    try:
        await agent_repo.delete_agent(agent_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Log event
    await event_repo.log_event(
        agent_id,
        "deleted",
        payload={
            "deleted_by": actor.get("actor_id")
        }
    )
    
    return None

