import time
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict

class RateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self, requests_per_minute: int = 10):
        self.requests_per_minute = requests_per_minute
        self.requests: Dict[str, list[datetime]] = defaultdict(list)
    
    def check_limit(self, key: str) -> tuple[bool, int]:
        """
        Check if request is allowed
        
        Returns: (allowed: bool, remaining: int)
        """
        now = datetime.now()
        cutoff = now - timedelta(minutes=1)
        
        # Clean old requests
        self.requests[key] = [
            req_time for req_time in self.requests[key]
            if req_time > cutoff
        ]
        
        # Check limit
        current_count = len(self.requests[key])
        
        if current_count >= self.requests_per_minute:
            return False, 0
        
        # Add new request
        self.requests[key].append(now)
        remaining = self.requests_per_minute - current_count - 1
        
        return True, remaining

class UsageTracker:
    """Track LLM usage for billing/monitoring"""
    
    def __init__(self):
        self.usage_log: list = []
    
    def log_usage(
        self,
        agent_id: str | None,
        microdao_id: str | None,
        model: str,
        provider: str,
        prompt_tokens: int,
        completion_tokens: int,
        latency_ms: float,
        success: bool = True,
        error: str | None = None
    ):
        """Log LLM usage"""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "agent_id": agent_id,
            "microdao_id": microdao_id,
            "model": model,
            "provider": provider,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
            "latency_ms": latency_ms,
            "success": success,
            "error": error
        }
        
        self.usage_log.append(log_entry)
        
        # Keep last 1000 entries in memory
        if len(self.usage_log) > 1000:
            self.usage_log = self.usage_log[-1000:]
        
        # TODO: Write to database or metrics system
        print(f"📊 Usage: {agent_id or 'unknown'} | {model} | {prompt_tokens + completion_tokens} tokens | {latency_ms:.0f}ms")
    
    def get_usage_summary(self, agent_id: str | None = None) -> dict:
        """Get usage summary"""
        filtered = self.usage_log
        if agent_id:
            filtered = [log for log in self.usage_log if log.get("agent_id") == agent_id]
        
        if not filtered:
            return {"total_requests": 0, "total_tokens": 0}
        
        return {
            "total_requests": len(filtered),
            "total_tokens": sum(log["total_tokens"] for log in filtered),
            "total_prompt_tokens": sum(log["prompt_tokens"] for log in filtered),
            "total_completion_tokens": sum(log["completion_tokens"] for log in filtered),
            "avg_latency_ms": sum(log["latency_ms"] for log in filtered) / len(filtered),
            "success_rate": sum(1 for log in filtered if log["success"]) / len(filtered)
        }




