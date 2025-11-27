"""
Session management routes
"""
from fastapi import APIRouter, HTTPException, Depends, Response
import asyncpg
from datetime import datetime, timedelta, timezone
import secrets
from models import LoginRequest, LoginResponse, ActorIdentity, ActorType
from actor_context import require_actor
import json

router = APIRouter(prefix="/auth", tags=["sessions"])

# Mock users for Phase 4
# In production, this would be in database with proper password hashing
MOCK_USERS = {
    "admin@daarion.city": {
        "actor_id": "user:1",
        "actor_type": "human",
        "microdao_ids": ["microdao:daarion"],
        "roles": ["system_admin", "microdao_owner"]
    },
    "user@daarion.city": {
        "actor_id": "user:93",
        "actor_type": "human",
        "microdao_ids": ["microdao:daarion", "microdao:7"],
        "roles": ["member", "microdao_owner"]
    },
    "sofia@agents.daarion.city": {
        "actor_id": "agent:sofia",
        "actor_type": "agent",
        "microdao_ids": ["microdao:daarion"],
        "roles": ["agent"]
    }
}

def get_db_pool(request) -> asyncpg.Pool:
    """Get database pool from app state"""
    return request.app.state.db_pool

@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    response: Response,
    db_pool: asyncpg.Pool = Depends(get_db_pool)
):
    """
    Login and get session token
    
    Phase 4: Mock implementation with predefined users
    Phase 5: Real Passkey integration
    """
    
    # Check mock users
    if request.email not in MOCK_USERS:
        raise HTTPException(401, "Invalid credentials")
    
    user_data = MOCK_USERS[request.email]
    
    # Build ActorIdentity
    actor = ActorIdentity(
        actor_id=user_data["actor_id"],
        actor_type=ActorType(user_data["actor_type"]),
        microdao_ids=user_data["microdao_ids"],
        roles=user_data["roles"]
    )
    
    # Generate session token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    # Store in database
    async with db_pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO sessions (token, actor_id, actor_data, expires_at)
            VALUES ($1, $2, $3, $4)
            """,
            token,
            actor.actor_id,
            json.dumps(actor.model_dump()),
            expires_at
        )
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        max_age=7 * 24 * 60 * 60,  # 7 days
        samesite="lax"
    )
    
    return LoginResponse(
        session_token=token,
        actor=actor,
        expires_at=expires_at
    )

@router.get("/me", response_model=ActorIdentity)
async def get_me(
    actor: ActorIdentity = Depends(require_actor)
):
    """Get current actor identity"""
    return actor

@router.post("/logout")
async def logout(
    response: Response,
    actor: ActorIdentity = Depends(require_actor),
    db_pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Logout and invalidate session"""
    
    # Invalidate all sessions for this actor
    async with db_pool.acquire() as conn:
        await conn.execute(
            "UPDATE sessions SET is_valid = false WHERE actor_id = $1",
            actor.actor_id
        )
    
    # Clear cookie
    response.delete_cookie("session_token")
    
    return {"status": "logged_out"}





