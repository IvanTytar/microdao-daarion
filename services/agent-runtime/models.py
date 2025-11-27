from pydantic import BaseModel
from typing import Literal, Optional, Dict, Any
from datetime import datetime

class AgentInvocation(BaseModel):
    agent_id: str
    entrypoint: Literal["channel_message", "direct", "cron"] = "channel_message"
    payload: Dict[str, Any]

class AgentBlueprint(BaseModel):
    id: str
    name: str
    model: str
    instructions: str
    capabilities: Dict[str, Any] = {}
    tools: list[str] = []

class ChannelMessage(BaseModel):
    sender_id: str
    sender_type: Literal["human", "agent"]
    content: str
    created_at: datetime

class LLMRequest(BaseModel):
    model: str
    messages: list[Dict[str, str]]
    max_tokens: int = 1000
    temperature: float = 0.7

class LLMResponse(BaseModel):
    content: str
    model: str
    usage: Optional[Dict[str, int]] = None




