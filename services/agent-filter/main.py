from fastapi import FastAPI, HTTPException
from models import MessageCreatedEvent, FilterDecision, ChannelContext, FilterContext
from rules import FilterRules
import httpx
import asyncio
import json
from datetime import datetime, timezone
import os

app = FastAPI(title="DAARION Agent Filter", version="1.0.0")

# Configuration
MESSAGING_SERVICE_URL = os.getenv("MESSAGING_SERVICE_URL", "http://messaging-service:7004")
NATS_URL = os.getenv("NATS_URL", "nats://nats:4222")

# Rules engine
rules_engine = FilterRules("config.yaml")

# NATS client (will be initialized on startup)
nc = None
nats_available = False

@app.on_event("startup")
async def startup_event():
    """Initialize NATS connection and subscriptions"""
    global nc, nats_available
    print("🚀 Agent Filter starting up...")
    
    # Try to connect to NATS
    try:
        import nats
        nc = await nats.connect(NATS_URL)
        nats_available = True
        print(f"✅ Connected to NATS at {NATS_URL}")
        
        # Subscribe to messaging events
        asyncio.create_task(subscribe_to_messaging_events())
    except Exception as e:
        print(f"⚠️ NATS not available: {e}")
        print("⚠️ Running in test mode (HTTP only)")
        nats_available = False

async def subscribe_to_messaging_events():
    """Subscribe to messaging.message.created events"""
    if not nc:
        return
    
    try:
        sub = await nc.subscribe("messaging.message.created")
        print("✅ Subscribed to messaging.message.created")
        
        async for msg in sub.messages:
            try:
                event_data = json.loads(msg.data.decode())
                await handle_message_created(event_data)
            except Exception as e:
                print(f"❌ Error processing message: {e}")
    except Exception as e:
        print(f"❌ Subscription error: {e}")

async def handle_message_created(event_data: dict):
    """Process incoming message.created events"""
    try:
        print(f"\n📨 Received message.created event")
        event = MessageCreatedEvent(**event_data)
        
        # Fetch channel context
        ctx = await fetch_channel_context(event.channel_id)
        
        # Apply rules
        decision = rules_engine.decide(event, ctx)
        
        print(f"🎯 Decision: {decision.decision} for channel {event.channel_id}")
        if decision.target_agent_id:
            print(f"   Target: {decision.target_agent_id}")
        
        # Publish decision to NATS
        await publish_decision(decision)
        
    except Exception as e:
        print(f"❌ Error handling message: {e}")
        import traceback
        traceback.print_exc()

async def fetch_channel_context(channel_id: str) -> FilterContext:
    """Fetch channel context from messaging-service"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{MESSAGING_SERVICE_URL}/internal/messaging/channels/{channel_id}/context"
            )
            response.raise_for_status()
            data = response.json()
            
            channel_ctx = ChannelContext(**data)
            return FilterContext(
                channel=channel_ctx,
                local_time=datetime.now(timezone.utc)
            )
    except httpx.HTTPStatusError as e:
        print(f"⚠️ HTTP error fetching context: {e.response.status_code}")
        # Return default context
        return FilterContext(
            channel=ChannelContext(
                microdao_id="microdao:daarion",
                visibility="microdao",
                allowed_agents=["agent:sofia"]
            ),
            local_time=datetime.now(timezone.utc)
        )
    except Exception as e:
        print(f"⚠️ Error fetching context: {e}")
        return FilterContext(
            channel=ChannelContext(
                microdao_id="microdao:daarion",
                visibility="microdao",
                allowed_agents=["agent:sofia"]
            ),
            local_time=datetime.now(timezone.utc)
        )

async def publish_decision(decision: FilterDecision):
    """Publish decision to NATS"""
    if nc and nats_available:
        try:
            await nc.publish("agent.filter.decision", decision.json().encode())
            print(f"✅ Published decision to NATS: agent.filter.decision")
        except Exception as e:
            print(f"❌ Error publishing to NATS: {e}")
    else:
        print(f"⚠️ NATS not available, decision not published: {decision.json()}")

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "agent-filter",
        "version": "1.0.0",
        "nats_connected": nats_available
    }

@app.post("/internal/agent-filter/test", response_model=FilterDecision)
async def test_filter(event: MessageCreatedEvent):
    """Test endpoint for manual filtering"""
    print(f"\n🧪 Test request received")
    ctx = await fetch_channel_context(event.channel_id)
    decision = rules_engine.decide(event, ctx)
    print(f"🎯 Test decision: {decision.decision}")
    return decision

@app.on_event("shutdown")
async def shutdown_event():
    """Clean shutdown"""
    global nc
    if nc:
        await nc.close()
        print("✅ NATS connection closed")




