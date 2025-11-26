"""
Security utilities: password hashing, JWT tokens
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from uuid import UUID
from jose import jwt, JWTError
from passlib.context import CryptContext

from config import get_settings

settings = get_settings()

# Password hashing
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=settings.bcrypt_rounds
)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


# JWT Token operations
def create_access_token(
    user_id: UUID,
    email: str,
    display_name: Optional[str],
    roles: list[str]
) -> str:
    """Create a JWT access token"""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(seconds=settings.access_token_ttl)
    
    payload = {
        "sub": str(user_id),
        "email": email,
        "name": display_name,
        "roles": roles,
        "type": "access",
        "iss": "daarion-auth",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp())
    }
    
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: UUID, session_id: UUID) -> str:
    """Create a JWT refresh token"""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(seconds=settings.refresh_token_ttl)
    
    payload = {
        "sub": str(user_id),
        "session_id": str(session_id),
        "type": "refresh",
        "iss": "daarion-auth",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp())
    }
    
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            options={"verify_exp": True}
        )
        return payload
    except JWTError:
        return None


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode an access token and verify it's the correct type"""
    payload = decode_token(token)
    if payload and payload.get("type") == "access":
        return payload
    return None


def decode_refresh_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode a refresh token and verify it's the correct type"""
    payload = decode_token(token)
    if payload and payload.get("type") == "refresh":
        return payload
    return None

