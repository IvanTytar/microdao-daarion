"""
DAO Service Models
Phase 8: DAO Dashboard (Governance + Treasury + Voting)
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

# ============================================================================
# DAO Models
# ============================================================================

class DaoBase(BaseModel):
    slug: str = Field(..., min_length=3, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None

class DaoCreate(DaoBase):
    microdao_id: str
    governance_model: Optional[str] = "simple"
    voting_period_seconds: Optional[int] = 604800  # 7 days
    quorum_percent: Optional[int] = 20

class DaoUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    governance_model: Optional[str] = None
    voting_period_seconds: Optional[int] = None
    quorum_percent: Optional[int] = None
    is_active: Optional[bool] = None

class DaoRead(DaoBase):
    id: str
    microdao_id: str
    owner_user_id: str
    governance_model: str
    voting_period_seconds: int
    quorum_percent: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

# ============================================================================
# DAO Member Models
# ============================================================================

class DaoMember(BaseModel):
    id: str
    dao_id: str
    user_id: str
    role: str  # 'owner' | 'admin' | 'member' | 'guest'
    joined_at: datetime

class MemberAdd(BaseModel):
    user_id: str
    role: str = "member"

# ============================================================================
# Treasury Models
# ============================================================================

class DaoTreasuryItem(BaseModel):
    token_symbol: str
    contract_address: Optional[str] = None
    balance: Decimal

class TreasuryUpdate(BaseModel):
    token_symbol: str
    delta: Decimal  # positive or negative

class TreasurySet(BaseModel):
    token_symbol: str
    balance: Decimal

# ============================================================================
# Proposal Models
# ============================================================================

class ProposalBase(BaseModel):
    slug: str = Field(..., min_length=3, max_length=50)
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None

class ProposalCreate(ProposalBase):
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    governance_model_override: Optional[str] = None
    quorum_percent_override: Optional[int] = None

class ProposalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None

class ProposalRead(ProposalBase):
    id: str
    dao_id: str
    created_by_user_id: str
    created_at: datetime
    start_at: Optional[datetime]
    end_at: Optional[datetime]
    status: str  # 'draft' | 'active' | 'passed' | 'rejected' | 'executed'
    governance_model_override: Optional[str]
    quorum_percent_override: Optional[int]

class ProposalWithVotes(ProposalRead):
    """Proposal with voting statistics"""
    votes_yes: int = 0
    votes_no: int = 0
    votes_abstain: int = 0
    total_weight_yes: Decimal = Decimal('0')
    total_weight_no: Decimal = Decimal('0')
    total_weight_abstain: Decimal = Decimal('0')
    quorum_reached: bool = False
    is_passed: bool = False

# ============================================================================
# Vote Models
# ============================================================================

class VoteCreate(BaseModel):
    vote_value: str = Field(..., pattern="^(yes|no|abstain)$")

class VoteRead(BaseModel):
    id: str
    proposal_id: str
    voter_user_id: str
    vote_value: str  # 'yes' | 'no' | 'abstain'
    weight: Decimal
    raw_power: Optional[Decimal]
    created_at: datetime

# ============================================================================
# Role Models
# ============================================================================

class DaoRole(BaseModel):
    id: str
    dao_id: str
    code: str
    name: str
    description: Optional[str]
    created_at: datetime

class RoleCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None

class RoleAssignment(BaseModel):
    id: str
    dao_id: str
    user_id: str
    role_code: str
    assigned_at: datetime

class RoleAssignmentCreate(BaseModel):
    user_id: str
    role_code: str

# ============================================================================
# Audit Log Models
# ============================================================================

class AuditLogEntry(BaseModel):
    id: str
    dao_id: str
    actor_user_id: Optional[str]
    event_type: str
    event_payload: Optional[dict]
    created_at: datetime

# ============================================================================
# Overview Models (Aggregated)
# ============================================================================

class DaoOverview(BaseModel):
    dao: DaoRead
    members_count: int = 0
    active_proposals_count: int = 0
    total_proposals_count: int = 0
    treasury_items: List[DaoTreasuryItem] = []

class DaoStats(BaseModel):
    """Statistics for DAO"""
    members_count: int = 0
    proposals_count: int = 0
    active_proposals_count: int = 0
    total_votes_cast: int = 0
    treasury_value_usd: Optional[Decimal] = None

# ============================================================================
# Governance Result Models
# ============================================================================

class ProposalResult(BaseModel):
    """Final result of a proposal"""
    proposal_id: str
    status: str
    votes_yes: int
    votes_no: int
    votes_abstain: int
    total_weight_yes: Decimal
    total_weight_no: Decimal
    total_weight_abstain: Decimal
    total_eligible_voters: int
    quorum_required: Decimal
    quorum_reached: bool
    is_passed: bool
    winning_option: Optional[str]  # 'yes' | 'no' | None

# ============================================================================
# WebSocket Event Models
# ============================================================================

class DaoEvent(BaseModel):
    """Real-time DAO event for WebSocket"""
    event_type: str
    dao_id: str
    payload: dict
    timestamp: datetime

