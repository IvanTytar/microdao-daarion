"""
Passkey Store - Database operations for WebAuthn credentials
"""
import asyncpg
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import base64

class PasskeyStore:
    """Database layer for passkey operations"""
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
    
    # ========================================================================
    # User Operations
    # ========================================================================
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM users WHERE email = $1",
                email
            )
            return dict(row) if row else None
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM users WHERE id = $1::uuid",
                user_id
            )
            return dict(row) if row else None
    
    async def create_user(
        self,
        email: str,
        username: str,
        display_name: str
    ) -> Dict[str, Any]:
        """Create new user"""
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow("""
                INSERT INTO users (email, username, display_name)
                VALUES ($1, $2, $3)
                RETURNING *
            """, email, username, display_name)
            return dict(row)
    
    async def update_last_login(self, user_id: str):
        """Update user's last login timestamp"""
        async with self.db_pool.acquire() as conn:
            await conn.execute(
                "UPDATE users SET last_login_at = now() WHERE id = $1::uuid",
                user_id
            )
    
    # ========================================================================
    # Passkey Operations
    # ========================================================================
    
    async def create_passkey(
        self,
        user_id: str,
        credential_id: str,
        public_key: str,
        sign_count: int = 0,
        device_name: Optional[str] = None,
        transports: Optional[List[str]] = None,
        aaguid: Optional[str] = None,
        attestation_format: Optional[str] = None
    ) -> Dict[str, Any]:
        """Store new passkey credential"""
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow("""
                INSERT INTO passkeys
                (user_id, credential_id, public_key, sign_count, device_name, transports, aaguid, attestation_format)
                VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            """,
                user_id, credential_id, public_key, sign_count,
                device_name, transports, aaguid, attestation_format
            )
            return dict(row)
    
    async def get_passkeys_by_user_id(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all passkeys for a user"""
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM passkeys WHERE user_id = $1::uuid ORDER BY created_at DESC",
                user_id
            )
            return [dict(row) for row in rows]
    
    async def get_passkey_by_credential_id(self, credential_id: str) -> Optional[Dict[str, Any]]:
        """Get passkey by credential ID"""
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM passkeys WHERE credential_id = $1",
                credential_id
            )
            return dict(row) if row else None
    
    async def update_sign_count(self, credential_id: str, new_sign_count: int):
        """Update passkey sign count and last used timestamp"""
        async with self.db_pool.acquire() as conn:
            await conn.execute("""
                UPDATE passkeys
                SET sign_count = $2, last_used_at = now()
                WHERE credential_id = $1
            """, credential_id, new_sign_count)
    
    # ========================================================================
    # Challenge Operations
    # ========================================================================
    
    async def store_challenge(
        self,
        challenge: str,
        challenge_type: str,
        user_id: Optional[str] = None,
        email: Optional[str] = None,
        expires_in_seconds: int = 300  # 5 minutes
    ):
        """Store challenge for verification"""
        async with self.db_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO passkey_challenges
                (challenge, user_id, email, challenge_type, rp_id, origin, expires_at)
                VALUES ($1, $2::uuid, $3, $4, $5, $6, now() + interval '%s seconds')
            """ % expires_in_seconds,
                challenge, user_id, email, challenge_type,
                "localhost", "http://localhost:3000"
            )
    
    async def verify_challenge(
        self,
        challenge: str,
        challenge_type: str
    ) -> Optional[Dict[str, Any]]:
        """Verify and consume challenge"""
        async with self.db_pool.acquire() as conn:
            # Get challenge
            row = await conn.fetchrow("""
                SELECT * FROM passkey_challenges
                WHERE challenge = $1
                  AND challenge_type = $2
                  AND expires_at > now()
            """, challenge, challenge_type)
            
            if not row:
                return None
            
            # Delete challenge (one-time use)
            await conn.execute(
                "DELETE FROM passkey_challenges WHERE challenge = $1",
                challenge
            )
            
            return dict(row)
    
    async def cleanup_expired_challenges(self):
        """Remove expired challenges"""
        async with self.db_pool.acquire() as conn:
            await conn.execute(
                "DELETE FROM passkey_challenges WHERE expires_at < now()"
            )
    
    # ========================================================================
    # Session Operations
    # ========================================================================
    
    async def create_session(
        self,
        token: str,
        user_id: str,
        expires_in_days: int = 30
    ) -> Dict[str, Any]:
        """Create new session"""
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow("""
                INSERT INTO sessions (token, user_id, expires_at)
                VALUES ($1, $2::uuid, now() + interval '%s days')
                RETURNING *
            """ % expires_in_days, token, user_id)
            return dict(row)
    
    async def get_session(self, token: str) -> Optional[Dict[str, Any]]:
        """Get session by token"""
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT * FROM sessions
                WHERE token = $1 AND expires_at > now()
            """, token)
            return dict(row) if row else None
    
    async def delete_session(self, token: str):
        """Delete session"""
        async with self.db_pool.acquire() as conn:
            await conn.execute(
                "DELETE FROM sessions WHERE token = $1",
                token
            )
    
    async def cleanup_expired_sessions(self):
        """Remove expired sessions"""
        async with self.db_pool.acquire() as conn:
            await conn.execute(
                "DELETE FROM sessions WHERE expires_at < now()"
            )
    
    # ========================================================================
    # MicroDAO Memberships (for ActorIdentity)
    # ========================================================================
    
    async def get_user_microdao_memberships(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all microDAO memberships for a user"""
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT * FROM user_microdao_memberships
                WHERE user_id = $1::uuid AND left_at IS NULL
                ORDER BY joined_at DESC
            """, user_id)
            return [dict(row) for row in rows]





