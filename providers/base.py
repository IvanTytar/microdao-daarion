"""
Base Provider Interface
"""

from abc import ABC, abstractmethod
from router_models import RouterRequest, RouterResponse


class Provider(ABC):
    """Base class for all providers"""
    
    def __init__(self, provider_id: str):
        self.id = provider_id
    
    @abstractmethod
    async def call(self, req: RouterRequest) -> RouterResponse:
        """Execute request and return response"""
        pass
    
    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(id='{self.id}')"
