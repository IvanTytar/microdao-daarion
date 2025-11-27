"""
DAARION LLM Proxy Service
Port: 7007
Multi-provider LLM gateway with usage tracking and rate limiting
"""
import os
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from models import LLMRequest, LLMResponse
from router import ModelRouter
from middlewares import RateLimiter, UsageTracker
from providers import OpenAIProvider, DeepSeekProvider, LocalProvider

# ============================================================================
# App Setup
# ============================================================================

model_router = ModelRouter()
rate_limiter = RateLimiter(requests_per_minute=10)
usage_tracker = UsageTracker()

providers = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown"""
    # Startup
    print("🚀 Starting LLM Proxy service...")
    
    # Initialize providers
    for provider_name, provider_config in model_router.providers.items():
        if provider_name == "openai":
            providers[provider_name] = OpenAIProvider(provider_config)
        elif provider_name == "deepseek":
            providers[provider_name] = DeepSeekProvider(provider_config)
        elif provider_name == "local":
            providers[provider_name] = LocalProvider(provider_config)
        print(f"✅ Initialized provider: {provider_name}")
    
    print(f"✅ LLM Proxy ready with {len(model_router.models)} models")
    print(f"📋 Available models: {', '.join(model_router.get_available_models())}")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down LLM Proxy...")
    for provider in providers.values():
        if hasattr(provider, 'close'):
            await provider.close()

app = FastAPI(
    title="DAARION LLM Proxy",
    version="1.0.0",
    description="Multi-provider LLM gateway",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# API Endpoints
# ============================================================================

@app.post("/internal/llm/proxy", response_model=LLMResponse)
async def llm_proxy(
    request: LLMRequest,
    x_internal_secret: str = Header(None, alias="X-Internal-Secret")
):
    """
    Proxy LLM requests to appropriate provider
    
    Internal-only endpoint (requires X-Internal-Secret header)
    """
    # Simple auth check (for Phase 3)
    expected_secret = os.getenv("LLM_PROXY_SECRET", "dev-secret-token")
    if x_internal_secret != expected_secret:
        raise HTTPException(401, "Invalid or missing X-Internal-Secret header")
    
    # Extract metadata
    agent_id = request.metadata.get("agent_id")
    microdao_id = request.metadata.get("microdao_id")
    
    # Rate limiting (per agent)
    if agent_id:
        allowed, remaining = rate_limiter.check_limit(f"agent:{agent_id}")
        if not allowed:
            raise HTTPException(429, f"Rate limit exceeded for agent {agent_id}")
    
    # Route model
    try:
        model_config, provider_config = model_router.route_model(request.model)
    except ValueError as e:
        raise HTTPException(400, str(e))
    
    # Get provider instance
    provider = providers.get(model_config.provider)
    if not provider:
        raise HTTPException(500, f"Provider not initialized: {model_config.provider}")
    
    # Call LLM
    try:
        response = await provider.chat(
            messages=request.messages,
            model_name=model_config.physical_name,
            max_tokens=request.max_tokens or model_config.max_tokens,
            temperature=request.temperature,
            top_p=request.top_p
        )
        
        # Log usage
        usage_tracker.log_usage(
            agent_id=agent_id,
            microdao_id=microdao_id,
            model=request.model,
            provider=model_config.provider,
            prompt_tokens=response.usage.prompt_tokens,
            completion_tokens=response.usage.completion_tokens,
            latency_ms=response.latency_ms or 0,
            success=True
        )
        
        return response
    
    except Exception as e:
        # Log failure
        usage_tracker.log_usage(
            agent_id=agent_id,
            microdao_id=microdao_id,
            model=request.model,
            provider=model_config.provider,
            prompt_tokens=0,
            completion_tokens=0,
            latency_ms=0,
            success=False,
            error=str(e)
        )
        
        raise HTTPException(500, f"LLM request failed: {str(e)}")

@app.get("/internal/llm/models")
async def list_models():
    """List available models"""
    return {
        "models": [
            {
                "name": model_config.logical_name,
                "provider": model_config.provider,
                "physical_name": model_config.physical_name,
                "max_tokens": model_config.max_tokens
            }
            for model_config in model_router.models.values()
        ]
    }

@app.get("/internal/llm/usage")
async def get_usage(
    agent_id: str | None = None,
    x_internal_secret: str = Header(None, alias="X-Internal-Secret")
):
    """Get usage statistics"""
    expected_secret = os.getenv("LLM_PROXY_SECRET", "dev-secret-token")
    if x_internal_secret != expected_secret:
        raise HTTPException(401, "Invalid or missing X-Internal-Secret header")
    
    return usage_tracker.get_usage_summary(agent_id)

@app.get("/health")
async def health():
    """Health check"""
    return {
        "status": "ok",
        "service": "llm-proxy",
        "providers": list(providers.keys()),
        "models": len(model_router.models)
    }

# ============================================================================
# Run
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7007)




