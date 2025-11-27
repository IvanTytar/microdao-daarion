"""
Agents Service Data Models
Phase 6: CRUD + DB Persistence + Events + Live WS
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# ============================================================================
# Agent Types
# ============================================================================

class AgentKind(str, Enum):
    ASSISTANT = "assistant"
    NODE = "node"
    SYSTEM = "system"
    GUARDIAN = "guardian"
    ANALYST = "analyst"
    QUEST = "quest"

class AgentStatus(str, Enum):
    ACTIVE = "active"
    IDLE = "idle"
    OFFLINE = "offline"
    ERROR = "error"

# ============================================================================
# Blueprint Models
# ============================================================================

class AgentBlueprint(BaseModel):
    """Agent blueprint/template"""
    id: str
    code: str
    name: str
    description: Optional[str] = None
    default_model: str = "gpt-4.1-mini"
    default_tools: List[str] = []
    default_system_prompt: Optional[str] = None
    created_at: datetime

# ============================================================================
# Agent CRUD Models (Phase 6)
# ============================================================================

class AgentCreate(BaseModel):
    """Create new agent"""
    name: str = Field(..., min_length=1, max_length=100)
    kind: AgentKind
    description: Optional[str] = None
    microdao_id: Optional[str] = None
    owner_user_id: Optional[str] = None
    blueprint_code: str = Field(..., description="Blueprint code like sofia_prime")
    model: Optional[str] = None  # If None, use blueprint default
    tools_enabled: List[str] = []
    system_prompt: Optional[str] = None
    avatar_url: Optional[str] = None

class AgentUpdate(BaseModel):
    """Update agent"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    model: Optional[str] = None
    tools_enabled: Optional[List[str]] = None
    system_prompt: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None

class AgentRead(BaseModel):
    """Agent read response (from DB)"""
    id: str
    external_id: str
    name: str
    kind: AgentKind
    description: Optional[str] = None
    microdao_id: Optional[str] = None
    owner_user_id: Optional[str] = None
    blueprint_id: Optional[str] = None
    model: str
    tools_enabled: List[str] = []
    system_prompt: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

# ============================================================================
# Agent Models (Legacy — keep for compatibility)
# ============================================================================

class AgentBase(BaseModel):
    """Base agent information"""
    id: str
    name: str
    kind: AgentKind
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    status: AgentStatus = AgentStatus.IDLE

class AgentDetail(AgentBase):
    """Full agent details"""
    model: str = "gpt-4.1-mini"
    owner_user_id: str
    microdao_id: str
    tools: List[str] = []
    system_prompt: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_active_at: Optional[datetime] = None

class AgentListItem(AgentBase):
    """Agent list item (for gallery)"""
    model: str
    microdao_id: str
    last_active_at: Optional[datetime] = None

# ============================================================================
# Metrics Models
# ============================================================================

class AgentMetrics(BaseModel):
    """Agent usage metrics"""
    agent_id: str
    period_hours: int = 24
    
    # LLM stats
    llm_calls_total: int = 0
    llm_tokens_total: int = 0
    llm_latency_avg_ms: float = 0.0
    
    # Tool stats
    tool_calls_total: int = 0
    tool_success_rate: float = 0.0
    
    # Agent stats
    invocations_total: int = 0
    messages_sent: int = 0
    
    # Errors
    errors_count: int = 0

class AgentMetricsSeries(BaseModel):
    """Time-series metrics for charts"""
    timestamps: List[str]
    tokens: List[int]
    latency: List[float]
    tool_calls: List[int]

# ============================================================================
# Context Models (Memory)
# ============================================================================

class MemoryItem(BaseModel):
    """Single memory item"""
    id: str
    type: str  # "short_term", "mid_term", "knowledge"
    content: str
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None

class AgentContext(BaseModel):
    """Agent memory context"""
    agent_id: str
    short_term: List[MemoryItem] = []
    mid_term: List[MemoryItem] = []
    knowledge_items: List[MemoryItem] = []

# ============================================================================
# Events Models (Phase 6 — extended)
# ============================================================================

class EventKind(str, Enum):
    # Lifecycle
    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"
    ACTIVATED = "activated"
    DEACTIVATED = "deactivated"
    
    # Activity
    INVOCATION = "invocation"
    REPLY_SENT = "reply_sent"
    TOOL_CALL = "tool_call"
    
    # Changes
    MODEL_CHANGED = "model_changed"
    TOOLS_CHANGED = "tools_changed"
    PROMPT_CHANGED = "prompt_changed"
    
    # Errors
    ERROR = "error"
    LLM_ERROR = "llm_error"
    TOOL_ERROR = "tool_error"

class AgentEvent(BaseModel):
    """Agent activity event"""
    id: str
    agent_id: str
    kind: EventKind
    ts: datetime
    channel_id: Optional[str] = None
    tool_id: Optional[str] = None
    content: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None

class AgentEventCreate(BaseModel):
    """Create event payload"""
    agent_id: str
    kind: EventKind
    channel_id: Optional[str] = None
    tool_id: Optional[str] = None
    content: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None

# ============================================================================
# Settings Models
# ============================================================================

class ModelSettings(BaseModel):
    """LLM model settings"""
    model: str = Field(..., description="Model name (e.g., gpt-4.1-mini)")

class ToolsSettings(BaseModel):
    """Tools configuration"""
    tools_enabled: List[str] = Field(..., description="List of enabled tool IDs")

class SystemPromptSettings(BaseModel):
    """System prompt configuration"""
    system_prompt: str = Field(..., max_length=10000)

# ============================================================================
# WebSocket Models
# ============================================================================

class WSAgentEvent(BaseModel):
    """WebSocket event message"""
    type: str = "agent_event"
    agent_id: str
    ts: str
    kind: str
    payload: Optional[Dict[str, Any]] = None

class WSSubscribe(BaseModel):
    """WebSocket subscribe message"""
    type: str = "subscribe"
    agent_id: Optional[str] = None  # None = subscribe to all

class WSUnsubscribe(BaseModel):
    """WebSocket unsubscribe message"""
    type: str = "unsubscribe"
    agent_id: Optional[str] = None

# ============================================================================
# Request/Response Models (Legacy — keep for compatibility)
# ============================================================================

class AgentCreateRequest(BaseModel):
    """Legacy create request"""
    name: str = Field(..., min_length=1, max_length=100)
    kind: AgentKind
    description: Optional[str] = None
    model: str = "gpt-4.1-mini"
    microdao_id: str
    tools: List[str] = []
    system_prompt: Optional[str] = None

class AgentUpdateRequest(BaseModel):
    """Legacy update request"""
    name: Optional[str] = None
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    status: Optional[AgentStatus] = None
