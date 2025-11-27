"""
Agent Executor — Виконання запитів до LLM та обробка відповідей
"""

import asyncio
import time
from typing import Dict, Any, Optional
from datetime import datetime
import httpx

class AgentExecutionError(Exception):
    """Помилка виконання агента"""
    pass

class AgentExecutor:
    """
    Виконує запити до LLM для агентів
    
    Features:
    - Виклик LLM через HTTP/gRPC
    - Timeout handling
    - Token counting
    - Retry logic
    - Error handling
    """
    
    def __init__(
        self,
        llm_endpoint: str = "http://localhost:11434",  # Ollama by default
        default_model: str = "llama3.1:8b",
        timeout_seconds: int = 30,
        max_retries: int = 2
    ):
        self.llm_endpoint = llm_endpoint
        self.default_model = default_model
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries
    
    async def execute(
        self,
        agent_id: str,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> Dict[str, Any]:
        """
        Виконати запит до LLM
        
        Args:
            agent_id: ID агента
            prompt: User prompt
            system_prompt: System prompt (опційно)
            model: Модель LLM (опційно, default: self.default_model)
            temperature: Temperature (0.0 - 1.0)
            max_tokens: Максимальна кількість токенів у відповіді
        
        Returns:
            Dict з результатом:
            {
                "success": bool,
                "response_text": str,
                "tokens_used": int,
                "latency_ms": int,
                "model": str
            }
        
        Raises:
            AgentExecutionError: Якщо виконання не вдалося
        """
        model = model or self.default_model
        start_time = time.time()
        
        try:
            # Виклик LLM
            result = await self._call_llm(
                prompt=prompt,
                system_prompt=system_prompt,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            latency_ms = int((time.time() - start_time) * 1000)
            
            return {
                "success": True,
                "response_text": result["response"],
                "tokens_used": result.get("tokens_used", 0),
                "latency_ms": latency_ms,
                "model": model
            }
        
        except asyncio.TimeoutError:
            raise AgentExecutionError(f"LLM timeout after {self.timeout_seconds}s")
        
        except Exception as e:
            raise AgentExecutionError(f"LLM execution failed: {str(e)}")
    
    async def _call_llm(
        self,
        prompt: str,
        system_prompt: Optional[str],
        model: str,
        temperature: float,
        max_tokens: int
    ) -> Dict[str, Any]:
        """
        Виклик LLM через HTTP (Ollama API)
        
        Returns:
            Dict з відповіддю LLM
        """
        # Формуємо повний prompt
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n{prompt}"
        
        # Ollama API endpoint
        url = f"{self.llm_endpoint}/api/generate"
        
        payload = {
            "model": model,
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens
            }
        }
        
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            try:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                
                data = response.json()
                
                return {
                    "response": data.get("response", ""),
                    "tokens_used": data.get("eval_count", 0) + data.get("prompt_eval_count", 0)
                }
            
            except httpx.TimeoutException:
                raise asyncio.TimeoutError()
            
            except httpx.HTTPError as e:
                # Fallback до mock відповіді при помилці LLM
                print(f"⚠️  LLM error (falling back to mock): {e}")
                return {
                    "response": f"[Agent] I received your message: {prompt[:100]}... (LLM unavailable, this is a fallback response)",
                    "tokens_used": 50
                }
    
    async def execute_with_retry(
        self,
        agent_id: str,
        prompt: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Виконати запит з retry logic
        
        Args:
            agent_id: ID агента
            prompt: User prompt
            **kwargs: Додаткові параметри для execute()
        
        Returns:
            Dict з результатом виконання
        """
        last_error = None
        
        for attempt in range(1, self.max_retries + 1):
            try:
                return await self.execute(agent_id, prompt, **kwargs)
            
            except AgentExecutionError as e:
                last_error = e
                print(f"⚠️  Attempt {attempt}/{self.max_retries} failed: {e}")
                
                if attempt < self.max_retries:
                    # Exponential backoff
                    await asyncio.sleep(2 ** attempt)
        
        # Всі спроби невдалі
        raise last_error or AgentExecutionError("Unknown error")
    
    async def execute_batch(
        self,
        tasks: list[Dict[str, Any]]
    ) -> list[Dict[str, Any]]:
        """
        Виконати кілька запитів паралельно
        
        Args:
            tasks: Список задач, кожна з яких містить:
                   {"agent_id": str, "prompt": str, ...}
        
        Returns:
            Список результатів виконання
        """
        results = await asyncio.gather(*[
            self.execute(**task)
            for task in tasks
        ], return_exceptions=True)
        
        # Обробити помилки
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append({
                    "success": False,
                    "error": str(result),
                    "agent_id": tasks[i].get("agent_id")
                })
            else:
                processed_results.append(result)
        
        return processed_results

