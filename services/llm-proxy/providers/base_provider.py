from abc import ABC, abstractmethod
from typing import Protocol
from models import ChatMessage, LLMResponse

class BaseProvider(Protocol):
    """Base protocol for LLM providers"""
    
    @abstractmethod
    async def chat(
        self,
        messages: list[ChatMessage],
        model_name: str,
        max_tokens: int | None = None,
        temperature: float = 0.7,
        top_p: float = 1.0,
        **kwargs
    ) -> LLMResponse:
        """
        Send chat completion request to LLM provider
        
        Args:
            messages: List of chat messages
            model_name: Physical model name for this provider
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            top_p: Nucleus sampling parameter
            **kwargs: Provider-specific parameters
        
        Returns:
            LLMResponse with content, usage, and metadata
        """
        ...





