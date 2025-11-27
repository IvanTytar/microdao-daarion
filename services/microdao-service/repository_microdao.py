"""
MicroDAO Repository — Database operations
Phase 7: Backend Completion
"""
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
import asyncpg
from models import (
    MicrodaoCreate, MicrodaoUpdate, MicrodaoRead, 
    MicrodaoMember, MemberAdd,
    TreasuryItem, TreasuryUpdate,
    SettingItem
)

class MicrodaoRepository:
    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool
    
    # ========================================================================
    # MicroDAO — CRUD
    # ========================================================================
    
    async def create_microdao(
        self,
        data: MicrodaoCreate,
        owner_user_id: str
    ) -> MicrodaoRead:
        """Create new microDAO and add owner as member"""
        microdao_id = uuid.uuid4()
        external_id = f"microdao:{microdao_id.hex[:8]}"
        
        async with self.db.acquire() as conn:
            async with conn.transaction():
                # Insert microDAO
                await conn.execute(
                    """
                    INSERT INTO microdaos (id, external_id, slug, name, description, owner_user_id)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    """,
                    microdao_id,
                    external_id,
                    data.slug,
                    data.name,
                    data.description,
                    uuid.UUID(owner_user_id)
                )
                
                # Add owner as member
                await conn.execute(
                    """
                    INSERT INTO microdao_members (microdao_id, user_id, role)
                    VALUES ($1, $2, $3)
                    """,
                    microdao_id,
                    uuid.UUID(owner_user_id),
                    "owner"
                )
                
                # Get created microDAO
                return await self._get_microdao_by_id(conn, microdao_id)
    
    async def update_microdao(
        self,
        microdao_id: str,
        data: MicrodaoUpdate
    ) -> Optional[MicrodaoRead]:
        """Update microDAO"""
        # Build update query dynamically
        updates = []
        values = []
        param_idx = 1
        
        if data.name is not None:
            updates.append(f"name = ${param_idx}")
            values.append(data.name)
            param_idx += 1
        
        if data.description is not None:
            updates.append(f"description = ${param_idx}")
            values.append(data.description)
            param_idx += 1
        
        if data.is_active is not None:
            updates.append(f"is_active = ${param_idx}")
            values.append(data.is_active)
            param_idx += 1
        
        if not updates:
            return await self.get_microdao_by_id(microdao_id)
        
        updates.append(f"updated_at = NOW()")
        values.append(uuid.UUID(microdao_id))
        
        query = f"""
            UPDATE microdaos
            SET {', '.join(updates)}
            WHERE id = ${param_idx}
            RETURNING id
        """
        
        async with self.db.acquire() as conn:
            row = await conn.fetchrow(query, *values)
            if not row:
                return None
            return await self._get_microdao_by_id(conn, row['id'])
    
    async def delete_microdao(self, microdao_id: str) -> bool:
        """Soft delete microDAO (set is_active = false)"""
        result = await self.db.execute(
            """
            UPDATE microdaos
            SET is_active = false, updated_at = NOW()
            WHERE id = $1
            """,
            uuid.UUID(microdao_id)
        )
        return result == "UPDATE 1"
    
    async def get_microdao_by_slug(self, slug: str) -> Optional[MicrodaoRead]:
        """Get microDAO by slug"""
        async with self.db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT m.id, m.external_id, m.slug, m.name, m.description,
                       m.owner_user_id, m.is_active, m.created_at, m.updated_at,
                       COUNT(DISTINCT mm.id) as member_count,
                       COUNT(DISTINCT a.id) as agent_count
                FROM microdaos m
                LEFT JOIN microdao_members mm ON mm.microdao_id = m.id
                LEFT JOIN agents a ON a.microdao_id = m.id AND a.is_active = true
                WHERE m.slug = $1
                GROUP BY m.id
                """,
                slug
            )
            
            if not row:
                return None
            
            return self._row_to_microdao(row)
    
    async def get_microdao_by_id(self, microdao_id: str) -> Optional[MicrodaoRead]:
        """Get microDAO by ID"""
        async with self.db.acquire() as conn:
            return await self._get_microdao_by_id(conn, uuid.UUID(microdao_id))
    
    async def _get_microdao_by_id(
        self, 
        conn: asyncpg.Connection, 
        microdao_id: uuid.UUID
    ) -> Optional[MicrodaoRead]:
        """Internal: get microDAO by ID within transaction"""
        row = await conn.fetchrow(
            """
            SELECT m.id, m.external_id, m.slug, m.name, m.description,
                   m.owner_user_id, m.is_active, m.created_at, m.updated_at,
                   COUNT(DISTINCT mm.id) as member_count,
                   COUNT(DISTINCT a.id) as agent_count
            FROM microdaos m
            LEFT JOIN microdao_members mm ON mm.microdao_id = m.id
            LEFT JOIN agents a ON a.microdao_id = m.id AND a.is_active = true
            WHERE m.id = $1
            GROUP BY m.id
            """,
            microdao_id
        )
        
        if not row:
            return None
        
        return self._row_to_microdao(row)
    
    async def list_microdaos(self) -> List[MicrodaoRead]:
        """List all active microDAOs"""
        rows = await self.db.fetch(
            """
            SELECT m.id, m.external_id, m.slug, m.name, m.description,
                   m.owner_user_id, m.is_active, m.created_at, m.updated_at,
                   COUNT(DISTINCT mm.id) as member_count,
                   COUNT(DISTINCT a.id) as agent_count
            FROM microdaos m
            LEFT JOIN microdao_members mm ON mm.microdao_id = m.id
            LEFT JOIN agents a ON a.microdao_id = m.id AND a.is_active = true
            WHERE m.is_active = true
            GROUP BY m.id
            ORDER BY m.created_at DESC
            """
        )
        
        return [self._row_to_microdao(row) for row in rows]
    
    async def list_microdaos_for_user(self, user_id: str) -> List[MicrodaoRead]:
        """List microDAOs where user is a member"""
        rows = await self.db.fetch(
            """
            SELECT m.id, m.external_id, m.slug, m.name, m.description,
                   m.owner_user_id, m.is_active, m.created_at, m.updated_at,
                   COUNT(DISTINCT mm.id) as member_count,
                   COUNT(DISTINCT a.id) as agent_count
            FROM microdaos m
            INNER JOIN microdao_members mm ON mm.microdao_id = m.id
            LEFT JOIN agents a ON a.microdao_id = m.id AND a.is_active = true
            WHERE mm.user_id = $1 AND m.is_active = true
            GROUP BY m.id
            ORDER BY m.created_at DESC
            """,
            uuid.UUID(user_id)
        )
        
        return [self._row_to_microdao(row) for row in rows]
    
    def _row_to_microdao(self, row: asyncpg.Record) -> MicrodaoRead:
        """Convert database row to MicrodaoRead"""
        return MicrodaoRead(
            id=str(row['id']),
            external_id=row['external_id'],
            slug=row['slug'],
            name=row['name'],
            description=row['description'],
            owner_user_id=str(row['owner_user_id']),
            is_active=row['is_active'],
            created_at=row['created_at'],
            updated_at=row['updated_at'],
            member_count=row['member_count'] or 0,
            agent_count=row['agent_count'] or 0
        )
    
    # ========================================================================
    # Members
    # ========================================================================
    
    async def list_members(self, microdao_id: str) -> List[MicrodaoMember]:
        """List all members of a microDAO"""
        rows = await self.db.fetch(
            """
            SELECT id, microdao_id, user_id, role, joined_at
            FROM microdao_members
            WHERE microdao_id = $1
            ORDER BY joined_at ASC
            """,
            uuid.UUID(microdao_id)
        )
        
        return [
            MicrodaoMember(
                id=str(row['id']),
                microdao_id=str(row['microdao_id']),
                user_id=str(row['user_id']),
                role=row['role'],
                joined_at=row['joined_at']
            )
            for row in rows
        ]
    
    async def add_member(
        self,
        microdao_id: str,
        user_id: str,
        role: str = "member"
    ) -> MicrodaoMember:
        """Add member to microDAO"""
        member_id = uuid.uuid4()
        
        row = await self.db.fetchrow(
            """
            INSERT INTO microdao_members (id, microdao_id, user_id, role)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (microdao_id, user_id) DO UPDATE
            SET role = EXCLUDED.role
            RETURNING id, microdao_id, user_id, role, joined_at
            """,
            member_id,
            uuid.UUID(microdao_id),
            uuid.UUID(user_id),
            role
        )
        
        return MicrodaoMember(
            id=str(row['id']),
            microdao_id=str(row['microdao_id']),
            user_id=str(row['user_id']),
            role=row['role'],
            joined_at=row['joined_at']
        )
    
    async def remove_member(self, member_id: str) -> bool:
        """Remove member from microDAO"""
        result = await self.db.execute(
            """
            DELETE FROM microdao_members
            WHERE id = $1
            """,
            uuid.UUID(member_id)
        )
        return result == "DELETE 1"
    
    async def get_user_role_in_microdao(
        self,
        microdao_id: str,
        user_id: str
    ) -> Optional[str]:
        """Get user's role in microDAO (or None if not a member)"""
        row = await self.db.fetchrow(
            """
            SELECT role FROM microdao_members
            WHERE microdao_id = $1 AND user_id = $2
            """,
            uuid.UUID(microdao_id),
            uuid.UUID(user_id)
        )
        return row['role'] if row else None
    
    # ========================================================================
    # Treasury
    # ========================================================================
    
    async def get_treasury_items(self, microdao_id: str) -> List[TreasuryItem]:
        """Get all treasury items for a microDAO"""
        rows = await self.db.fetch(
            """
            SELECT token_symbol, balance
            FROM microdao_treasury
            WHERE microdao_id = $1
            ORDER BY token_symbol
            """,
            uuid.UUID(microdao_id)
        )
        
        return [
            TreasuryItem(
                token_symbol=row['token_symbol'],
                balance=row['balance']
            )
            for row in rows
        ]
    
    async def apply_treasury_delta(
        self,
        microdao_id: str,
        token_symbol: str,
        delta: Decimal
    ) -> TreasuryItem:
        """
        Apply delta to treasury balance
        Creates entry if doesn't exist
        Raises error if resulting balance would be negative
        """
        async with self.db.acquire() as conn:
            async with conn.transaction():
                # Get current balance
                row = await conn.fetchrow(
                    """
                    SELECT balance FROM microdao_treasury
                    WHERE microdao_id = $1 AND token_symbol = $2
                    FOR UPDATE
                    """,
                    uuid.UUID(microdao_id),
                    token_symbol
                )
                
                current_balance = row['balance'] if row else Decimal('0')
                new_balance = current_balance + delta
                
                if new_balance < 0:
                    raise ValueError(f"Insufficient balance: {current_balance} + {delta} = {new_balance} < 0")
                
                # Upsert
                row = await conn.fetchrow(
                    """
                    INSERT INTO microdao_treasury (microdao_id, token_symbol, balance, updated_at)
                    VALUES ($1, $2, $3, NOW())
                    ON CONFLICT (microdao_id, token_symbol) DO UPDATE
                    SET balance = $3, updated_at = NOW()
                    RETURNING token_symbol, balance
                    """,
                    uuid.UUID(microdao_id),
                    token_symbol,
                    new_balance
                )
                
                return TreasuryItem(
                    token_symbol=row['token_symbol'],
                    balance=row['balance']
                )
    
    async def set_treasury_balance(
        self,
        microdao_id: str,
        token_symbol: str,
        balance: Decimal
    ) -> TreasuryItem:
        """Set treasury balance directly (for admin operations)"""
        if balance < 0:
            raise ValueError(f"Balance cannot be negative: {balance}")
        
        row = await self.db.fetchrow(
            """
            INSERT INTO microdao_treasury (microdao_id, token_symbol, balance, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (microdao_id, token_symbol) DO UPDATE
            SET balance = $3, updated_at = NOW()
            RETURNING token_symbol, balance
            """,
            uuid.UUID(microdao_id),
            token_symbol,
            balance
        )
        
        return TreasuryItem(
            token_symbol=row['token_symbol'],
            balance=row['balance']
        )
    
    # ========================================================================
    # Settings
    # ========================================================================
    
    async def get_settings(self, microdao_id: str) -> Dict[str, Any]:
        """Get all settings for a microDAO as dict"""
        rows = await self.db.fetch(
            """
            SELECT key, value
            FROM microdao_settings
            WHERE microdao_id = $1
            """,
            uuid.UUID(microdao_id)
        )
        
        return {row['key']: row['value'] for row in rows}
    
    async def upsert_setting(
        self,
        microdao_id: str,
        key: str,
        value: Any
    ) -> None:
        """Upsert a single setting"""
        await self.db.execute(
            """
            INSERT INTO microdao_settings (microdao_id, key, value, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (microdao_id, key) DO UPDATE
            SET value = $3, updated_at = NOW()
            """,
            uuid.UUID(microdao_id),
            key,
            value
        )
    
    async def delete_setting(self, microdao_id: str, key: str) -> bool:
        """Delete a setting"""
        result = await self.db.execute(
            """
            DELETE FROM microdao_settings
            WHERE microdao_id = $1 AND key = $2
            """,
            uuid.UUID(microdao_id),
            key
        )
        return result == "DELETE 1"

