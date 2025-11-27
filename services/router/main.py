from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Literal, Optional, Dict, Any
import asyncio
import json
import os
import yaml

app = FastAPI(title="DAARION Router", version="1.0.0")

# Configuration
NATS_URL = os.getenv("NATS_URL", "nats://nats:4222")

# NATS client
nc = None
nats_available = False

# Models
class FilterDecision(BaseModel):
    channel_id: str
    message_id: Optional[str] = None
    matrix_event_id: str
    microdao_id: str
    decision: Literal["allow", "deny", "modify"]
    target_agent_id: Optional[str] = None
    rewrite_prompt: Optional[str] = None

class AgentInvocation(BaseModel):
    agent_id: str
    entrypoint: Literal["channel_message", "direct", "cron"] = "channel_message"
    payload: Dict[str, Any]

# Load config
def load_config():
    config_path = "router_config.yaml"
    if os.path.exists(config_path):
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    return {
        "messaging_inbound": {
            "enabled": True,
            "source_subject": "agent.filter.decision",
            "target_subject": "router.invoke.agent"
        }
    }

config = load_config()

@app.on_event("startup")
async def startup_event():
    """Initialize NATS connection and subscriptions"""
    global nc, nats_available
    print("🚀 DAGI Router starting up...")
    
    # Try to connect to NATS
    try:
        import nats
        nc = await nats.connect(NATS_URL)
        nats_available = True
        print(f"✅ Connected to NATS at {NATS_URL}")
        
        # Subscribe to filter decisions if enabled
        if config.get("messaging_inbound", {}).get("enabled", True):
            asyncio.create_task(subscribe_to_filter_decisions())
        else:
            print("⚠️ Messaging inbound routing disabled in config")
    except Exception as e:
        print(f"⚠️ NATS not available: {e}")
        print("⚠️ Running in test mode (HTTP only)")
        nats_available = False

async def subscribe_to_filter_decisions():
    """Subscribe to agent.filter.decision events"""
    if not nc:
        return
    
    source_subject = config.get("messaging_inbound", {}).get(
        "source_subject", 
        "agent.filter.decision"
    )
    
    try:
        sub = await nc.subscribe(source_subject)
        print(f"✅ Subscribed to {source_subject}")
        
        async for msg in sub.messages:
            try:
                decision_data = json.loads(msg.data.decode())
                await handle_filter_decision(decision_data)
            except Exception as e:
                print(f"❌ Error processing decision: {e}")
                import traceback
                traceback.print_exc()
    except Exception as e:
        print(f"❌ Subscription error: {e}")

async def handle_filter_decision(decision_data: dict):
    """
    Process agent.filter.decision events
    
    Only processes 'allow' decisions
    Creates AgentInvocation and publishes to router.invoke.agent
    """
    try:
        print(f"\n🔀 Processing filter decision")
        decision = FilterDecision(**decision_data)
        
        # Only process 'allow' decisions
        if decision.decision != "allow":
            print(f"⏭️ Ignoring non-allow decision: {decision.decision}")
            return
        
        if not decision.target_agent_id:
            print(f"⚠️ No target agent specified, skipping")
            return
        
        print(f"✅ Decision: allow")
        print(f"📝 Target: {decision.target_agent_id}")
        print(f"📝 Channel: {decision.channel_id}")
        
        # Create AgentInvocation
        invocation = AgentInvocation(
            agent_id=decision.target_agent_id,
            entrypoint="channel_message",
            payload={
                "channel_id": decision.channel_id,
                "message_id": decision.message_id,
                "matrix_event_id": decision.matrix_event_id,
                "microdao_id": decision.microdao_id,
                "rewrite_prompt": decision.rewrite_prompt
            }
        )
        
        print(f"🚀 Created invocation for {invocation.agent_id}")
        
        # Publish to NATS
        await publish_agent_invocation(invocation)
        
    except Exception as e:
        print(f"❌ Error handling decision: {e}")
        import traceback
        traceback.print_exc()

async def publish_agent_invocation(invocation: AgentInvocation):
    """Publish AgentInvocation to router.invoke.agent"""
    if nc and nats_available:
        target_subject = config.get("messaging_inbound", {}).get(
            "target_subject",
            "router.invoke.agent"
        )
        
        try:
            await nc.publish(target_subject, invocation.json().encode())
            print(f"✅ Published invocation to {target_subject}")
        except Exception as e:
            print(f"❌ Error publishing to NATS: {e}")
    else:
        print(f"⚠️ NATS not available, invocation not published: {invocation.json()}")

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "router",
        "version": "1.0.0",
        "nats_connected": nats_available,
        "messaging_inbound_enabled": config.get("messaging_inbound", {}).get("enabled", True)
    }

@app.post("/internal/router/test-messaging", response_model=AgentInvocation)
async def test_messaging_route(decision: FilterDecision):
    """
    Test endpoint for routing logic
    
    Tests filter decision → agent invocation mapping without NATS
    """
    print(f"\n🧪 Test routing request")
    
    if decision.decision != "allow" or not decision.target_agent_id:
        raise HTTPException(
            status_code=400,
            detail=f"Decision not routable: {decision.decision}, agent: {decision.target_agent_id}"
        )
    
    invocation = AgentInvocation(
        agent_id=decision.target_agent_id,
        entrypoint="channel_message",
        payload={
            "channel_id": decision.channel_id,
            "message_id": decision.message_id,
            "matrix_event_id": decision.matrix_event_id,
            "microdao_id": decision.microdao_id,
            "rewrite_prompt": decision.rewrite_prompt
        }
    )
    
    print(f"✅ Test invocation created for {invocation.agent_id}")
    return invocation

@app.on_event("shutdown")
async def shutdown_event():
    """Clean shutdown"""
    global nc
    if nc:
        await nc.close()
        print("✅ NATS connection closed")





