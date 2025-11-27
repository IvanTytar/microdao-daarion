from pydantic import BaseModel, Field
from typing import Literal, Optional, Dict, Any

class ToolDefinition(BaseModel):
    id: str = Field(..., description="Unique tool ID, e.g., 'projects.list'")
    name: str = Field(..., description="Human-readable tool name")
    description: str = Field(..., description="What this tool does")
    input_schema: Dict[str, Any] = Field(..., description="JSON Schema for input")
    output_schema: Dict[str, Any] = Field(..., description="JSON Schema for output")
    executor: Literal["http", "python"] = Field("http", description="Execution method")
    target: str = Field(..., description="HTTP URL or Python path")
    allowed_agents: Optional[list[str]] = Field(None, description="Allowlist of agent IDs. None = all agents")
    timeout: int = Field(30, ge=1, le=300, description="Timeout in seconds")
    enabled: bool = Field(True, description="Whether tool is enabled")

class ToolCallRequest(BaseModel):
    tool_id: str = Field(..., description="Tool ID to call")
    agent_id: str = Field(..., description="Agent making the call")
    microdao_id: str = Field(..., description="MicroDAO context")
    args: Dict[str, Any] = Field(default_factory=dict, description="Tool arguments")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional context")

class ToolCallResult(BaseModel):
    ok: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    tool_id: str
    latency_ms: Optional[float] = None





