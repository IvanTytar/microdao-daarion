"""
MicroDAO Service Models
Phase 7: microDAO Console (MVP)
"""
from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime
from decimal import Decimal

# ============================================================================
# MicroDAO Models
# ============================================================================

class MicrodaoBase(BaseModel):
    slug: str = Field(..., min_length=3, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None

class MicrodaoCreate(MicrodaoBase):
    pass

class MicrodaoUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None

class MicrodaoRead(MicrodaoBase):
    id: str
    external_id: str
    owner_user_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    member_count: int = 0
    agent_count: int = 0

# ============================================================================
# Member Models
# ============================================================================

class MemberRole(str):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    GUEST = "guest"

class MicrodaoMember(BaseModel):
    id: str
    microdao_id: str
    user_id: str
    role: str
    joined_at: datetime

class MemberAdd(BaseModel):
    user_id: str
    role: str = "member"

class MemberUpdateRole(BaseModel):
    role: str

# ============================================================================
# Treasury Models
# ============================================================================

class TreasuryItem(BaseModel):
    token_symbol: str
    balance: Decimal

class TreasuryUpdate(BaseModel):
    token_symbol: str
    balance: Decimal

# ============================================================================
# Settings Models
# ============================================================================

class SettingItem(BaseModel):
    key: str
    value: dict | str | int | float | bool

class SettingsUpdate(BaseModel):
    settings: dict[str, Any]

