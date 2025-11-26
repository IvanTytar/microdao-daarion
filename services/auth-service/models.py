"""
Auth Service Data Models
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


# Request Models
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    display_name: Optional[str] = Field(None, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class IntrospectRequest(BaseModel):
    token: str


# Response Models
class UserResponse(BaseModel):
    id: UUID
    email: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    roles: List[str] = []
    is_active: bool = True
    created_at: datetime


class RegisterResponse(BaseModel):
    user_id: UUID
    email: str
    display_name: Optional[str] = None
    roles: List[str] = ["user"]
    matrix_user_id: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int
    user: UserResponse


class RefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int


class IntrospectResponse(BaseModel):
    active: bool
    sub: Optional[str] = None
    email: Optional[str] = None
    roles: Optional[List[str]] = None
    exp: Optional[int] = None


class StatusResponse(BaseModel):
    status: str


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class ErrorResponse(BaseModel):
    detail: str
