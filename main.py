"""
DAGI Router - Decentralized Agent Gateway Interface

Version: 0.3.0 - Multi-provider: DeepSeek + Ollama (local SLM)

Provides:
- Single entry point for all agent requests
- Multi-provider routing (echo, DeepSeek, Ollama, future: OpenAI, CrewAI)
- Unified request/response format
- Policy enforcement (future)
- Budget/quota management (future)
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import datetime as dt
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
import os
from openai import OpenAI
import httpx

# ============================================================================
# Config
# ============================================================================
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")

# ============================================================================
# Logging
# ============================================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("dagi-router")

# ============================================================================
# FastAPI App
# ============================================================================
app = FastAPI(
    title="DAGI Router",
    version="0.3.0",
    description="Decentralized Agent Gateway Interface - Multi-provider AI router"
)

# ============================================================================
# Models
# ============================================================================

class RoutingContext(BaseModel):
    """Context information for routing decisions"""
    user_id: Optional[str] = None
    team_id: Optional[str] = None
    channel_id: Optional[str] = None
    agent_id: Optional[str] = None
    locale: Optional[str] = "uk-UA"
    mode: Optional[str] = "default"


class RouteRequest(BaseModel):
    """Unified input format for all microDAO/DAARION requests"""
    context: RoutingContext = Field(default_factory=RoutingContext)
    message: str = Field(..., description="User message or command")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class RouteResponse(BaseModel):
    """Standard response format from router"""
    text: str = Field(..., description="Generated response")
    provider: str = Field(..., description="Which backend handled this request")
    model: Optional[str] = Field(None, description="Model used (if applicable)")
    routed_at: str = Field(..., description="Routing timestamp")
    route_debug: Dict[str, Any] = Field(default_factory=dict, description="Debug info")


# ============================================================================
# Routing Strategy
# ============================================================================

def simple_routing_strategy(req: RouteRequest) -> str:
    """
    Determines which provider should handle the request.
    
    Current logic:
    - If metadata has "provider" → use that (explicit override)
    - Default: use DeepSeek (cloud_deepseek)
    
    Future enhancements:
    - Complexity estimation (simple → local_slm, complex → cloud)
    - Locale-based routing (Ukrainian → prefer local)
    - Policy checks (permissions, quotas)
    - Load balancing
    """
    
    # Allow explicit provider override
    if "provider" in req.metadata:
        provider = req.metadata["provider"]
        logger.info(f"Provider override via metadata: {provider}")
        return provider
    
    # Default: use DeepSeek
    if DEEPSEEK_API_KEY:
        logger.info(f"Routing to DeepSeek for user={req.context.user_id}")
        return "cloud_deepseek"
    else:
        logger.warning("No DeepSeek API key, falling back to echo")
        return "echo"


# ============================================================================
# Backend Providers
# ============================================================================

def call_backend(provider: str, req: RouteRequest) -> RouteResponse:
    """
    Execute request with specified provider.
    
    Current providers:
    - echo: Simple echo response
    - cloud_deepseek: DeepSeek chat API
    - local_slm: Ollama local models
    
    Future: cloud_openai, cloud_anthropic, dify_flow, crewai_team
    """
    
    routed_at = dt.datetime.utcnow().isoformat()
    
    if provider == "echo":
        reply = f"[echo] {req.message}"
        debug = {
            "note": "Echo provider - no LLM",
            "context": req.context.dict()
        }
        
        return RouteResponse(
            text=reply,
            provider=provider,
            model="none",
            routed_at=routed_at,
            route_debug=debug,
        )
    
    elif provider == "cloud_deepseek":
        if not DEEPSEEK_API_KEY:
            raise HTTPException(status_code=500, detail="DeepSeek API key not configured")
        
        try:
            logger.info(f"Calling DeepSeek API for user={req.context.user_id}")
            
            client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)
            
            messages = [
                {"role": "system", "content": "Ти - DAGI (Decentralized Agent Gateway Interface), асистент для DAARION.city та microDAO екосистеми. Відповідай українською мовою, будь корисним та дружнім."},
                {"role": "user", "content": req.message}
            ]
            
            response = client.chat.completions.create(
                model=DEEPSEEK_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=2000
            )
            
            reply = response.choices[0].message.content
            
            debug = {
                "model": DEEPSEEK_MODEL,
                "finish_reason": response.choices[0].finish_reason,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                }
            }
            
            logger.info(f"DeepSeek response: {response.usage.total_tokens} tokens")
            
            return RouteResponse(
                text=reply,
                provider=provider,
                model=DEEPSEEK_MODEL,
                routed_at=routed_at,
                route_debug=debug
            )
            
        except Exception as e:
            logger.error(f"DeepSeek API error: {e}")
            raise HTTPException(status_code=500, detail=f"DeepSeek error: {str(e)}")
    
    elif provider == "local_slm":
        try:
            logger.info(f"Calling Ollama API for user={req.context.user_id}")
            
            # Call Ollama API
            payload = {
                "model": OLLAMA_MODEL,
                "prompt": f"Ти - DAGI, асистент для DAARION.city. Відповідай українською мовою.\n\nПитання: {req.message}\n\nВідповідь:",
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "num_predict": 500
                }
            }
            
            with httpx.Client(timeout=60.0) as client:
                response = client.post(
                    f"{OLLAMA_BASE_URL}/api/generate",
                    json=payload
                )
                response.raise_for_status()
                result = response.json()
            
            reply = result.get("response", "").strip()
            
            debug = {
                "model": OLLAMA_MODEL,
                "ollama_url": OLLAMA_BASE_URL,
                "total_duration": result.get("total_duration"),
                "load_duration": result.get("load_duration"),
                "eval_count": result.get("eval_count"),
                "eval_duration": result.get("eval_duration")
            }
            
            logger.info(f"Ollama response: {result.get('eval_count', 0)} tokens")
            
            return RouteResponse(
                text=reply,
                provider=provider,
                model=OLLAMA_MODEL,
                routed_at=routed_at,
                route_debug=debug
            )
            
        except Exception as e:
            logger.error(f"Ollama API error: {e}")
            raise HTTPException(status_code=500, detail=f"Ollama error: {str(e)}")
    
    # Unknown provider
    logger.error(f"Provider '{provider}' not implemented")
    raise HTTPException(status_code=500, detail=f"Provider '{provider}' not implemented")


# ============================================================================
# Endpoints
# ============================================================================

@app.get("/health")
def health():
    """Health check endpoint"""
    available_providers = ["echo"]
    
    if DEEPSEEK_API_KEY:
        available_providers.append("cloud_deepseek")
    
    # Check Ollama availability
    try:
        with httpx.Client(timeout=2.0) as client:
            response = client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if response.status_code == 200:
                available_providers.append("local_slm")
    except:
        pass
    
    return {
        "status": "ok",
        "service": "dagi-router",
        "version": "0.3.0",
        "providers": available_providers,
        "capabilities": ["multi_provider_routing", "deepseek_integration", "ollama_integration"]
    }


@app.post("/v1/router/route", response_model=RouteResponse)
def route(req: RouteRequest):
    """Main routing endpoint - single entry point for all agent requests"""
    logger.info(f"Route request: user={req.context.user_id}, msg_len={len(req.message)}")
    
    try:
        provider = simple_routing_strategy(req)
        resp = call_backend(provider, req)
        logger.info(f"Route success: provider={provider}, model={resp.model}")
        return resp
    except Exception as e:
        logger.error(f"Route failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/router/providers")
def list_providers():
    """List available backend providers"""
    providers = [
        {"name": "echo", "status": "active", "description": "Echo provider (no LLM)"}
    ]
    
    if DEEPSEEK_API_KEY:
        providers.append({
            "name": "cloud_deepseek",
            "status": "active",
            "description": f"DeepSeek AI - {DEEPSEEK_MODEL}",
            "model": DEEPSEEK_MODEL
        })
    
    # Check Ollama
    try:
        with httpx.Client(timeout=2.0) as client:
            response = client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if response.status_code == 200:
                providers.append({
                    "name": "local_slm",
                    "status": "active",
                    "description": f"Ollama (local) - {OLLAMA_MODEL}",
                    "model": OLLAMA_MODEL
                })
    except:
        providers.append({
            "name": "local_slm",
            "status": "unavailable",
            "description": "Ollama (not reachable)"
        })
    
    return {
        "providers": providers,
        "coming_soon": [
            "cloud_openai (OpenAI GPT)",
            "cloud_anthropic (Anthropic Claude)",
            "dify_flow (Dify workflows)",
            "crewai_team (CrewAI teams)"
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9100)
