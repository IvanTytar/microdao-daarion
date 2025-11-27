import httpx
import time
from models import ChatMessage, LLMResponse, Usage, ProviderConfig

class DeepSeekProvider:
    """DeepSeek API provider (OpenAI-compatible)"""
    
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
        """Call DeepSeek Chat API (OpenAI-compatible)"""
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
                    prompt_tokens=data.get("usage", {}).get("prompt_tokens", 0),
                    completion_tokens=data.get("usage", {}).get("completion_tokens", 0),
                    total_tokens=data.get("usage", {}).get("total_tokens", 0)
                ),
                provider="deepseek",
                model_resolved=model_name,
                latency_ms=latency_ms,
                cached=False
            )
        
        except httpx.HTTPStatusError as e:
            raise Exception(f"DeepSeek API error: {e.response.status_code} - {e.response.text}")
        except Exception as e:
            raise Exception(f"DeepSeek provider error: {str(e)}")
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()





