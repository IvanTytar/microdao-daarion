from pydantic import BaseModel, Field
from typing import Literal, Optional, Dict, Any
from datetime import datetime
from uuid import UUID

class MemoryQueryRequest(BaseModel):
    agent_id: str = Field(..., description="Agent ID, e.g., agent:sofia")
    microdao_id: str = Field(..., description="MicroDAO ID")
    channel_id: Optional[str] = None
    query: str = Field(..., min_length=1, description="Query text for semantic search")
    limit: int = Field(5, ge=1, le=50, description="Max results to return")
    kind_filter: Optional[list[str]] = Field(None, description="Filter by memory kind")

class MemoryItem(BaseModel):
    id: str
    kind: Literal["conversation", "kb", "task", "dao-event", "channel-context"]
    score: float = Field(..., ge=0.0, le=1.0, description="Relevance score")
    content: str
    meta: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

class MemoryQueryResponse(BaseModel):
    items: list[MemoryItem]
    total: int
    query: str

class MemoryStoreRequest(BaseModel):
    agent_id: str
    microdao_id: str
    channel_id: Optional[str] = None
    kind: Literal["conversation", "kb", "task", "dao-event", "channel-context"]
    content: Dict[str, Any] = Field(..., description="Structured content to store")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class MemoryStoreResponse(BaseModel):
    ok: bool
    id: str

class MemorySummarizeRequest(BaseModel):
    agent_id: str
    microdao_id: str
    channel_id: Optional[str] = None
    limit: int = Field(10, ge=1, le=100, description="Number of recent items to summarize")

class MemorySummarizeResponse(BaseModel):
    summary: str
    items_processed: int




