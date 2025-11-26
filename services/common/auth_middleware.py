"""
Shared Auth Middleware for DAARION Services
Use this in agents-service, microdao-service, city-service, secondme-service
"""
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from jose import jwt, JWTError
import os

# JWT Configuration - must match auth-service
JWT_SECRET = os.getenv("AUTH_JWT_SECRET", "your-very-long-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"

# Security scheme
security = HTTPBearer(auto_error=False)


class AuthUser:
    """Authenticated user context"""
    def __init__(
        self,
        user_id: str,
        email: str,
        display_name: Optional[str],
        roles: List[str]
    ):
        self.user_id = user_id
        self.email = email
        self.display_name = display_name
        self.roles = roles
    
    def has_role(self, role: str) -> bool:
        return role in self.roles
    
    def is_admin(self) -> bool:
        return "admin" in self.roles
    
    def __repr__(self):
        return f"AuthUser(user_id={self.user_id}, email={self.email}, roles={self.roles})"


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={"verify_exp": True}
        )
        # Verify it's an access token
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[AuthUser]:
    """
    Get current user if authenticated, None otherwise.
    Use this for endpoints that work both with and without auth.
    """
    if not credentials:
        return None
    
    payload = decode_token(credentials.credentials)
    if not payload:
        return None
    
    return AuthUser(
        user_id=payload.get("sub"),
        email=payload.get("email"),
        display_name=payload.get("name"),
        roles=payload.get("roles", [])
    )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> AuthUser:
    """
    Get current user, raise 401 if not authenticated.
    Use this for protected endpoints.
    """
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return AuthUser(
        user_id=payload.get("sub"),
        email=payload.get("email"),
        display_name=payload.get("name"),
        roles=payload.get("roles", [])
    )


def require_role(role: str):
    """
    Dependency that requires a specific role.
    Usage: @app.get("/admin", dependencies=[Depends(require_role("admin"))])
    """
    async def role_checker(user: AuthUser = Depends(get_current_user)):
        if not user.has_role(role):
            raise HTTPException(
                status_code=403,
                detail=f"Role '{role}' required"
            )
        return user
    return role_checker


def require_any_role(roles: List[str]):
    """
    Dependency that requires any of the specified roles.
    """
    async def role_checker(user: AuthUser = Depends(get_current_user)):
        if not any(user.has_role(r) for r in roles):
            raise HTTPException(
                status_code=403,
                detail=f"One of roles {roles} required"
            )
        return user
    return role_checker


# Convenience aliases
RequireAuth = Depends(get_current_user)
OptionalAuth = Depends(get_current_user_optional)
RequireAdmin = Depends(require_role("admin"))

