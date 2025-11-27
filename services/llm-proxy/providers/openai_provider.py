import httpx
import time
from models import ChatMessage, LLMResponse, Usage, ProviderConfig

class OpenAIProvider:
    """OpenAI API provider"""
    
    def __init__(self, config: ProviderConfig):
        self.config = config
        self.client = httpx.AsyncClient(
            base_url=config.base_url,
            timeout=config.timeout,
            headers={
                "Authorization": f"Bearer {config.api_key}",
                "Content-Type": "application/json"
            } if config.api_key else {}
        )
    
    async def chat(
        self,
        messages: list[ChatMessage],
        model_name: str,
        max_tokens: int | None = None,
        temperature: float = 0.7,
        top_p: float = 1.0,
        **kwargs
    ) -> LLMResponse:
        """Call OpenAI Chat Completions API"""
        start_time = time.time()
        
        payload = {
            "model": model_name,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "top_p": top_p
        }
        
        if max_tokens:
            payload["max_tokens"] = max_tokens
        
        try:
            response = await self.client.post(
                "/chat/completions",
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            
            latency_ms = (time.time() - start_time) * 1000
            
            return LLMResponse(
                content=data["choices"][0]["message"]["content"],
                usage=Usage(
                    prompt_tokens=data["usage"]["prompt_tokens"],
                    completion_tokens=data["usage"]["completion_tokens"],
                    total_tokens=data["usage"]["total_tokens"]
                ),
                provider="openai",
                model_resolved=model_name,
                latency_ms=latency_ms,
                cached=False
            )
        
        except httpx.HTTPStatusError as e:
            raise Exception(f"OpenAI API error: {e.response.status_code} - {e.response.text}")
        except Exception as e:
            raise Exception(f"OpenAI provider error: {str(e)}")
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()




