import httpx
import time
from models import ChatMessage, LLMResponse, Usage, ProviderConfig

class LocalProvider:
    """Local LLM provider (Ollama/vLLM/llama.cpp)"""
    
    def __init__(self, config: ProviderConfig):
        self.config = config
        self.client = httpx.AsyncClient(
            base_url=config.base_url,
            timeout=config.timeout
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
        """
        Call local LLM (Ollama format)
        
        Note: For Phase 3, this is a simple stub.
        Can be extended to support llama.cpp, vLLM, etc.
        """
        start_time = time.time()
        
        # Ollama chat format
        payload = {
            "model": model_name,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "stream": False,
            "options": {
                "temperature": temperature,
                "top_p": top_p
            }
        }
        
        if max_tokens:
            payload["options"]["num_predict"] = max_tokens
        
        try:
            response = await self.client.post(
                "/api/chat",
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            
            latency_ms = (time.time() - start_time) * 1000
            
            # Ollama doesn't always provide token counts
            content = data.get("message", {}).get("content", "")
            prompt_tokens = data.get("prompt_eval_count", 0)
            completion_tokens = data.get("eval_count", 0)
            
            return LLMResponse(
                content=content,
                usage=Usage(
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    total_tokens=prompt_tokens + completion_tokens
                ),
                provider="local",
                model_resolved=model_name,
                latency_ms=latency_ms,
                cached=False
            )
        
        except httpx.ConnectError:
            # Local LLM not running - return stub response
            print(f"⚠️  Local LLM not available at {self.config.base_url}, using stub")
            return LLMResponse(
                content="[STUB] Local LLM not running. Start Ollama: `ollama serve`",
                usage=Usage(prompt_tokens=0, completion_tokens=0, total_tokens=0),
                provider="local",
                model_resolved=model_name,
                latency_ms=(time.time() - start_time) * 1000,
                cached=False
            )
        
        except httpx.HTTPStatusError as e:
            raise Exception(f"Local LLM API error: {e.response.status_code} - {e.response.text}")
        except Exception as e:
            raise Exception(f"Local provider error: {str(e)}")
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()




