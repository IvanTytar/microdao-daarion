"""
Votes Repository — Database operations for votes
Phase 8: DAO Dashboard
"""
import uuid
from typing import List, Optional
from decimal import Decimal
import asyncpg
from models import VoteCreate, VoteRead

class VoteRepository:
    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool
    
    async def create_or_update_vote(
        self,
        proposal_id: str,
        voter_user_id: str,
        vote_value: str,
        weight: Decimal,
        raw_power: Optional[Decimal] = None
    ) -> VoteRead:
        """Create or update vote (user can change their vote)"""
        vote_id = uuid.uuid4()
        
        row = await self.db.fetchrow(
            """
            INSERT INTO dao_votes (id, proposal_id, voter_user_id, vote_value, weight, raw_power)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (proposal_id, voter_user_id) DO UPDATE
            SET vote_value = EXCLUDED.vote_value,
                weight = EXCLUDED.weight,
                raw_power = EXCLUDED.raw_power,
                created_at = NOW()
            RETURNING id, proposal_id, voter_user_id, vote_value, weight, raw_power, created_at
            """,
            vote_id,
            uuid.UUID(proposal_id),
            uuid.UUID(voter_user_id),
            vote_value,
            weight,
            raw_power
        )
        
        return self._row_to_vote(row)
    
    async def get_vote(
        self,
        proposal_id: str,
        voter_user_id: str
    ) -> Optional[VoteRead]:
        """Get user's vote on a proposal"""
        row = await self.db.fetchrow(
            """
            SELECT id, proposal_id, voter_user_id, vote_value, weight, raw_power, created_at
            FROM dao_votes
            WHERE proposal_id = $1 AND voter_user_id = $2
            """,
            uuid.UUID(proposal_id),
            uuid.UUID(voter_user_id)
        )
        
        if not row:
            return None
        
        return self._row_to_vote(row)
    
    async def list_votes_for_proposal(
        self,
        proposal_id: str
    ) -> List[VoteRead]:
        """List all votes for a proposal"""
        rows = await self.db.fetch(
            """
            SELECT id, proposal_id, voter_user_id, vote_value, weight, raw_power, created_at
            FROM dao_votes
            WHERE proposal_id = $1
            ORDER BY created_at DESC
            """,
            uuid.UUID(proposal_id)
        )
        
        return [self._row_to_vote(row) for row in rows]
    
    async def count_votes_by_value(
        self,
        proposal_id: str
    ) -> dict:
        """Count votes by value (yes/no/abstain)"""
        row = await self.db.fetchrow(
            """
            SELECT 
                COUNT(CASE WHEN vote_value = 'yes' THEN 1 END) as yes_count,
                COUNT(CASE WHEN vote_value = 'no' THEN 1 END) as no_count,
                COUNT(CASE WHEN vote_value = 'abstain' THEN 1 END) as abstain_count,
                COUNT(*) as total_count
            FROM dao_votes
            WHERE proposal_id = $1
            """,
            uuid.UUID(proposal_id)
        )
        
        return {
            'yes': row['yes_count'] or 0,
            'no': row['no_count'] or 0,
            'abstain': row['abstain_count'] or 0,
            'total': row['total_count'] or 0
        }
    
    async def get_vote_weights_sum(
        self,
        proposal_id: str
    ) -> dict:
        """Get sum of weights by vote value"""
        row = await self.db.fetchrow(
            """
            SELECT 
                COALESCE(SUM(CASE WHEN vote_value = 'yes' THEN weight ELSE 0 END), 0) as yes_weight,
                COALESCE(SUM(CASE WHEN vote_value = 'no' THEN weight ELSE 0 END), 0) as no_weight,
                COALESCE(SUM(CASE WHEN vote_value = 'abstain' THEN weight ELSE 0 END), 0) as abstain_weight,
                COALESCE(SUM(weight), 0) as total_weight
            FROM dao_votes
            WHERE proposal_id = $1
            """,
            uuid.UUID(proposal_id)
        )
        
        return {
            'yes': Decimal(str(row['yes_weight'] or 0)),
            'no': Decimal(str(row['no_weight'] or 0)),
            'abstain': Decimal(str(row['abstain_weight'] or 0)),
            'total': Decimal(str(row['total_weight'] or 0))
        }
    
    def _row_to_vote(self, row: asyncpg.Record) -> VoteRead:
        """Convert database row to VoteRead"""
        return VoteRead(
            id=str(row['id']),
            proposal_id=str(row['proposal_id']),
            voter_user_id=str(row['voter_user_id']),
            vote_value=row['vote_value'],
            weight=row['weight'],
            raw_power=row['raw_power'],
            created_at=row['created_at']
        )

