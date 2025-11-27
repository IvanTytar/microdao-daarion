from pydantic import BaseModel, Field
from typing import Literal, Optional, Dict, Any
from datetime import datetime

class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str

class LLMRequest(BaseModel):
    model: str = Field(..., description="Logical model name (e.g., gpt-4.1-mini)")
    messages: list[ChatMessage]
    max_tokens: Optional[int] = Field(None, ge=1, le=32000)
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0)
    top_p: Optional[float] = Field(1.0, ge=0.0, le=1.0)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="agent_id, microdao_id, channel_id")

class Usage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int

class LLMResponse(BaseModel):
    content: str
    usage: Usage
    provider: str
    model_resolved: str
    latency_ms: Optional[float] = None
    cached: bool = False

class ProviderConfig(BaseModel):
    name: str
    base_url: str
    api_key: Optional[str] = None
    timeout: int = 30
    max_retries: int = 2

class ModelConfig(BaseModel):
    logical_name: str
    provider: str
    physical_name: str
    max_tokens: Optional[int] = None
    cost_per_1k_prompt: Optional[float] = None
    cost_per_1k_completion: Optional[float] = None

class UsageLog(BaseModel):
    timestamp: datetime
    agent_id: Optional[str]
    microdao_id: Optional[str]
    channel_id: Optional[str]
    model: str
    provider: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    latency_ms: float
    success: bool
    error: Optional[str] = None





