"""
Agent Events Routes
Phase 6: Event history endpoint
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime

from models import AgentEvent
from repository_events import EventRepository

router = APIRouter(prefix="/agents", tags=["events"])

# Dependency injection
event_repo: Optional[EventRepository] = None

# ============================================================================
# Events
# ============================================================================

@router.get("/{agent_id}/events", response_model=List[AgentEvent])
async def list_agent_events(
    agent_id: str,
    limit: int = Query(50, ge=1, le=200),
    before_ts: Optional[datetime] = None
):
    """
    List events for agent
    
    Query params:
    - limit: max events to return (default 50, max 200)
    - before_ts: get events before this timestamp (for pagination)
    """
    events = await event_repo.list_events(
        agent_external_id=agent_id,
        limit=limit,
        before_ts=before_ts
    )
    
    return events

