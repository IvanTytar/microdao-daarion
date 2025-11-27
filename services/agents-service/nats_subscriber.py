"""
NATS Subscriber — Listen to agent activity events
Phase 6: Subscribe to usage.agent, usage.llm, agent.reply.sent, agent.error
"""
import asyncio
import json
from typing import Optional
from nats.aio.client import Client as NATS
from repository_events import EventRepository
from ws_events import push_event_to_ws

class NATSSubscriber:
    def __init__(self, nats_url: str, event_repo: EventRepository):
        self.nats_url = nats_url
        self.event_repo = event_repo
        self.nc: Optional[NATS] = None
    
    async def connect(self):
        """Connect to NATS"""
        self.nc = NATS()
        await self.nc.connect(self.nats_url)
        print(f"✅ NATS connected: {self.nats_url}")
    
    async def subscribe_all(self):
        """Subscribe to all agent-related subjects"""
        if not self.nc:
            raise RuntimeError("NATS not connected")
        
        # Subscribe to usage.agent (invocations)
        await self.nc.subscribe("usage.agent", cb=self._handle_usage_agent)
        print("✅ Subscribed to: usage.agent")
        
        # Subscribe to usage.llm (LLM calls)
        await self.nc.subscribe("usage.llm", cb=self._handle_usage_llm)
        print("✅ Subscribed to: usage.llm")
        
        # Subscribe to usage.tool (tool calls)
        await self.nc.subscribe("usage.tool", cb=self._handle_usage_tool)
        print("✅ Subscribed to: usage.tool")
        
        # Subscribe to agent.reply.sent (replies)
        await self.nc.subscribe("agent.reply.sent", cb=self._handle_agent_reply)
        print("✅ Subscribed to: agent.reply.sent")
        
        # Subscribe to agent.error (errors)
        await self.nc.subscribe("agent.error", cb=self._handle_agent_error)
        print("✅ Subscribed to: agent.error")
    
    # ========================================================================
    # Handlers
    # ========================================================================
    
    async def _handle_usage_agent(self, msg):
        """
        Handle usage.agent events (invocations)
        
        Example payload:
        {
          "agent_id": "agent:sofia",
          "ts": "2025-11-24T10:30:00Z",
          "kind": "invocation",
          "channel_id": "channel:123",
          "microdao_id": "microdao:7"
        }
        """
        try:
            data = json.loads(msg.data.decode())
            agent_id = data.get("agent_id")
            
            if not agent_id:
                return
            
            # Log to DB
            await self.event_repo.log_event(
                agent_external_id=agent_id,
                kind="invocation",
                channel_id=data.get("channel_id"),
                payload={
                    "microdao_id": data.get("microdao_id"),
                    "ts": data.get("ts")
                }
            )
            
            # Push to WebSocket
            await push_event_to_ws(
                agent_id=agent_id,
                event_kind="invocation",
                payload={
                    "channel_id": data.get("channel_id"),
                    "ts": data.get("ts")
                }
            )
            
            print(f"📥 Event: {agent_id} → invocation")
        
        except Exception as e:
            print(f"⚠️  Error handling usage.agent: {e}")
    
    async def _handle_usage_llm(self, msg):
        """
        Handle usage.llm events (LLM calls)
        
        Example payload:
        {
          "agent_id": "agent:sofia",
          "model": "gpt-4.1-mini",
          "tokens_input": 150,
          "tokens_output": 80,
          "latency_ms": 320
        }
        """
        try:
            data = json.loads(msg.data.decode())
            agent_id = data.get("agent_id")
            
            if not agent_id:
                return
            
            # Log to DB (optional — might be too verbose)
            # await self.event_repo.log_event(
            #     agent_external_id=agent_id,
            #     kind="llm_call",
            #     payload=data
            # )
            
            # Push to WebSocket (live activity)
            await push_event_to_ws(
                agent_id=agent_id,
                event_kind="llm_call",
                payload={
                    "model": data.get("model"),
                    "tokens": data.get("tokens_input", 0) + data.get("tokens_output", 0),
                    "latency_ms": data.get("latency_ms")
                }
            )
        
        except Exception as e:
            print(f"⚠️  Error handling usage.llm: {e}")
    
    async def _handle_usage_tool(self, msg):
        """
        Handle usage.tool events (tool calls)
        
        Example payload:
        {
          "agent_id": "agent:sofia",
          "tool_id": "projects.list",
          "success": true,
          "latency_ms": 50
        }
        """
        try:
            data = json.loads(msg.data.decode())
            agent_id = data.get("agent_id")
            
            if not agent_id:
                return
            
            # Log to DB
            await self.event_repo.log_event(
                agent_external_id=agent_id,
                kind="tool_call",
                payload={
                    "tool_id": data.get("tool_id"),
                    "success": data.get("success"),
                    "latency_ms": data.get("latency_ms")
                }
            )
            
            # Push to WebSocket
            await push_event_to_ws(
                agent_id=agent_id,
                event_kind="tool_call",
                payload={
                    "tool_id": data.get("tool_id"),
                    "success": data.get("success")
                }
            )
            
            print(f"📥 Event: {agent_id} → tool_call ({data.get('tool_id')})")
        
        except Exception as e:
            print(f"⚠️  Error handling usage.tool: {e}")
    
    async def _handle_agent_reply(self, msg):
        """
        Handle agent.reply.sent events
        
        Example payload:
        {
          "agent_id": "agent:sofia",
          "channel_id": "channel:123",
          "message_preview": "Here are your projects...",
          "ts": "2025-11-24T10:30:05Z"
        }
        """
        try:
            data = json.loads(msg.data.decode())
            agent_id = data.get("agent_id")
            
            if not agent_id:
                return
            
            # Log to DB
            await self.event_repo.log_event(
                agent_external_id=agent_id,
                kind="reply_sent",
                channel_id=data.get("channel_id"),
                payload={
                    "message_preview": data.get("message_preview", "")[:200],
                    "ts": data.get("ts")
                }
            )
            
            # Push to WebSocket
            await push_event_to_ws(
                agent_id=agent_id,
                event_kind="reply_sent",
                payload={
                    "channel_id": data.get("channel_id"),
                    "message_preview": data.get("message_preview", "")[:50]
                }
            )
            
            print(f"📥 Event: {agent_id} → reply_sent")
        
        except Exception as e:
            print(f"⚠️  Error handling agent.reply.sent: {e}")
    
    async def _handle_agent_error(self, msg):
        """
        Handle agent.error events
        
        Example payload:
        {
          "agent_id": "agent:sofia",
          "error_type": "LLM_ERROR",
          "error_message": "Rate limit exceeded",
          "ts": "2025-11-24T10:30:00Z"
        }
        """
        try:
            data = json.loads(msg.data.decode())
            agent_id = data.get("agent_id")
            
            if not agent_id:
                return
            
            # Log to DB
            await self.event_repo.log_event(
                agent_external_id=agent_id,
                kind="error",
                payload={
                    "error_type": data.get("error_type"),
                    "error_message": data.get("error_message"),
                    "ts": data.get("ts")
                }
            )
            
            # Push to WebSocket
            await push_event_to_ws(
                agent_id=agent_id,
                event_kind="error",
                payload={
                    "error_type": data.get("error_type"),
                    "error_message": data.get("error_message", "")[:100]
                }
            )
            
            print(f"📥 Event: {agent_id} → error ({data.get('error_type')})")
        
        except Exception as e:
            print(f"⚠️  Error handling agent.error: {e}")
    
    async def close(self):
        """Close NATS connection"""
        if self.nc:
            await self.nc.close()
            print("❌ NATS closed")

