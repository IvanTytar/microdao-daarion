from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime

class MessageCreatedEvent(BaseModel):
    channel_id: str
    message_id: Optional[str] = None
    matrix_event_id: str
    sender_id: str
    sender_type: Literal["human", "agent"]
    microdao_id: str
    created_at: datetime

class FilterDecision(BaseModel):
    channel_id: str
    message_id: Optional[str] = None
    matrix_event_id: str
    microdao_id: str
    decision: Literal["allow", "deny", "modify"]
    target_agent_id: Optional[str] = None
    rewrite_prompt: Optional[str] = None

class ChannelContext(BaseModel):
    microdao_id: str
    visibility: Literal["public", "private", "microdao"]
    allowed_agents: list[str] = []
    disabled_agents: list[str] = []

class FilterContext(BaseModel):
    channel: ChannelContext
    sender_is_owner: bool = False
    sender_is_admin: bool = False
    sender_is_member: bool = True
    local_time: Optional[datetime] = None




