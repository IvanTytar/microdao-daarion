"""
Matrix User Provisioning for DAARION Auth Service

This module handles automatic Matrix user creation when users register in DAARION.
"""

import hashlib
import hmac
import httpx
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

SYNAPSE_ADMIN_URL = os.getenv("SYNAPSE_ADMIN_URL", "http://daarion-synapse:8008")
REGISTRATION_SECRET = os.getenv("SYNAPSE_REGISTRATION_SECRET", "daarion_reg_secret_2024")


async def generate_matrix_mac(
    nonce: str,
    username: str,
    password: str,
    admin: bool = False,
    user_type: Optional[str] = None
) -> str:
    """Generate HMAC for Synapse registration."""
    mac = hmac.new(
        key=REGISTRATION_SECRET.encode('utf-8'),
        digestmod=hashlib.sha1
    )
    
    mac.update(nonce.encode('utf-8'))
    mac.update(b"\x00")
    mac.update(username.encode('utf-8'))
    mac.update(b"\x00")
    mac.update(password.encode('utf-8'))
    mac.update(b"\x00")
    mac.update(b"admin" if admin else b"notadmin")
    
    if user_type:
        mac.update(b"\x00")
        mac.update(user_type.encode('utf-8'))
    
    return mac.hexdigest()


async def provision_matrix_user(
    user_id: str,
    email: str,
    display_name: Optional[str] = None,
    is_admin: bool = False
) -> dict:
    """
    Create a Matrix user for a DAARION user.
    
    Args:
        user_id: DAARION user ID (UUID)
        email: User email
        display_name: Optional display name
        is_admin: Whether user should be Matrix admin
        
    Returns:
        dict with matrix_user_id and access_token
    """
    # Generate Matrix username from DAARION user_id
    # Use first 8 chars of UUID for readability
    matrix_username = f"daarion_{user_id[:8].replace('-', '')}"
    
    # Generate a secure password (user won't need it - they'll use SSO)
    matrix_password = hashlib.sha256(
        f"{user_id}:{REGISTRATION_SECRET}".encode()
    ).hexdigest()[:32]
    
    async with httpx.AsyncClient() as client:
        try:
            # Step 1: Get nonce
            nonce_response = await client.get(
                f"{SYNAPSE_ADMIN_URL}/_synapse/admin/v1/register"
            )
            nonce_response.raise_for_status()
            nonce = nonce_response.json()["nonce"]
            
            # Step 2: Generate MAC
            mac = await generate_matrix_mac(
                nonce=nonce,
                username=matrix_username,
                password=matrix_password,
                admin=is_admin
            )
            
            # Step 3: Register user
            register_response = await client.post(
                f"{SYNAPSE_ADMIN_URL}/_synapse/admin/v1/register",
                json={
                    "nonce": nonce,
                    "username": matrix_username,
                    "password": matrix_password,
                    "admin": is_admin,
                    "mac": mac,
                    "displayname": display_name or email.split("@")[0],
                }
            )
            register_response.raise_for_status()
            
            result = register_response.json()
            logger.info(f"Matrix user created: {result['user_id']}")
            
            return {
                "matrix_user_id": result["user_id"],
                "access_token": result.get("access_token"),
                "device_id": result.get("device_id"),
                "home_server": "app.daarion.space"
            }
            
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 400:
                error_detail = e.response.json().get("error", "")
                if "User ID already taken" in error_detail:
                    logger.info(f"Matrix user already exists: {matrix_username}")
                    return {
                        "matrix_user_id": f"@{matrix_username}:daarion.space",
                        "access_token": None,
                        "device_id": None,
                        "home_server": "app.daarion.space",
                        "already_exists": True
                    }
            logger.error(f"Failed to create Matrix user: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Matrix provisioning error: {e}")
            raise


async def get_matrix_login_token(matrix_user_id: str) -> Optional[str]:
    """
    Get a login token for existing Matrix user.
    This allows SSO-style login without password.
    """
    # TODO: Implement when needed
    # This requires Synapse's login token API
    pass


async def update_matrix_profile(
    matrix_user_id: str,
    display_name: Optional[str] = None,
    avatar_url: Optional[str] = None,
    access_token: str = None
) -> bool:
    """Update Matrix user profile."""
    async with httpx.AsyncClient() as client:
        try:
            if display_name:
                await client.put(
                    f"{SYNAPSE_ADMIN_URL}/_matrix/client/v3/profile/{matrix_user_id}/displayname",
                    json={"displayname": display_name},
                    headers={"Authorization": f"Bearer {access_token}"} if access_token else {}
                )
            
            if avatar_url:
                await client.put(
                    f"{SYNAPSE_ADMIN_URL}/_matrix/client/v3/profile/{matrix_user_id}/avatar_url",
                    json={"avatar_url": avatar_url},
                    headers={"Authorization": f"Bearer {access_token}"} if access_token else {}
                )
            
            return True
        except Exception as e:
            logger.error(f"Failed to update Matrix profile: {e}")
            return False

