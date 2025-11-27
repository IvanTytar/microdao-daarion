from pydantic import BaseModel, Field
from typing import Literal, Optional, Dict, Any
from enum import Enum

# Import ActorIdentity from auth-service (or redefine)
class ActorType(str, Enum):
    HUMAN = "human"
    AGENT = "agent"
    SERVICE = "service"

class ActorIdentity(BaseModel):
    actor_id: str
    actor_type: ActorType
    microdao_ids: list[str] = []
    roles: list[str] = []

class Action(str, Enum):
    READ = "read"
    WRITE = "write"
    MANAGE = "manage"
    INVITE = "invite"
    SEND_MESSAGE = "send_message"
    EXEC_TOOL = "exec_tool"
    VIEW_USAGE = "view_usage"
    ADMIN = "admin"

class ResourceType(str, Enum):
    MICRODAO = "microdao"
    CHANNEL = "channel"
    MESSAGE = "message"
    AGENT = "agent"
    TOOL = "tool"
    PROJECT = "project"
    USAGE = "usage"

class ResourceRef(BaseModel):
    type: ResourceType
    id: str
    
    class Config:
        use_enum_values = True

class PolicyRequest(BaseModel):
    actor: ActorIdentity
    action: Action
    resource: ResourceRef
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional context")

class PolicyDecision(BaseModel):
    effect: Literal["permit", "deny"]
    reason: Optional[str] = None
    obligations: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional obligations")
    
    class Config:
        use_enum_values = True




