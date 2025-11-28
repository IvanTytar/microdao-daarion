from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Literal, Optional, Dict, Any, List
import asyncio
import json
import os
import yaml
import httpx
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="DAARION Router", version="2.0.0")

# Configuration
NATS_URL = os.getenv("NATS_URL", "nats://nats:4222")
SWAPPER_URL = os.getenv("SWAPPER_URL", "http://192.168.1.33:8890")
STT_URL = os.getenv("STT_URL", "http://192.168.1.33:8895")
VISION_URL = os.getenv("VISION_URL", "http://192.168.1.33:11434")
OCR_URL = os.getenv("OCR_URL", "http://192.168.1.33:8896")

# HTTP client for backend services
http_client: Optional[httpx.AsyncClient] = None

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
    global nc, nats_available, http_client
    logger.info("🚀 DAGI Router v2.0.0 starting up...")
    
    # Initialize HTTP client
    http_client = httpx.AsyncClient(timeout=60.0)
    logger.info("✅ HTTP client initialized")
    
    # Try to connect to NATS
    try:
        import nats
        nc = await nats.connect(NATS_URL)
        nats_available = True
        logger.info(f"✅ Connected to NATS at {NATS_URL}")
        
        # Subscribe to filter decisions if enabled
        if config.get("messaging_inbound", {}).get("enabled", True):
            asyncio.create_task(subscribe_to_filter_decisions())
        else:
            logger.warning("⚠️ Messaging inbound routing disabled in config")
    except Exception as e:
        logger.warning(f"⚠️ NATS not available: {e}")
        logger.warning("⚠️ Running in test mode (HTTP only)")
        nats_available = False
    
    # Log backend URLs
    logger.info(f"📡 Swapper URL: {SWAPPER_URL}")
    logger.info(f"📡 STT URL: {STT_URL}")
    logger.info(f"📡 Vision URL: {VISION_URL}")
    logger.info(f"📡 OCR URL: {OCR_URL}")

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
    global nc, http_client
    if nc:
        await nc.close()
        logger.info("✅ NATS connection closed")
    if http_client:
        await http_client.aclose()
        logger.info("✅ HTTP client closed")


# ============================================================================
# Backend Integration Endpoints
# ============================================================================

class InferRequest(BaseModel):
    """Request for agent inference"""
    prompt: str
    model: Optional[str] = None
    max_tokens: Optional[int] = 2048
    temperature: Optional[float] = 0.7
    system_prompt: Optional[str] = None


class InferResponse(BaseModel):
    """Response from agent inference"""
    response: str
    model: str
    tokens_used: Optional[int] = None
    backend: str


class BackendStatus(BaseModel):
    """Status of a backend service"""
    name: str
    url: str
    status: str  # online, offline, error
    active_model: Optional[str] = None
    error: Optional[str] = None


@app.get("/backends/status", response_model=List[BackendStatus])
async def get_backends_status():
    """Get status of all backend services"""
    backends = []
    
    # Check Swapper
    try:
        resp = await http_client.get(f"{SWAPPER_URL}/health", timeout=5.0)
        if resp.status_code == 200:
            data = resp.json()
            backends.append(BackendStatus(
                name="swapper",
                url=SWAPPER_URL,
                status="online",
                active_model=data.get("active_model")
            ))
        else:
            backends.append(BackendStatus(
                name="swapper",
                url=SWAPPER_URL,
                status="error",
                error=f"HTTP {resp.status_code}"
            ))
    except Exception as e:
        backends.append(BackendStatus(
            name="swapper",
            url=SWAPPER_URL,
            status="offline",
            error=str(e)
        ))
    
    # Check STT
    try:
        resp = await http_client.get(f"{STT_URL}/health", timeout=5.0)
        backends.append(BackendStatus(
            name="stt",
            url=STT_URL,
            status="online" if resp.status_code == 200 else "error"
        ))
    except Exception as e:
        backends.append(BackendStatus(
            name="stt",
            url=STT_URL,
            status="offline",
            error=str(e)
        ))
    
    # Check Vision (Ollama)
    try:
        resp = await http_client.get(f"{VISION_URL}/api/tags", timeout=5.0)
        if resp.status_code == 200:
            data = resp.json()
            models = [m.get("name") for m in data.get("models", [])]
            backends.append(BackendStatus(
                name="vision",
                url=VISION_URL,
                status="online",
                active_model=", ".join(models[:3]) if models else None
            ))
        else:
            backends.append(BackendStatus(
                name="vision",
                url=VISION_URL,
                status="error"
            ))
    except Exception as e:
        backends.append(BackendStatus(
            name="vision",
            url=VISION_URL,
            status="offline",
            error=str(e)
        ))
    
    # Check OCR
    try:
        resp = await http_client.get(f"{OCR_URL}/health", timeout=5.0)
        backends.append(BackendStatus(
            name="ocr",
            url=OCR_URL,
            status="online" if resp.status_code == 200 else "error"
        ))
    except Exception as e:
        backends.append(BackendStatus(
            name="ocr",
            url=OCR_URL,
            status="offline",
            error=str(e)
        ))
    
    return backends


@app.post("/v1/agents/{agent_id}/infer", response_model=InferResponse)
async def agent_infer(agent_id: str, request: InferRequest):
    """
    Route inference request to appropriate backend.
    
    Router decides which backend to use based on:
    - Agent configuration (model, capabilities)
    - Request type (text, vision, audio)
    - Backend availability
    """
    logger.info(f"🔀 Inference request for agent: {agent_id}")
    logger.info(f"📝 Prompt: {request.prompt[:100]}...")
    
    # Determine which backend to use
    model = request.model or "gpt-oss:latest"
    
    # Try Swapper first (for LLM models)
    try:
        # Check if Swapper is available
        health_resp = await http_client.get(f"{SWAPPER_URL}/health", timeout=5.0)
        if health_resp.status_code == 200:
            # Load model if needed
            load_resp = await http_client.post(
                f"{SWAPPER_URL}/load",
                json={"model": model},
                timeout=30.0
            )
            
            if load_resp.status_code == 200:
                # Generate response via Ollama
                generate_resp = await http_client.post(
                    f"{VISION_URL}/api/generate",
                    json={
                        "model": model,
                        "prompt": request.prompt,
                        "system": request.system_prompt,
                        "stream": False,
                        "options": {
                            "num_predict": request.max_tokens,
                            "temperature": request.temperature
                        }
                    },
                    timeout=120.0
                )
                
                if generate_resp.status_code == 200:
                    data = generate_resp.json()
                    return InferResponse(
                        response=data.get("response", ""),
                        model=model,
                        tokens_used=data.get("eval_count"),
                        backend="swapper+ollama"
                    )
    except Exception as e:
        logger.error(f"❌ Swapper/Ollama error: {e}")
    
    # Fallback: return error
    raise HTTPException(
        status_code=503,
        detail=f"No backend available for model: {model}"
    )


@app.get("/v1/models")
async def list_available_models():
    """List all available models across backends"""
    models = []
    
    # Get Swapper models
    try:
        resp = await http_client.get(f"{SWAPPER_URL}/models", timeout=5.0)
        if resp.status_code == 200:
            data = resp.json()
            for m in data.get("models", []):
                models.append({
                    "id": m.get("name"),
                    "backend": "swapper",
                    "size_gb": m.get("size_gb"),
                    "status": m.get("status", "available")
                })
    except Exception as e:
        logger.warning(f"Cannot get Swapper models: {e}")
    
    # Get Ollama models
    try:
        resp = await http_client.get(f"{VISION_URL}/api/tags", timeout=5.0)
        if resp.status_code == 200:
            data = resp.json()
            for m in data.get("models", []):
                # Avoid duplicates
                model_name = m.get("name")
                if not any(x.get("id") == model_name for x in models):
                    models.append({
                        "id": model_name,
                        "backend": "ollama",
                        "size_gb": round(m.get("size", 0) / 1e9, 1),
                        "status": "loaded"
                    })
    except Exception as e:
        logger.warning(f"Cannot get Ollama models: {e}")
    
    return {"models": models, "total": len(models)}





