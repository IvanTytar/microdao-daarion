"""
Proposals Repository — Database operations for proposals
Phase 8: DAO Dashboard
"""
import uuid
from typing import List, Optional
from datetime import datetime
import asyncpg
from models import ProposalCreate, ProposalUpdate, ProposalRead, ProposalWithVotes
from decimal import Decimal

class ProposalRepository:
    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool
    
    async def create_proposal(
        self,
        dao_id: str,
        created_by_user_id: str,
        data: ProposalCreate
    ) -> ProposalRead:
        """Create new proposal"""
        proposal_id = uuid.uuid4()
        
        row = await self.db.fetchrow(
            """
            INSERT INTO dao_proposals (
                id, dao_id, slug, title, description,
                created_by_user_id, start_at, end_at,
                governance_model_override, quorum_percent_override
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, dao_id, slug, title, description, created_by_user_id,
                      created_at, start_at, end_at, status,
                      governance_model_override, quorum_percent_override
            """,
            proposal_id,
            uuid.UUID(dao_id),
            data.slug,
            data.title,
            data.description,
            uuid.UUID(created_by_user_id),
            data.start_at,
            data.end_at,
            data.governance_model_override,
            data.quorum_percent_override
        )
        
        return self._row_to_proposal(row)
    
    async def update_proposal(
        self,
        proposal_id: str,
        data: ProposalUpdate
    ) -> Optional[ProposalRead]:
        """Update proposal"""
        updates = []
        values = []
        param_idx = 1
        
        if data.title is not None:
            updates.append(f"title = ${param_idx}")
            values.append(data.title)
            param_idx += 1
        
        if data.description is not None:
            updates.append(f"description = ${param_idx}")
            values.append(data.description)
            param_idx += 1
        
        if data.start_at is not None:
            updates.append(f"start_at = ${param_idx}")
            values.append(data.start_at)
            param_idx += 1
        
        if data.end_at is not None:
            updates.append(f"end_at = ${param_idx}")
            values.append(data.end_at)
            param_idx += 1
        
        if not updates:
            return await self.get_proposal(proposal_id)
        
        values.append(uuid.UUID(proposal_id))
        
        query = f"""
            UPDATE dao_proposals
            SET {', '.join(updates)}
            WHERE id = ${param_idx}
            RETURNING id, dao_id, slug, title, description, created_by_user_id,
                      created_at, start_at, end_at, status,
                      governance_model_override, quorum_percent_override
        """
        
        row = await self.db.fetchrow(query, *values)
        if not row:
            return None
        
        return self._row_to_proposal(row)
    
    async def update_proposal_status(
        self,
        proposal_id: str,
        status: str
    ) -> Optional[ProposalRead]:
        """Update proposal status"""
        row = await self.db.fetchrow(
            """
            UPDATE dao_proposals
            SET status = $1
            WHERE id = $2
            RETURNING id, dao_id, slug, title, description, created_by_user_id,
                      created_at, start_at, end_at, status,
                      governance_model_override, quorum_percent_override
            """,
            status,
            uuid.UUID(proposal_id)
        )
        
        if not row:
            return None
        
        return self._row_to_proposal(row)
    
    async def get_proposal(self, proposal_id: str) -> Optional[ProposalRead]:
        """Get proposal by ID"""
        row = await self.db.fetchrow(
            """
            SELECT id, dao_id, slug, title, description, created_by_user_id,
                   created_at, start_at, end_at, status,
                   governance_model_override, quorum_percent_override
            FROM dao_proposals
            WHERE id = $1
            """,
            uuid.UUID(proposal_id)
        )
        
        if not row:
            return None
        
        return self._row_to_proposal(row)
    
    async def get_proposal_by_slug(
        self,
        dao_id: str,
        slug: str
    ) -> Optional[ProposalRead]:
        """Get proposal by DAO ID and slug"""
        row = await self.db.fetchrow(
            """
            SELECT id, dao_id, slug, title, description, created_by_user_id,
                   created_at, start_at, end_at, status,
                   governance_model_override, quorum_percent_override
            FROM dao_proposals
            WHERE dao_id = $1 AND slug = $2
            """,
            uuid.UUID(dao_id),
            slug
        )
        
        if not row:
            return None
        
        return self._row_to_proposal(row)
    
    async def list_proposals(
        self,
        dao_id: str,
        status: Optional[str] = None
    ) -> List[ProposalRead]:
        """List all proposals for a DAO, optionally filtered by status"""
        if status:
            rows = await self.db.fetch(
                """
                SELECT id, dao_id, slug, title, description, created_by_user_id,
                       created_at, start_at, end_at, status,
                       governance_model_override, quorum_percent_override
                FROM dao_proposals
                WHERE dao_id = $1 AND status = $2
                ORDER BY created_at DESC
                """,
                uuid.UUID(dao_id),
                status
            )
        else:
            rows = await self.db.fetch(
                """
                SELECT id, dao_id, slug, title, description, created_by_user_id,
                       created_at, start_at, end_at, status,
                       governance_model_override, quorum_percent_override
                FROM dao_proposals
                WHERE dao_id = $1
                ORDER BY created_at DESC
                """,
                uuid.UUID(dao_id)
            )
        
        return [self._row_to_proposal(row) for row in rows]
    
    async def get_proposal_with_votes(
        self,
        proposal_id: str
    ) -> Optional[ProposalWithVotes]:
        """Get proposal with voting statistics"""
        proposal = await self.get_proposal(proposal_id)
        if not proposal:
            return None
        
        # Get vote statistics
        stats = await self.db.fetchrow(
            """
            SELECT 
                COUNT(CASE WHEN vote_value = 'yes' THEN 1 END) as votes_yes,
                COUNT(CASE WHEN vote_value = 'no' THEN 1 END) as votes_no,
                COUNT(CASE WHEN vote_value = 'abstain' THEN 1 END) as votes_abstain,
                COALESCE(SUM(CASE WHEN vote_value = 'yes' THEN weight ELSE 0 END), 0) as total_weight_yes,
                COALESCE(SUM(CASE WHEN vote_value = 'no' THEN weight ELSE 0 END), 0) as total_weight_no,
                COALESCE(SUM(CASE WHEN vote_value = 'abstain' THEN weight ELSE 0 END), 0) as total_weight_abstain
            FROM dao_votes
            WHERE proposal_id = $1
            """,
            uuid.UUID(proposal_id)
        )
        
        # Calculate if passed (simple majority for now)
        total_weight = stats['total_weight_yes'] + stats['total_weight_no'] + stats['total_weight_abstain']
        quorum_reached = False
        is_passed = False
        
        if total_weight > 0:
            # For now, simple check: is quorum reached and yes > no
            quorum_reached = True  # Simplified for MVP
            is_passed = stats['total_weight_yes'] > stats['total_weight_no']
        
        return ProposalWithVotes(
            **proposal.model_dump(),
            votes_yes=stats['votes_yes'] or 0,
            votes_no=stats['votes_no'] or 0,
            votes_abstain=stats['votes_abstain'] or 0,
            total_weight_yes=Decimal(str(stats['total_weight_yes'] or 0)),
            total_weight_no=Decimal(str(stats['total_weight_no'] or 0)),
            total_weight_abstain=Decimal(str(stats['total_weight_abstain'] or 0)),
            quorum_reached=quorum_reached,
            is_passed=is_passed
        )
    
    def _row_to_proposal(self, row: asyncpg.Record) -> ProposalRead:
        """Convert database row to ProposalRead"""
        return ProposalRead(
            id=str(row['id']),
            dao_id=str(row['dao_id']),
            slug=row['slug'],
            title=row['title'],
            description=row['description'],
            created_by_user_id=str(row['created_by_user_id']),
            created_at=row['created_at'],
            start_at=row['start_at'],
            end_at=row['end_at'],
            status=row['status'],
            governance_model_override=row['governance_model_override'],
            quorum_percent_override=row['quorum_percent_override']
        )

