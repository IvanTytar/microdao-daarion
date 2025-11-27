"""
Proposal & Voting Routes
Phase 8: DAO Dashboard
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
from decimal import Decimal

from models import (
    ProposalCreate, ProposalUpdate, ProposalRead, ProposalWithVotes,
    VoteCreate, VoteRead
)
from auth_client import get_actor_from_token
from pdp_client import require_permission

router = APIRouter(prefix="/dao", tags=["proposals"])

# Repositories (will be injected)
dao_repo = None
proposal_repo = None
vote_repo = None
governance_engine = None
nats_publisher = None

# ============================================================================
# Proposals
# ============================================================================

@router.get("/{slug}/proposals", response_model=List[ProposalRead])
async def list_proposals(
    slug: str,
    status: str = None,
    actor: dict = Depends(get_actor_from_token)
):
    """List proposals for a DAO"""
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
    
    return await proposal_repo.list_proposals(dao.id, status)

@router.post("/{slug}/proposals", response_model=ProposalRead, status_code=201)
async def create_proposal(
    slug: str,
    data: ProposalCreate,
    actor: dict = Depends(get_actor_from_token)
):
    """Create new proposal"""
    dao = await dao_repo.get_dao_by_slug(slug)
    if not dao:
        raise HTTPException(status_code=404, detail=f"DAO '{slug}' not found")
    
    user_id = actor.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid actor identity")
    
    # Check PDP
    await require_permission(
        action="DAO_PROPOSAL_CREATE",
        resource={"type": "DAO", "id": dao.id},
        context={"operation": "create_proposal"},
        actor=actor
    )
    
    # Check if slug already exists
    existing = await proposal_repo.get_proposal_by_slug(dao.id, data.slug)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Proposal with slug '{data.slug}' already exists in this DAO"
        )
    
    # Create proposal
    proposal = await proposal_repo.create_proposal(dao.id, user_id, data)
    
    # Publish NATS event
    if nats_publisher:
        await nats_publisher.publish(
            "dao.event.proposal_created",
            {
                "dao_id": dao.id,
                "proposal_id": proposal.id,
                "slug": proposal.slug,
                "title": proposal.title,
                "created_by_user_id": user_id,
                "status": proposal.status,
                "ts": proposal.created_at.isoformat()
            }
        )
    
    return proposal

@router.get("/{slug}/proposals/{proposal_slug}", response_model=ProposalWithVotes)
async def get_proposal(
    slug: str,
    proposal_slug: str,
    actor: dict = Depends(get_actor_from_token)
):
    """Get proposal details with voting stats"""
    dao = await dao_repo.get_dao_by_slug(slug)
    if not dao:
        raise HTTPException(status_code=404, detail=f"DAO '{slug}' not found")
    
    proposal = await proposal_repo.get_proposal_by_slug(dao.id, proposal_slug)
    if not proposal:
        raise HTTPException(status_code=404, detail=f"Proposal '{proposal_slug}' not found")
    
    # Check PDP
    await require_permission(
        action="DAO_READ",
        resource={"type": "DAO", "id": dao.id},
        context={},
        actor=actor
    )
    
    # Get proposal with votes
    proposal_with_votes = await proposal_repo.get_proposal_with_votes(proposal.id)
    return proposal_with_votes

@router.post("/{slug}/proposals/{proposal_slug}/activate", response_model=ProposalRead)
async def activate_proposal(
    slug: str,
    proposal_slug: str,
    actor: dict = Depends(get_actor_from_token)
):
    """Activate proposal (start voting)"""
    dao = await dao_repo.get_dao_by_slug(slug)
    if not dao:
        raise HTTPException(status_code=404, detail=f"DAO '{slug}' not found")
    
    proposal = await proposal_repo.get_proposal_by_slug(dao.id, proposal_slug)
    if not proposal:
        raise HTTPException(status_code=404, detail=f"Proposal '{proposal_slug}' not found")
    
    # Check PDP
    await require_permission(
        action="DAO_PROPOSAL_MANAGE",
        resource={"type": "DAO", "id": dao.id},
        context={"operation": "activate_proposal"},
        actor=actor
    )
    
    if proposal.status != "draft":
        raise HTTPException(
            status_code=400,
            detail=f"Proposal must be in 'draft' status to activate (current: {proposal.status})"
        )
    
    # Activate
    updated = await proposal_repo.update_proposal_status(proposal.id, "active")
    
    # Publish NATS event
    if nats_publisher:
        await nats_publisher.publish(
            "dao.event.proposal_activated",
            {
                "dao_id": dao.id,
                "proposal_id": proposal.id,
                "slug": proposal.slug,
                "actor_id": actor.get("user_id"),
                "ts": datetime.now().isoformat()
            }
        )
    
    return updated

@router.post("/{slug}/proposals/{proposal_slug}/close", response_model=ProposalWithVotes)
async def close_proposal(
    slug: str,
    proposal_slug: str,
    actor: dict = Depends(get_actor_from_token)
):
    """Close proposal and evaluate result"""
    dao = await dao_repo.get_dao_by_slug(slug)
    if not dao:
        raise HTTPException(status_code=404, detail=f"DAO '{slug}' not found")
    
    proposal = await proposal_repo.get_proposal_by_slug(dao.id, proposal_slug)
    if not proposal:
        raise HTTPException(status_code=404, detail=f"Proposal '{proposal_slug}' not found")
    
    # Check PDP
    await require_permission(
        action="DAO_PROPOSAL_MANAGE",
        resource={"type": "DAO", "id": dao.id},
        context={"operation": "close_proposal"},
        actor=actor
    )
    
    if proposal.status != "active":
        raise HTTPException(
            status_code=400,
            detail=f"Proposal must be 'active' to close (current: {proposal.status})"
        )
    
    # Get all votes
    votes = await vote_repo.list_votes_for_proposal(proposal.id)
    
    # Get total eligible voters
    members = await dao_repo.list_members(dao.id)
    total_eligible = len([m for m in members if m.role in ["owner", "admin", "member"]])
    
    # Evaluate proposal
    result = await governance_engine.evaluate_proposal(dao, proposal, votes, total_eligible)
    
    # Update status
    updated = await proposal_repo.update_proposal_status(proposal.id, result.status)
    
    # Publish NATS event
    if nats_publisher:
        await nats_publisher.publish(
            "dao.event.proposal_closed",
            {
                "dao_id": dao.id,
                "proposal_id": proposal.id,
                "slug": proposal.slug,
                "final_status": result.status,
                "is_passed": result.is_passed,
                "quorum_reached": result.quorum_reached,
                "actor_id": actor.get("user_id"),
                "ts": datetime.now().isoformat()
            }
        )
    
    # Return with votes
    return await proposal_repo.get_proposal_with_votes(proposal.id)

# ============================================================================
# Voting
# ============================================================================

@router.get("/{slug}/proposals/{proposal_slug}/votes", response_model=List[VoteRead])
async def list_votes(
    slug: str,
    proposal_slug: str,
    actor: dict = Depends(get_actor_from_token)
):
    """List all votes for a proposal"""
    dao = await dao_repo.get_dao_by_slug(slug)
    if not dao:
        raise HTTPException(status_code=404, detail=f"DAO '{slug}' not found")
    
    proposal = await proposal_repo.get_proposal_by_slug(dao.id, proposal_slug)
    if not proposal:
        raise HTTPException(status_code=404, detail=f"Proposal '{proposal_slug}' not found")
    
    # Check PDP
    await require_permission(
        action="DAO_READ",
        resource={"type": "DAO", "id": dao.id},
        context={},
        actor=actor
    )
    
    return await vote_repo.list_votes_for_proposal(proposal.id)

@router.post("/{slug}/proposals/{proposal_slug}/votes", response_model=VoteRead)
async def cast_vote(
    slug: str,
    proposal_slug: str,
    data: VoteCreate,
    actor: dict = Depends(get_actor_from_token)
):
    """Cast vote on a proposal"""
    dao = await dao_repo.get_dao_by_slug(slug)
    if not dao:
        raise HTTPException(status_code=404, detail=f"DAO '{slug}' not found")
    
    proposal = await proposal_repo.get_proposal_by_slug(dao.id, proposal_slug)
    if not proposal:
        raise HTTPException(status_code=404, detail=f"Proposal '{proposal_slug}' not found")
    
    user_id = actor.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid actor identity")
    
    # Check PDP
    await require_permission(
        action="DAO_VOTE",
        resource={"type": "DAO", "id": dao.id},
        context={"operation": "cast_vote"},
        actor=actor
    )
    
    # Check if proposal is active
    if proposal.status != "active":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot vote on proposal with status '{proposal.status}'"
        )
    
    # Check if voting period has ended
    if proposal.end_at and datetime.now() > proposal.end_at:
        raise HTTPException(status_code=400, detail="Voting period has ended")
    
    # Calculate voting power
    voting_power = await governance_engine.calculate_voting_power(
        user_id,
        dao,
        Decimal('1')  # For MVP, base power is 1
    )
    
    # Cast vote
    vote = await vote_repo.create_or_update_vote(
        proposal.id,
        user_id,
        data.vote_value,
        voting_power,
        Decimal('1')  # raw power
    )
    
    # Publish NATS event
    if nats_publisher:
        await nats_publisher.publish(
            "dao.event.vote_cast",
            {
                "dao_id": dao.id,
                "proposal_id": proposal.id,
                "vote_id": vote.id,
                "voter_user_id": user_id,
                "vote_value": data.vote_value,
                "weight": str(voting_power),
                "ts": vote.created_at.isoformat()
            }
        )
    
    return vote

# ============================================================================
# Helpers
# ============================================================================

def set_dao_repository(repo):
    """Set DAO repository"""
    global dao_repo
    dao_repo = repo

def set_proposal_repository(repo):
    """Set proposal repository"""
    global proposal_repo
    proposal_repo = repo

def set_vote_repository(repo):
    """Set vote repository"""
    global vote_repo
    vote_repo = repo

def set_governance_engine(engine):
    """Set governance engine"""
    global governance_engine
    governance_engine = engine

def set_nats_publisher(publisher):
    """Set NATS publisher"""
    global nats_publisher
    nats_publisher = publisher

