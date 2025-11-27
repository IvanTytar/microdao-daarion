"""
DAO Repository — Database operations for DAO
Phase 8: DAO Dashboard
"""
import uuid
from typing import List, Optional
from datetime import datetime
from decimal import Decimal
import asyncpg
from models import (
    DaoCreate, DaoUpdate, DaoRead, DaoOverview,
    DaoMember, MemberAdd,
    DaoTreasuryItem, TreasuryUpdate
)

class DaoRepository:
    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool
    
    # ========================================================================
    # DAO — CRUD
    # ========================================================================
    
    async def create_dao(
        self,
        data: DaoCreate,
        owner_user_id: str
    ) -> DaoRead:
        """Create new DAO and add owner as member"""
        dao_id = uuid.uuid4()
        
        async with self.db.acquire() as conn:
            async with conn.transaction():
                # Insert DAO
                await conn.execute(
                    """
                    INSERT INTO dao (
                        id, slug, name, description, microdao_id, owner_user_id,
                        governance_model, voting_period_seconds, quorum_percent
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    """,
                    dao_id,
                    data.slug,
                    data.name,
                    data.description,
                    uuid.UUID(data.microdao_id),
                    uuid.UUID(owner_user_id),
                    data.governance_model or 'simple',
                    data.voting_period_seconds or 604800,
                    data.quorum_percent or 20
                )
                
                # Add owner as member
                await conn.execute(
                    """
                    INSERT INTO dao_members (dao_id, user_id, role)
                    VALUES ($1, $2, $3)
                    """,
                    dao_id,
                    uuid.UUID(owner_user_id),
                    "owner"
                )
                
                # Log audit event
                await conn.execute(
                    """
                    INSERT INTO dao_audit_log (dao_id, actor_user_id, event_type, event_payload)
                    VALUES ($1, $2, $3, $4)
                    """,
                    dao_id,
                    uuid.UUID(owner_user_id),
                    "dao_created",
                    '{"slug": "' + data.slug + '"}'
                )
                
                # Get created DAO
                return await self._get_dao_by_id(conn, dao_id)
    
    async def update_dao(
        self,
        dao_id: str,
        data: DaoUpdate
    ) -> Optional[DaoRead]:
        """Update DAO"""
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
        
        if data.governance_model is not None:
            updates.append(f"governance_model = ${param_idx}")
            values.append(data.governance_model)
            param_idx += 1
        
        if data.voting_period_seconds is not None:
            updates.append(f"voting_period_seconds = ${param_idx}")
            values.append(data.voting_period_seconds)
            param_idx += 1
        
        if data.quorum_percent is not None:
            updates.append(f"quorum_percent = ${param_idx}")
            values.append(data.quorum_percent)
            param_idx += 1
        
        if data.is_active is not None:
            updates.append(f"is_active = ${param_idx}")
            values.append(data.is_active)
            param_idx += 1
        
        if not updates:
            return await self.get_dao_by_id(dao_id)
        
        updates.append(f"updated_at = NOW()")
        values.append(uuid.UUID(dao_id))
        
        query = f"""
            UPDATE dao
            SET {', '.join(updates)}
            WHERE id = ${param_idx}
            RETURNING id
        """
        
        async with self.db.acquire() as conn:
            row = await conn.fetchrow(query, *values)
            if not row:
                return None
            return await self._get_dao_by_id(conn, row['id'])
    
    async def delete_dao(self, dao_id: str) -> bool:
        """Soft delete DAO (set is_active = false)"""
        result = await self.db.execute(
            """
            UPDATE dao
            SET is_active = false, updated_at = NOW()
            WHERE id = $1
            """,
            uuid.UUID(dao_id)
        )
        return result == "UPDATE 1"
    
    async def get_dao_by_slug(self, slug: str) -> Optional[DaoRead]:
        """Get DAO by slug"""
        async with self.db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, slug, name, description, microdao_id, owner_user_id,
                       governance_model, voting_period_seconds, quorum_percent,
                       is_active, created_at, updated_at
                FROM dao
                WHERE slug = $1
                """,
                slug
            )
            
            if not row:
                return None
            
            return self._row_to_dao(row)
    
    async def get_dao_by_id(self, dao_id: str) -> Optional[DaoRead]:
        """Get DAO by ID"""
        async with self.db.acquire() as conn:
            return await self._get_dao_by_id(conn, uuid.UUID(dao_id))
    
    async def _get_dao_by_id(
        self, 
        conn: asyncpg.Connection, 
        dao_id: uuid.UUID
    ) -> Optional[DaoRead]:
        """Internal: get DAO by ID within transaction"""
        row = await conn.fetchrow(
            """
            SELECT id, slug, name, description, microdao_id, owner_user_id,
                   governance_model, voting_period_seconds, quorum_percent,
                   is_active, created_at, updated_at
            FROM dao
            WHERE id = $1
            """,
            dao_id
        )
        
        if not row:
            return None
        
        return self._row_to_dao(row)
    
    async def list_daos_for_user(self, user_id: str) -> List[DaoRead]:
        """List DAOs where user is a member"""
        rows = await self.db.fetch(
            """
            SELECT d.id, d.slug, d.name, d.description, d.microdao_id, d.owner_user_id,
                   d.governance_model, d.voting_period_seconds, d.quorum_percent,
                   d.is_active, d.created_at, d.updated_at
            FROM dao d
            INNER JOIN dao_members dm ON dm.dao_id = d.id
            WHERE dm.user_id = $1 AND d.is_active = true
            ORDER BY d.created_at DESC
            """,
            uuid.UUID(user_id)
        )
        
        return [self._row_to_dao(row) for row in rows]
    
    async def get_dao_overview(self, dao_id: str) -> Optional[DaoOverview]:
        """Get DAO overview with aggregated stats"""
        dao = await self.get_dao_by_id(dao_id)
        if not dao:
            return None
        
        # Get counts
        async with self.db.acquire() as conn:
            members_count = await conn.fetchval(
                "SELECT COUNT(*) FROM dao_members WHERE dao_id = $1",
                uuid.UUID(dao_id)
            )
            
            active_proposals_count = await conn.fetchval(
                "SELECT COUNT(*) FROM dao_proposals WHERE dao_id = $1 AND status = 'active'",
                uuid.UUID(dao_id)
            )
            
            total_proposals_count = await conn.fetchval(
                "SELECT COUNT(*) FROM dao_proposals WHERE dao_id = $1",
                uuid.UUID(dao_id)
            )
        
        # Get treasury items
        treasury_items = await self.get_treasury_items(dao_id)
        
        return DaoOverview(
            dao=dao,
            members_count=members_count or 0,
            active_proposals_count=active_proposals_count or 0,
            total_proposals_count=total_proposals_count or 0,
            treasury_items=treasury_items
        )
    
    async def get_dao_overview_by_slug(self, slug: str) -> Optional[DaoOverview]:
        """Helper to get overview by slug"""
        dao = await self.get_dao_by_slug(slug)
        if not dao:
            return None
        return await self.get_dao_overview(dao.id)
    
    def _row_to_dao(self, row: asyncpg.Record) -> DaoRead:
        """Convert database row to DaoRead"""
        return DaoRead(
            id=str(row['id']),
            slug=row['slug'],
            name=row['name'],
            description=row['description'],
            microdao_id=str(row['microdao_id']),
            owner_user_id=str(row['owner_user_id']),
            governance_model=row['governance_model'],
            voting_period_seconds=row['voting_period_seconds'],
            quorum_percent=row['quorum_percent'],
            is_active=row['is_active'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )
    
    # ========================================================================
    # Members
    # ========================================================================
    
    async def list_members(self, dao_id: str) -> List[DaoMember]:
        """List all members of a DAO"""
        rows = await self.db.fetch(
            """
            SELECT id, dao_id, user_id, role, joined_at
            FROM dao_members
            WHERE dao_id = $1
            ORDER BY joined_at ASC
            """,
            uuid.UUID(dao_id)
        )
        
        return [
            DaoMember(
                id=str(row['id']),
                dao_id=str(row['dao_id']),
                user_id=str(row['user_id']),
                role=row['role'],
                joined_at=row['joined_at']
            )
            for row in rows
        ]
    
    async def add_member(
        self,
        dao_id: str,
        user_id: str,
        role: str = "member"
    ) -> DaoMember:
        """Add member to DAO"""
        member_id = uuid.uuid4()
        
        row = await self.db.fetchrow(
            """
            INSERT INTO dao_members (id, dao_id, user_id, role)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (dao_id, user_id) DO UPDATE
            SET role = EXCLUDED.role
            RETURNING id, dao_id, user_id, role, joined_at
            """,
            member_id,
            uuid.UUID(dao_id),
            uuid.UUID(user_id),
            role
        )
        
        return DaoMember(
            id=str(row['id']),
            dao_id=str(row['dao_id']),
            user_id=str(row['user_id']),
            role=row['role'],
            joined_at=row['joined_at']
        )
    
    async def remove_member(self, member_id: str) -> bool:
        """Remove member from DAO"""
        result = await self.db.execute(
            """
            DELETE FROM dao_members
            WHERE id = $1
            """,
            uuid.UUID(member_id)
        )
        return result == "DELETE 1"
    
    async def get_user_role_in_dao(
        self,
        dao_id: str,
        user_id: str
    ) -> Optional[str]:
        """Get user's role in DAO (or None if not a member)"""
        row = await self.db.fetchrow(
            """
            SELECT role FROM dao_members
            WHERE dao_id = $1 AND user_id = $2
            """,
            uuid.UUID(dao_id),
            uuid.UUID(user_id)
        )
        return row['role'] if row else None
    
    # ========================================================================
    # Treasury
    # ========================================================================
    
    async def get_treasury_items(self, dao_id: str) -> List[DaoTreasuryItem]:
        """Get all treasury items for a DAO"""
        rows = await self.db.fetch(
            """
            SELECT token_symbol, contract_address, balance
            FROM dao_treasury
            WHERE dao_id = $1
            ORDER BY token_symbol
            """,
            uuid.UUID(dao_id)
        )
        
        return [
            DaoTreasuryItem(
                token_symbol=row['token_symbol'],
                contract_address=row['contract_address'],
                balance=row['balance']
            )
            for row in rows
        ]
    
    async def apply_treasury_delta(
        self,
        dao_id: str,
        token_symbol: str,
        delta: Decimal
    ) -> DaoTreasuryItem:
        """Apply delta to treasury balance"""
        async with self.db.acquire() as conn:
            async with conn.transaction():
                # Get current balance
                row = await conn.fetchrow(
                    """
                    SELECT balance FROM dao_treasury
                    WHERE dao_id = $1 AND token_symbol = $2
                    FOR UPDATE
                    """,
                    uuid.UUID(dao_id),
                    token_symbol
                )
                
                current_balance = row['balance'] if row else Decimal('0')
                new_balance = current_balance + delta
                
                if new_balance < 0:
                    raise ValueError(f"Insufficient balance: {current_balance} + {delta} = {new_balance} < 0")
                
                # Upsert
                row = await conn.fetchrow(
                    """
                    INSERT INTO dao_treasury (dao_id, token_symbol, balance, updated_at)
                    VALUES ($1, $2, $3, NOW())
                    ON CONFLICT (dao_id, token_symbol) DO UPDATE
                    SET balance = $3, updated_at = NOW()
                    RETURNING token_symbol, contract_address, balance
                    """,
                    uuid.UUID(dao_id),
                    token_symbol,
                    new_balance
                )
                
                return DaoTreasuryItem(
                    token_symbol=row['token_symbol'],
                    contract_address=row['contract_address'],
                    balance=row['balance']
                )
    
    async def set_treasury_balance(
        self,
        dao_id: str,
        token_symbol: str,
        balance: Decimal
    ) -> DaoTreasuryItem:
        """Set treasury balance directly"""
        if balance < 0:
            raise ValueError(f"Balance cannot be negative: {balance}")
        
        row = await self.db.fetchrow(
            """
            INSERT INTO dao_treasury (dao_id, token_symbol, balance, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (dao_id, token_symbol) DO UPDATE
            SET balance = $3, updated_at = NOW()
            RETURNING token_symbol, contract_address, balance
            """,
            uuid.UUID(dao_id),
            token_symbol,
            balance
        )
        
        return DaoTreasuryItem(
            token_symbol=row['token_symbol'],
            contract_address=row['contract_address'],
            balance=row['balance']
        )

