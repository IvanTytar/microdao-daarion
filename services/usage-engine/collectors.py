"""
Usage Event Collectors (NATS Listeners)
Collects usage events from various services via NATS
"""
import json
import asyncio
import asyncpg
from datetime import datetime
from typing import Optional

from models import (
    LlmUsageEvent,
    ToolUsageEvent,
    AgentInvocationEvent,
    MessageUsageEvent,
    UsageEventType
)

class UsageCollector:
    """Collects and stores usage events from NATS"""
    
    def __init__(self, nats_client, db_pool: asyncpg.Pool):
        self.nc = nats_client
        self.db_pool = db_pool
        self.subscriptions = []
    
    async def start(self):
        """Subscribe to all usage subjects"""
        print("🎧 Starting usage collectors...")
        
        # Subscribe to LLM usage
        sub_llm = await self.nc.subscribe("usage.llm", cb=self._handle_llm_event)
        self.subscriptions.append(sub_llm)
        print("✅ Subscribed to usage.llm")
        
        # Subscribe to Tool usage
        sub_tool = await self.nc.subscribe("usage.tool", cb=self._handle_tool_event)
        self.subscriptions.append(sub_tool)
        print("✅ Subscribed to usage.tool")
        
        # Subscribe to Agent invocations
        sub_agent = await self.nc.subscribe("usage.agent", cb=self._handle_agent_event)
        self.subscriptions.append(sub_agent)
        print("✅ Subscribed to usage.agent")
        
        # Subscribe to Message events
        sub_message = await self.nc.subscribe("messaging.message.created", cb=self._handle_message_event)
        self.subscriptions.append(sub_message)
        print("✅ Subscribed to messaging.message.created")
        
        print("🎧 All collectors active")
    
    async def stop(self):
        """Unsubscribe from all subjects"""
        for sub in self.subscriptions:
            await sub.unsubscribe()
        print("🛑 All collectors stopped")
    
    # ========================================================================
    # Event Handlers
    # ========================================================================
    
    async def _handle_llm_event(self, msg):
        """Handle LLM usage event"""
        try:
            data = json.loads(msg.data.decode())
            event = LlmUsageEvent(**data)
            await self._store_llm_event(event)
            print(f"📊 LLM usage: {event.model} | {event.total_tokens} tokens | {event.latency_ms}ms")
        except Exception as e:
            print(f"❌ Error handling LLM event: {e}")
    
    async def _handle_tool_event(self, msg):
        """Handle tool usage event"""
        try:
            data = json.loads(msg.data.decode())
            event = ToolUsageEvent(**data)
            await self._store_tool_event(event)
            print(f"📊 Tool usage: {event.tool_id} | success={event.success} | {event.latency_ms}ms")
        except Exception as e:
            print(f"❌ Error handling tool event: {e}")
    
    async def _handle_agent_event(self, msg):
        """Handle agent invocation event"""
        try:
            data = json.loads(msg.data.decode())
            event = AgentInvocationEvent(**data)
            await self._store_agent_event(event)
            print(f"📊 Agent invocation: {event.agent_id} | {event.duration_ms}ms | LLM:{event.llm_calls} Tool:{event.tool_calls}")
        except Exception as e:
            print(f"❌ Error handling agent event: {e}")
    
    async def _handle_message_event(self, msg):
        """Handle message sent event"""
        try:
            data = json.loads(msg.data.decode())
            # Convert messaging event to usage event
            event = MessageUsageEvent(
                event_id=data.get("message_id", "unknown"),
                timestamp=datetime.fromisoformat(data.get("created_at", datetime.utcnow().isoformat())),
                actor_id=data.get("sender_id", "unknown"),
                actor_type=data.get("sender_type", "human"),
                microdao_id=data.get("microdao_id", "unknown"),
                channel_id=data.get("channel_id", "unknown"),
                message_length=len(data.get("content_preview", "")),
                metadata={"matrix_event_id": data.get("matrix_event_id")}
            )
            await self._store_message_event(event)
            print(f"📊 Message sent: {event.actor_id} | {event.message_length} chars")
        except Exception as e:
            print(f"❌ Error handling message event: {e}")
    
    # ========================================================================
    # Database Storage
    # ========================================================================
    
    async def _store_llm_event(self, event: LlmUsageEvent):
        """Store LLM usage event to database"""
        async with self.db_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO usage_llm
                (event_id, timestamp, actor_id, actor_type, agent_id, microdao_id,
                 model, provider, prompt_tokens, completion_tokens, total_tokens,
                 latency_ms, success, error, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                ON CONFLICT (event_id) DO NOTHING
            """,
                event.event_id, event.timestamp, event.actor_id, event.actor_type.value,
                event.agent_id, event.microdao_id, event.model, event.provider,
                event.prompt_tokens, event.completion_tokens, event.total_tokens,
                event.latency_ms, event.success, event.error,
                json.dumps(event.metadata or {})
            )
    
    async def _store_tool_event(self, event: ToolUsageEvent):
        """Store tool usage event to database"""
        async with self.db_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO usage_tool
                (event_id, timestamp, actor_id, actor_type, agent_id, microdao_id,
                 tool_id, tool_name, success, latency_ms, error, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (event_id) DO NOTHING
            """,
                event.event_id, event.timestamp, event.actor_id, event.actor_type.value,
                event.agent_id, event.microdao_id, event.tool_id, event.tool_name,
                event.success, event.latency_ms, event.error,
                json.dumps(event.metadata or {})
            )
    
    async def _store_agent_event(self, event: AgentInvocationEvent):
        """Store agent invocation event to database"""
        async with self.db_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO usage_agent
                (event_id, timestamp, agent_id, microdao_id, channel_id,
                 trigger, duration_ms, llm_calls, tool_calls, success, error, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (event_id) DO NOTHING
            """,
                event.event_id, event.timestamp, event.agent_id, event.microdao_id,
                event.channel_id, event.trigger, event.duration_ms, event.llm_calls,
                event.tool_calls, event.success, event.error,
                json.dumps(event.metadata or {})
            )
    
    async def _store_message_event(self, event: MessageUsageEvent):
        """Store message usage event to database"""
        async with self.db_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO usage_message
                (event_id, timestamp, actor_id, actor_type, microdao_id, channel_id,
                 message_length, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (event_id) DO NOTHING
            """,
                event.event_id, event.timestamp, event.actor_id, event.actor_type.value,
                event.microdao_id, event.channel_id, event.message_length,
                json.dumps(event.metadata or {})
            )





