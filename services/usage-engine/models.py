"""
Usage Engine Data Models
Tracks LLM calls, tool executions, agent invocations
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum

class UsageEventType(str, Enum):
    LLM_CALL = "llm_call"
    TOOL_CALL = "tool_call"
    AGENT_INVOCATION = "agent_invocation"
    MESSAGE_SENT = "message_sent"

class ActorType(str, Enum):
    HUMAN = "human"
    AGENT = "agent"
    SERVICE = "service"

# ============================================================================
# Usage Events (inbound from NATS)
# ============================================================================

class LlmUsageEvent(BaseModel):
    """LLM call usage event from llm-proxy"""
    event_id: str
    timestamp: datetime
    actor_id: str
    actor_type: ActorType
    agent_id: Optional[str] = None
    microdao_id: Optional[str] = None
    model: str
    provider: str  # "openai", "deepseek", "local"
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    latency_ms: int
    success: bool = True
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class ToolUsageEvent(BaseModel):
    """Tool execution usage event from toolcore"""
    event_id: str
    timestamp: datetime
    actor_id: str
    actor_type: ActorType
    agent_id: Optional[str] = None
    microdao_id: Optional[str] = None
    tool_id: str
    tool_name: str
    success: bool
    latency_ms: int
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class AgentInvocationEvent(BaseModel):
    """Agent invocation usage event from agent-runtime"""
    event_id: str
    timestamp: datetime
    agent_id: str
    microdao_id: Optional[str] = None
    channel_id: Optional[str] = None
    trigger: str  # "message", "scheduled", "manual"
    duration_ms: int
    llm_calls: int = 0
    tool_calls: int = 0
    success: bool = True
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class MessageUsageEvent(BaseModel):
    """Message sent usage event from messaging-service"""
    event_id: str
    timestamp: datetime
    actor_id: str
    actor_type: ActorType
    microdao_id: str
    channel_id: str
    message_length: int
    metadata: Optional[Dict[str, Any]] = None

# ============================================================================
# Aggregated Usage Reports (outbound API)
# ============================================================================

class UsageSummary(BaseModel):
    """Aggregated usage summary"""
    period_start: datetime
    period_end: datetime
    microdao_id: Optional[str] = None
    agent_id: Optional[str] = None
    
    # LLM stats
    llm_calls_total: int = 0
    llm_tokens_total: int = 0
    llm_tokens_prompt: int = 0
    llm_tokens_completion: int = 0
    llm_latency_avg_ms: float = 0.0
    
    # Tool stats
    tool_calls_total: int = 0
    tool_calls_success: int = 0
    tool_calls_failed: int = 0
    tool_latency_avg_ms: float = 0.0
    
    # Agent stats
    agent_invocations_total: int = 0
    agent_invocations_success: int = 0
    agent_invocations_failed: int = 0
    
    # Message stats
    messages_sent: int = 0
    messages_total_length: int = 0

class ModelUsage(BaseModel):
    """Usage by model"""
    model: str
    provider: str
    calls: int
    tokens: int
    avg_latency_ms: float

class AgentUsage(BaseModel):
    """Usage by agent"""
    agent_id: str
    invocations: int
    llm_calls: int
    tool_calls: int
    messages_sent: int
    total_tokens: int

class ToolUsage(BaseModel):
    """Usage by tool"""
    tool_id: str
    tool_name: str
    calls: int
    success_rate: float
    avg_latency_ms: float

# ============================================================================
# API Request/Response Models
# ============================================================================

class UsageQueryRequest(BaseModel):
    """Request for usage summary"""
    microdao_id: Optional[str] = None
    agent_id: Optional[str] = None
    period_hours: int = Field(24, ge=1, le=720)  # 1h - 30 days

class UsageQueryResponse(BaseModel):
    """Response for usage summary"""
    summary: UsageSummary
    models: list[ModelUsage] = []
    agents: list[AgentUsage] = []
    tools: list[ToolUsage] = []




