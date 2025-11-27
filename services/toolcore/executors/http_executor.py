import httpx
import time
from typing import Dict, Any
from models import ToolCallResult

class HTTPExecutor:
    """Execute tools via HTTP calls"""
    
    def __init__(self):
        self.client = httpx.AsyncClient()
    
    async def execute(
        self,
        tool_id: str,
        target: str,
        args: Dict[str, Any],
        context: Dict[str, Any],
        timeout: int = 30
    ) -> ToolCallResult:
        """
        Execute tool via HTTP POST
        
        Sends args + context to target URL
        """
        start_time = time.time()
        
        payload = {
            "args": args,
            "context": context
        }
        
        try:
            response = await self.client.post(
                target,
                json=payload,
                timeout=timeout
            )
            response.raise_for_status()
            
            result = response.json()
            latency_ms = (time.time() - start_time) * 1000
            
            return ToolCallResult(
                ok=True,
                result=result,
                tool_id=tool_id,
                latency_ms=latency_ms
            )
        
        except httpx.ConnectError as e:
            latency_ms = (time.time() - start_time) * 1000
            error_msg = f"Connection failed: {target} ({str(e)})"
            print(f"❌ {error_msg}")
            
            return ToolCallResult(
                ok=False,
                error=error_msg,
                tool_id=tool_id,
                latency_ms=latency_ms
            )
        
        except httpx.HTTPStatusError as e:
            latency_ms = (time.time() - start_time) * 1000
            error_msg = f"HTTP {e.response.status_code}: {e.response.text}"
            print(f"❌ Tool {tool_id} failed: {error_msg}")
            
            return ToolCallResult(
                ok=False,
                error=error_msg,
                tool_id=tool_id,
                latency_ms=latency_ms
            )
        
        except httpx.TimeoutException:
            latency_ms = (time.time() - start_time) * 1000
            error_msg = f"Timeout after {timeout}s"
            print(f"⏱️  Tool {tool_id} timeout")
            
            return ToolCallResult(
                ok=False,
                error=error_msg,
                tool_id=tool_id,
                latency_ms=latency_ms
            )
        
        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000
            error_msg = f"Unexpected error: {str(e)}"
            print(f"❌ Tool {tool_id} error: {error_msg}")
            
            return ToolCallResult(
                ok=False,
                error=error_msg,
                tool_id=tool_id,
                latency_ms=latency_ms
            )
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()




