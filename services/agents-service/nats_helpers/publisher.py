"""
NATS Publisher — Публікація подій до NATS
"""

import json
from typing import Dict, Any, Optional
from nats.aio.client import Client as NATS
from datetime import datetime

class NATSPublisher:
    def __init__(self, nc: NATS):
        self.nc = nc
    
    async def publish(self, subject: str, payload: Dict[str, Any]) -> None:
        """
        Опублікувати подію до NATS
        
        Args:
            subject: NATS subject (e.g., "agents.invoke")
            payload: Дані події (dict)
        """
        try:
            # Додаємо timestamp, якщо не вказано
            if "ts" not in payload:
                payload["ts"] = datetime.utcnow().isoformat() + "Z"
            
            # Серіалізуємо в JSON
            data = json.dumps(payload).encode()
            
            # Публікуємо
            await self.nc.publish(subject, data)
            print(f"📤 Published: {subject} → {len(data)} bytes")
        
        except Exception as e:
            print(f"⚠️  Failed to publish {subject}: {e}")
            raise
    
    async def publish_agent_invoke(
        self,
        agent_id: str,
        channel_id: str,
        message_text: str,
        user_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Опублікувати подію виклику агента
        
        Subject: agents.invoke
        Payload: {
            "agent_id": "agent:sofia",
            "channel_id": "channel:123",
            "message_text": "What are my tasks?",
            "user_id": "user:456",
            "context": {...}
        }
        """
        await self.publish("agents.invoke", {
            "agent_id": agent_id,
            "channel_id": channel_id,
            "message_text": message_text,
            "user_id": user_id,
            "context": context or {}
        })
    
    async def publish_agent_reply(
        self,
        agent_id: str,
        channel_id: str,
        reply_text: str,
        tokens_used: int = 0,
        latency_ms: int = 0
    ) -> None:
        """
        Опублікувати відповідь агента
        
        Subject: agents.reply
        """
        await self.publish("agents.reply", {
            "agent_id": agent_id,
            "channel_id": channel_id,
            "reply_text": reply_text,
            "tokens_used": tokens_used,
            "latency_ms": latency_ms
        })
    
    async def publish_agent_error(
        self,
        agent_id: str,
        error_type: str,
        error_message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Опублікувати помилку агента
        
        Subject: agents.error
        """
        await self.publish("agents.error", {
            "agent_id": agent_id,
            "error_type": error_type,
            "error_message": error_message,
            "context": context or {}
        })
    
    async def publish_agent_telemetry(
        self,
        agent_id: str,
        metric_name: str,
        metric_value: float,
        tags: Optional[Dict[str, str]] = None
    ) -> None:
        """
        Опублікувати телеметрію агента
        
        Subject: agents.telemetry
        """
        await self.publish("agents.telemetry", {
            "agent_id": agent_id,
            "metric_name": metric_name,
            "metric_value": metric_value,
            "tags": tags or {}
        })
    
    async def publish_run_created(
        self,
        run_id: str,
        agent_id: str,
        input_text: str
    ) -> None:
        """
        Опублікувати створення run
        
        Subject: agents.runs.created
        """
        await self.publish("agents.runs.created", {
            "run_id": run_id,
            "agent_id": agent_id,
            "input_text": input_text[:500]  # Limit preview
        })
    
    async def publish_run_finished(
        self,
        run_id: str,
        agent_id: str,
        success: bool,
        duration_ms: int,
        tokens_used: int = 0
    ) -> None:
        """
        Опублікувати завершення run
        
        Subject: agents.runs.finished
        """
        await self.publish("agents.runs.finished", {
            "run_id": run_id,
            "agent_id": agent_id,
            "success": success,
            "duration_ms": duration_ms,
            "tokens_used": tokens_used
        })

