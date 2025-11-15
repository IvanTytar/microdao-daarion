"""
DAGI Router Internal Models

Request/Response models for internal routing
"""

from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass
class RouterRequest:
    """
    Normalized request to DAGI Router.
    This is what the routing engine works with.
    """
    mode: Optional[str] = None
    agent: Optional[str] = None
    dao_id: Optional[str] = None
    source: Optional[str] = None
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    message: Optional[str] = None
    payload: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.payload is None:
            self.payload = {}


@dataclass
class RouterResponse:
    """Response from provider"""
    ok: bool
    provider_id: str
    data: Any = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}
