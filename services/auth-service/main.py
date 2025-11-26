"""
Auth Service - Main Application
DAARION.city Authentication & Authorization
"""
from fastapi import FastAPI, HTTPException, Depends, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import Optional
from uuid import UUID
import logging

from config import get_settings
from models import (
    RegisterRequest, RegisterResponse,
    LoginRequest, TokenResponse,
    RefreshRequest, RefreshResponse,
    LogoutRequest, StatusResponse,
    IntrospectRequest, IntrospectResponse,
    UserResponse, HealthResponse, ErrorResponse
)
from database import (
    get_pool, close_pool,
    create_user, get_user_by_email, get_user_by_id, get_user_roles,
    create_session, get_session, revoke_session, is_session_valid
)
from security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_access_token, decode_refresh_token
)
from matrix_provisioning import provision_matrix_user

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"Starting {settings.service_name} v{settings.service_version}")
    await get_pool()
    yield
    # Shutdown
    await close_pool()
    logger.info("Auth service stopped")


app = FastAPI(
    title="DAARION Auth Service",
    description="Authentication & Authorization for DAARION.city",
    version=settings.service_version,
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependency: Get current user from token
async def get_current_user(
    authorization: Optional[str] = Header(None)
) -> Optional[dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    token = authorization[7:]  # Remove "Bearer " prefix
    payload = decode_access_token(token)
    
    if not payload:
        return None
    
    return payload


async def require_auth(
    authorization: Optional[str] = Header(None)
) -> dict:
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


# Health check
@app.get("/healthz", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="ok",
        service=settings.service_name,
        version=settings.service_version
    )


# Register
@app.post("/api/auth/register", response_model=RegisterResponse, status_code=201)
async def register(request: RegisterRequest):
    # Check if user exists
    existing = await get_user_by_email(request.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password and create user
    password_hash = hash_password(request.password)
    user = await create_user(
        email=request.email,
        password_hash=password_hash,
        display_name=request.display_name
    )
    
    logger.info(f"User registered: {request.email}")
    
    # Provision Matrix user (async, don't block registration)
    matrix_info = None
    try:
        matrix_info = await provision_matrix_user(
            user_id=str(user['id']),
            email=user['email'],
            display_name=user['display_name']
        )
        logger.info(f"Matrix user provisioned: {matrix_info.get('matrix_user_id')}")
    except Exception as e:
        logger.warning(f"Matrix provisioning failed (non-blocking): {e}")
    
    return RegisterResponse(
        user_id=user['id'],
        email=user['email'],
        display_name=user['display_name'],
        roles=["user"],
        matrix_user_id=matrix_info.get('matrix_user_id') if matrix_info else None
    )


# Login
@app.post("/api/auth/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    req: Request
):
    # Get user
    user = await get_user_by_email(request.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(request.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if active
    if not user['is_active']:
        raise HTTPException(status_code=403, detail="Account is disabled")
    
    # Get roles
    roles = await get_user_roles(user['id'])
    if user['is_admin'] and 'admin' not in roles:
        roles.append('admin')
    
    # Create session
    user_agent = req.headers.get("user-agent")
    ip_address = req.client.host if req.client else None
    session_id = await create_session(
        user_id=user['id'],
        user_agent=user_agent,
        ip_address=ip_address,
        ttl_seconds=settings.refresh_token_ttl
    )
    
    # Create tokens
    access_token = create_access_token(
        user_id=user['id'],
        email=user['email'],
        display_name=user['display_name'],
        roles=roles
    )
    refresh_token = create_refresh_token(
        user_id=user['id'],
        session_id=session_id
    )
    
    logger.info(f"User logged in: {request.email}")
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
        expires_in=settings.access_token_ttl,
        user=UserResponse(
            id=user['id'],
            email=user['email'],
            display_name=user['display_name'],
            avatar_url=user['avatar_url'],
            roles=roles,
            is_active=user['is_active'],
            created_at=user['created_at']
        )
    )


# Refresh token
@app.post("/api/auth/refresh", response_model=RefreshResponse)
async def refresh(request: RefreshRequest):
    # Decode refresh token
    payload = decode_refresh_token(request.refresh_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    # Check session
    session_id = UUID(payload['session_id'])
    if not await is_session_valid(session_id):
        raise HTTPException(status_code=401, detail="Session expired or revoked")
    
    # Get user
    user_id = UUID(payload['sub'])
    user = await get_user_by_id(user_id)
    if not user or not user['is_active']:
        raise HTTPException(status_code=401, detail="User not found or disabled")
    
    # Get roles
    roles = await get_user_roles(user_id)
    if user['is_admin'] and 'admin' not in roles:
        roles.append('admin')
    
    # Revoke old session and create new one
    await revoke_session(session_id)
    new_session_id = await create_session(
        user_id=user_id,
        ttl_seconds=settings.refresh_token_ttl
    )
    
    # Create new tokens
    access_token = create_access_token(
        user_id=user_id,
        email=user['email'],
        display_name=user['display_name'],
        roles=roles
    )
    new_refresh_token = create_refresh_token(
        user_id=user_id,
        session_id=new_session_id
    )
    
    return RefreshResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="Bearer",
        expires_in=settings.access_token_ttl
    )


# Logout
@app.post("/api/auth/logout", response_model=StatusResponse)
async def logout(request: LogoutRequest):
    # Decode refresh token
    payload = decode_refresh_token(request.refresh_token)
    if payload:
        session_id = UUID(payload['session_id'])
        await revoke_session(session_id)
    
    return StatusResponse(status="ok")


# Get current user
@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(require_auth)):
    user_id = UUID(current_user['sub'])
    user = await get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    roles = await get_user_roles(user_id)
    if user['is_admin'] and 'admin' not in roles:
        roles.append('admin')
    
    return UserResponse(
        id=user['id'],
        email=user['email'],
        display_name=user['display_name'],
        avatar_url=user['avatar_url'],
        roles=roles,
        is_active=user['is_active'],
        created_at=user['created_at']
    )


# Introspect token (for other services)
@app.post("/api/auth/introspect", response_model=IntrospectResponse)
async def introspect(request: IntrospectRequest):
    payload = decode_access_token(request.token)
    
    if not payload:
        return IntrospectResponse(active=False)
    
    return IntrospectResponse(
        active=True,
        sub=payload.get('sub'),
        email=payload.get('email'),
        roles=payload.get('roles', []),
        exp=payload.get('exp')
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.debug
    )
