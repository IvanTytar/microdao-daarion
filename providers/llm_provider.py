"""
LLM Provider - supports OpenAI-compatible APIs (Ollama, DeepSeek, etc)
"""

import logging
from typing import Dict, Optional

import httpx

from router_models import RouterRequest, RouterResponse
from .base import Provider

logger = logging.getLogger(__name__)


class LLMProvider(Provider):
    """
    LLM Provider using OpenAI-compatible API
    Works with Ollama, DeepSeek, OpenAI, and other compatible services
    """
    
    def __init__(
        self,
        provider_id: str,
        base_url: str,
        model: str,
        api_key: Optional[str] = None,
        timeout_s: int = 60,
        max_tokens: int = 1024,
        temperature: float = 0.2,
        provider_type: str = "openai",  # "openai" or "ollama"
    ):
        super().__init__(provider_id)
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.api_key = api_key
        self.timeout_s = timeout_s
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.provider_type = provider_type
    
    async def call(self, req: RouterRequest) -> RouterResponse:
        """Call LLM API"""
        
        # Extract message from request
        message = req.message or req.payload.get("message", "")
        if not message:
            return RouterResponse(
                ok=False,
                provider_id=self.id,
                error="No message provided"
            )
        
        # Build system prompt if agent specified
        system_prompt = self._get_system_prompt(req)
        
        # Prepare messages
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": message})
        
        # Prepare headers
        headers: Dict[str, str] = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        # Determine endpoint and body based on provider type
        if self.provider_type == "ollama" or "ollama" in self.base_url.lower():
            # Ollama uses /v1/chat/completions or /api/chat
            endpoint = f"{self.base_url}/v1/chat/completions"
            body = {
                "model": self.model,
                "messages": messages,
                "stream": False,
            }
        else:
            # Standard OpenAI-compatible
            endpoint = f"{self.base_url}/chat/completions"
            body = {
                "model": self.model,
                "messages": messages,
                "temperature": self.temperature,
                "max_tokens": self.max_tokens,
            }
        
        # Make request
        try:
            async with httpx.AsyncClient(timeout=self.timeout_s) as client:
                logger.info(f"[{self.id}] Calling {endpoint} with model {self.model}")
                
                response = await client.post(
                    endpoint,
                    json=body,
                    headers=headers,
                )
                response.raise_for_status()
                
        except httpx.TimeoutException:
            logger.error(f"[{self.id}] Request timeout after {self.timeout_s}s")
            return RouterResponse(
                ok=False,
                provider_id=self.id,
                error=f"Request timeout after {self.timeout_s}s"
            )
        except httpx.HTTPStatusError as e:
            logger.error(f"[{self.id}] HTTP error: {e}")
            error_detail = e.response.text[:200] if e.response.text else str(e)
            return RouterResponse(
                ok=False,
                provider_id=self.id,
                error=f"HTTP {e.response.status_code}: {error_detail}"
            )
        except Exception as e:
            logger.error(f"[{self.id}] Unexpected error: {e}")
            return RouterResponse(
                ok=False,
                provider_id=self.id,
                error=f"Provider error: {str(e)}"
            )
        
        # Parse response
        try:
            data = response.json()
            content = (
                data.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
            )
            
            usage = data.get("usage", {})
            
            logger.info(f"[{self.id}] Success. Tokens: {usage.get('total_tokens', 'unknown')}")
            
            return RouterResponse(
                ok=True,
                provider_id=self.id,
                data={
                    "text": content,
                    "model": self.model,
                    "usage": usage,
                },
                metadata={
                    "provider_type": "llm",
                    "model": self.model,
                    "base_url": self.base_url,
                }
            )
            
        except Exception as e:
            logger.error(f"[{self.id}] Failed to parse response: {e}")
            return RouterResponse(
                ok=False,
                provider_id=self.id,
                error=f"Failed to parse LLM response: {str(e)}"
            )
    
    def _get_system_prompt(self, req: RouterRequest) -> Optional[str]:
        """Get system prompt based on agent or context"""
        # 1. Check if context.system_prompt provided (e.g., from Gateway)
        logger.info(f"[DEBUG] _get_system_prompt called for agent={req.agent}")
        logger.info(f"[DEBUG] req.payload type: {type(req.payload)}, keys: {list(req.payload.keys()) if req.payload else []}")
        context = req.payload.get("context") or {}
        logger.info(f"[DEBUG] context type: {type(context)}, keys: {list(context.keys()) if isinstance(context, dict) else 'not a dict'}")
        if isinstance(context, dict) and "system_prompt" in context:
            prompt = context["system_prompt"]
            logger.info(f"[DEBUG] ✅ Using context.system_prompt: {len(prompt)} chars, agent={req.agent}")
            logger.info(f"[DEBUG] System prompt type: {type(prompt)}")
            logger.info(f"[DEBUG] System prompt preview (first 200): {str(prompt)[:200]}...")
            logger.info(f"[DEBUG] System prompt full length check: {len(str(prompt))} chars")
            # Переконаємось, що це рядок
            if not isinstance(prompt, str):
                logger.warning(f"[DEBUG] ⚠️ System prompt is not a string! Type: {type(prompt)}, value: {prompt}")
                prompt = str(prompt) if prompt else None
            return prompt
        else:
            logger.info(f"[DEBUG] ⚠️ No system_prompt in context for agent={req.agent}")
        
        # 2. Agent-specific system prompts (fallback, якщо не передано в context)
        if req.agent == "helion":
            return (
                "Ти - Helion, AI-агент платформи Energy Union екосистеми DAARION.city. "
                "Допомагай користувачам з технологіями EcoMiner/BioMiner, токеномікою та DAO governance. "
                "Твої основні функції: консультації з енергетичними технологіями, пояснення токеноміки Energy Union, "
                "допомога з onboarding в DAO, відповіді на питання про EcoMiner/BioMiner устаткування. "
                "Стиль спілкування: професійний, технічний, але зрозумілий, точний у цифрах та даних."
            )
        
        if req.agent == "daarwizz":
            return (
                "Ти — DAARWIZZ, офіційний AI-агент екосистеми DAARION.city. "
                "Допомагай учасникам з microDAO, ролями та процесами. "
                "Відповідай коротко, практично, враховуй RBAC контекст користувача."
            )
        
        if req.agent == "devtools":
            return (
                "Ти - DevTools Agent в екосистемі DAARION.city. "
                "Ти допомагаєш розробникам з аналізом коду, пошуком багів, "
                "рефакторингом та написанням тестів. "
                "Відповідай коротко, конкретно, з прикладами коду коли потрібно."
            )
        
        return None
