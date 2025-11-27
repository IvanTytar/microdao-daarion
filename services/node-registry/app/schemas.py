"""
Pydantic schemas for request/response validation
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, validator


class NodeBase(BaseModel):
    """Base node schema"""
    node_id: str = Field(..., description="Unique node identifier")
    node_name: str = Field(..., description="Human-readable node name")
    node_role: str = Field(..., description="Node role: production, development, backup")
    node_type: str = Field(..., description="Node type: router, gateway, worker")
    ip_address: Optional[str] = Field(None, description="Public IP address")
    local_ip: Optional[str] = Field(None, description="Local network IP")
    hostname: Optional[str] = Field(None, description="Hostname")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")


class NodeRegister(BaseModel):
    """Schema for node registration"""
    node_name: Optional[str] = Field(None, description="Node name (auto-generated if not provided)")
    node_role: str = Field(default="worker", description="Node role")
    node_type: str = Field(default="worker", description="Node type")
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    local_ip: Optional[str] = None
    capabilities: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Node capabilities")
    
    @validator('node_role')
    def validate_role(cls, v):
        allowed_roles = ['production', 'development', 'backup', 'worker']
        if v not in allowed_roles:
            raise ValueError(f'Role must be one of: {allowed_roles}')
        return v
    
    @validator('node_type')
    def validate_type(cls, v):
        allowed_types = ['router', 'gateway', 'worker', 'orchestrator']
        if v not in allowed_types:
            raise ValueError(f'Type must be one of: {allowed_types}')
        return v


class NodeResponse(BaseModel):
    """Schema for node response"""
    id: str
    node_id: str
    node_name: str
    node_role: str
    node_type: str
    ip_address: Optional[str]
    local_ip: Optional[str]
    hostname: Optional[str]
    status: str
    last_heartbeat: Optional[datetime]
    registered_at: datetime
    updated_at: datetime
    metadata: Dict[str, Any]
    
    class Config:
        orm_mode = True


class NodeListResponse(BaseModel):
    """Schema for list of nodes"""
    nodes: List[NodeResponse]
    total: int


class HeartbeatRequest(BaseModel):
    """Schema for heartbeat request"""
    node_id: str = Field(..., description="Node identifier")
    status: Optional[str] = Field("online", description="Node status")
    metrics: Optional[Dict[str, Any]] = Field(default_factory=dict, description="System metrics")


class HeartbeatResponse(BaseModel):
    """Schema for heartbeat response"""
    success: bool
    node_id: str
    timestamp: datetime
    message: str


class NodeDiscoveryQuery(BaseModel):
    """Schema for node discovery query"""
    role: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = "online"
    capability: Optional[str] = None
    labels: Optional[List[str]] = None


class NodeDiscoveryResponse(BaseModel):
    """Schema for node discovery response"""
    nodes: List[NodeResponse]
    query: NodeDiscoveryQuery
    total: int

