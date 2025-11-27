"""
DAARION PDP Service (Policy Decision Point)
Port: 7012
Centralized access control decisions
"""
import os
import asyncpg
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from models import PolicyRequest, PolicyDecision
from engine import evaluate
from policy_store import PolicyStore

# ============================================================================
# Configuration
# ============================================================================

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/daarion")

# ============================================================================
# Global State
# ============================================================================

policy_store: PolicyStore | None = None
db_pool: asyncpg.Pool | None = None

# ============================================================================
# App Setup
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown"""
    global policy_store, db_pool
    
    print("🚀 Starting PDP Service...")
    
    # Load policy store
    policy_store = PolicyStore()
    print("✅ Policy store loaded")
    
    # Database connection (for audit logging)
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    print("✅ Database pool created")
    
    print("✅ PDP Service ready")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down PDP Service...")
    if db_pool:
        await db_pool.close()

app = FastAPI(
    title="DAARION PDP Service",
    version="1.0.0",
    description="Policy Decision Point for access control",
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

@app.post("/internal/pdp/evaluate", response_model=PolicyDecision)
async def evaluate_policy(request: PolicyRequest):
    """
    Evaluate access control policy
    
    Returns permit/deny decision with reason
    """
    
    # Evaluate policy
    decision = evaluate(request, policy_store)
    
    # Log to audit (async, best-effort)
    if db_pool:
        try:
            await log_audit(request, decision)
        except Exception as e:
            print(f"⚠️  Audit log failed: {e}")
            # Don't fail the request if audit fails
    
    print(f"📋 PDP: {request.actor.actor_id} → {request.action} on {request.resource.type}:{request.resource.id} = {decision.effect} ({decision.reason})")
    
    return decision

async def log_audit(request: PolicyRequest, decision: PolicyDecision):
    """Write audit log entry"""
    import json
    
    async with db_pool.acquire() as conn:
        # Check if table exists
        table_exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'security_audit'
            )
        """)
        
        if not table_exists:
            print("⚠️  security_audit table not found, skipping audit log")
            return
        
        await conn.execute("""
            INSERT INTO security_audit
            (actor_id, actor_type, action, resource_type, resource_id, decision, reason, context)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """,
            request.actor.actor_id,
            request.actor.actor_type.value,
            request.action.value,
            request.resource.type.value,
            request.resource.id,
            decision.effect,
            decision.reason,
            json.dumps(request.context or {})
        )

@app.get("/internal/pdp/policies")
async def list_policies():
    """List loaded policies (for debugging)"""
    return {
        "microdao_policies": len(policy_store.microdao_policies),
        "channel_policies": len(policy_store.channel_policies),
        "tool_policies": len(policy_store.tool_policies),
        "agent_policies": len(policy_store.agent_policies)
    }

@app.get("/health")
async def health():
    """Health check"""
    return {
        "status": "ok",
        "service": "pdp-service",
        "policies_loaded": policy_store is not None
    }

# ============================================================================
# Run
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7012)




