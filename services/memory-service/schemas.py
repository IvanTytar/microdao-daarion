"""
Pydantic схеми для Memory Service API
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, field_validator, ConfigDict
from uuid import UUID


# ========== User Facts Schemas ==========

class UserFactBase(BaseModel):
    """Базова схема для user fact"""
    fact_key: str = Field(..., description="Ключ факту (наприклад: 'language', 'is_donor')")
    fact_value: Optional[str] = Field(None, description="Текстове значення")
    fact_value_json: Optional[Dict[str, Any]] = Field(None, description="JSON значення")
    team_id: Optional[str] = Field(None, description="ID команди (якщо факт командно-специфічний)")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Метадані")
    token_gated: bool = Field(False, description="Чи залежить факт від токенів")
    token_requirements: Optional[Dict[str, Any]] = Field(None, description="Вимоги до токенів")
    expires_at: Optional[datetime] = Field(None, description="Термін дії факту")


class UserFactCreate(UserFactBase):
    """Схема для створення/оновлення факту"""
    user_id: str = Field(..., description="ID користувача")


class UserFactUpdate(BaseModel):
    """Схема для часткового оновлення факту"""
    fact_value: Optional[str] = None
    fact_value_json: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    token_gated: Optional[bool] = None
    token_requirements: Optional[Dict[str, Any]] = None
    expires_at: Optional[datetime] = None


class UserFactResponse(UserFactBase):
    """Схема відповіді для user fact"""
    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class UserFactUpsertRequest(BaseModel):
    """Схема для upsert операції (створення або оновлення)"""
    user_id: str
    fact_key: str
    fact_value: Optional[str] = None
    fact_value_json: Optional[Dict[str, Any]] = None
    team_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    token_gated: bool = False
    token_requirements: Optional[Dict[str, Any]] = None
    expires_at: Optional[datetime] = None


class UserFactUpsertResponse(BaseModel):
    """Відповідь на upsert"""
    fact: UserFactResponse
    created: bool = Field(..., description="Чи був створений новий факт")


# ========== Dialog Summary Schemas ==========

class DialogSummaryBase(BaseModel):
    """Базова схема для dialog summary"""
    team_id: str
    channel_id: Optional[str] = None
    agent_id: Optional[str] = None
    user_id: Optional[str] = None
    period_start: datetime
    period_end: datetime
    summary_text: str
    summary_json: Optional[Dict[str, Any]] = None
    message_count: int = 0
    participant_count: int = 0
    topics: Optional[List[str]] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DialogSummaryCreate(DialogSummaryBase):
    """Схема для створення summary"""
    pass


class DialogSummaryResponse(DialogSummaryBase):
    """Схема відповіді для summary"""
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DialogSummaryListResponse(BaseModel):
    """Схема для списку summaries"""
    items: List[DialogSummaryResponse]
    total: int
    cursor: Optional[str] = None


# ========== Agent Memory Event Schemas ==========

class AgentMemoryEventBase(BaseModel):
    """Базова схема для memory event"""
    agent_id: str
    team_id: str
    channel_id: Optional[str] = None
    user_id: Optional[str] = None
    scope: str = Field(..., description="short_term | mid_term | long_term")
    kind: str = Field(..., description="message | fact | summary | note")
    body_text: Optional[str] = None
    body_json: Optional[Dict[str, Any]] = None

    @field_validator("scope")
    @classmethod
    def validate_scope(cls, v):
        if v not in ["short_term", "mid_term", "long_term"]:
            raise ValueError("scope must be one of: short_term, mid_term, long_term")
        return v

    @field_validator("kind")
    @classmethod
    def validate_kind(cls, v):
        if v not in ["message", "fact", "summary", "note"]:
            raise ValueError("kind must be one of: message, fact, summary, note")
        return v


class AgentMemoryEventCreate(AgentMemoryEventBase):
    """Схема для створення memory event"""
    pass


class AgentMemoryEventResponse(AgentMemoryEventBase):
    """Схема відповіді для memory event"""
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AgentMemoryEventListResponse(BaseModel):
    """Схема для списку memory events"""
    items: List[AgentMemoryEventResponse]
    total: int
    cursor: Optional[str] = None


# ========== Token Gate Integration ==========

class TokenGateCheck(BaseModel):
    """Перевірка токен-гейту для факту"""
    user_id: str
    fact_key: str
    token_requirements: Dict[str, Any]


class TokenGateCheckResponse(BaseModel):
    """Відповідь на перевірку токен-гейту"""
    allowed: bool
    reason: Optional[str] = None
    missing_requirements: Optional[Dict[str, Any]] = None

