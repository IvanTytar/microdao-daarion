"""
Pydantic Models для Second Me Service
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# =============================================================================
# Second Me Session
# =============================================================================

class SecondMeSession(BaseModel):
    id: str
    user_id: str
    agent_id: Optional[str] = None
    created_at: datetime
    last_interaction_at: Optional[datetime] = None


# =============================================================================
# Second Me Message
# =============================================================================

class SecondMeMessageBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)


class SecondMeMessageCreate(SecondMeMessageBase):
    role: str = Field(..., pattern="^(user|assistant)$")


class SecondMeMessageRead(SecondMeMessageBase):
    id: str
    session_id: str
    user_id: str
    role: str
    tokens_used: Optional[int] = None
    latency_ms: Optional[int] = None
    created_at: datetime


# =============================================================================
# Second Me Invoke
# =============================================================================

class SecondMeInvokePayload(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=5000)


class SecondMeInvokeResponse(BaseModel):
    response: str
    tokens_used: int
    latency_ms: int
    history: List[dict] = []


# =============================================================================
# Second Me Profile
# =============================================================================

class SecondMeProfile(BaseModel):
    user_id: str
    agent_id: str
    total_interactions: int
    last_interaction: Optional[datetime] = None

