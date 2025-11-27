"""
Governance Engine — Voting power calculation and proposal evaluation
Phase 8: DAO Dashboard
"""
from decimal import Decimal, getcontext
from typing import List, Optional
from models import DaoRead, ProposalRead, VoteRead, ProposalResult

# Set decimal precision
getcontext().prec = 28

class GovernanceEngine:
    """Engine for calculating voting power and evaluating proposals"""
    
    # ========================================================================
    # Voting Power Calculation
    # ========================================================================
    
    async def calculate_voting_power(
        self,
        actor_user_id: str,
        dao: DaoRead,
        base_power: Optional[Decimal] = None
    ) -> Decimal:
        """
        Calculate voting power based on DAO's governance model
        
        Args:
            actor_user_id: User ID
            dao: DAO configuration
            base_power: Base voting power (e.g., token balance)
        
        Returns:
            Calculated voting weight
        """
        if dao.governance_model == "simple":
            return await self.calculate_voting_power_simple(actor_user_id, dao)
        elif dao.governance_model == "quadratic":
            return await self.calculate_voting_power_quadratic(actor_user_id, dao, base_power or Decimal('1'))
        elif dao.governance_model == "delegated":
            return await self.calculate_voting_power_delegated(actor_user_id, dao)
        else:
            # Default to simple
            return Decimal('1')
    
    async def calculate_voting_power_simple(
        self,
        actor_user_id: str,
        dao: DaoRead
    ) -> Decimal:
        """
        Simple voting: 1 user = 1 vote
        
        Returns:
            Always returns 1
        """
        return Decimal('1')
    
    async def calculate_voting_power_quadratic(
        self,
        actor_user_id: str,
        dao: DaoRead,
        base_power: Decimal
    ) -> Decimal:
        """
        Quadratic voting: weight = sqrt(base_power)
        Reduces influence of whales
        
        Args:
            actor_user_id: User ID
            dao: DAO configuration
            base_power: Base voting power (e.g., token count)
        
        Returns:
            Square root of base power
        """
        if base_power <= 0:
            return Decimal('0')
        
        # Calculate square root using Decimal
        return base_power.sqrt()
    
    async def calculate_voting_power_delegated(
        self,
        actor_user_id: str,
        dao: DaoRead
    ) -> Decimal:
        """
        Delegated voting: includes delegated votes from other users
        
        TODO: Implement delegation graph traversal
        For MVP, return simple power
        
        Args:
            actor_user_id: User ID
            dao: DAO configuration
        
        Returns:
            Voting power including delegated votes
        """
        # For MVP, return simple power
        # In production, would query delegation graph
        return Decimal('1')
    
    # ========================================================================
    # Proposal Evaluation
    # ========================================================================
    
    async def evaluate_proposal(
        self,
        dao: DaoRead,
        proposal: ProposalRead,
        votes: List[VoteRead],
        total_eligible_voters: int
    ) -> ProposalResult:
        """
        Evaluate proposal outcome based on votes and DAO configuration
        
        Args:
            dao: DAO configuration
            proposal: Proposal being evaluated
            votes: List of all votes
            total_eligible_voters: Total number of DAO members eligible to vote
        
        Returns:
            ProposalResult with evaluation outcome
        """
        # Calculate vote counts
        votes_yes = len([v for v in votes if v.vote_value == 'yes'])
        votes_no = len([v for v in votes if v.vote_value == 'no'])
        votes_abstain = len([v for v in votes if v.vote_value == 'abstain'])
        
        # Calculate vote weights
        total_weight_yes = sum([v.weight for v in votes if v.vote_value == 'yes'], Decimal('0'))
        total_weight_no = sum([v.weight for v in votes if v.vote_value == 'no'], Decimal('0'))
        total_weight_abstain = sum([v.weight for v in votes if v.vote_value == 'abstain'], Decimal('0'))
        
        # Total participating voters
        total_participating = votes_yes + votes_no + votes_abstain
        
        # Get quorum requirement (from proposal override or DAO default)
        quorum_percent = proposal.quorum_percent_override or dao.quorum_percent
        quorum_required = Decimal(str(quorum_percent))
        
        # Calculate participation rate
        if total_eligible_voters > 0:
            participation_rate = Decimal(str(total_participating)) / Decimal(str(total_eligible_voters)) * Decimal('100')
        else:
            participation_rate = Decimal('0')
        
        # Check if quorum is reached
        quorum_reached = participation_rate >= quorum_required
        
        # Determine if proposal passed
        is_passed = False
        winning_option = None
        
        if quorum_reached:
            # Simple majority: yes must be greater than no
            if total_weight_yes > total_weight_no:
                is_passed = True
                winning_option = "yes"
            elif total_weight_no > total_weight_yes:
                winning_option = "no"
            # If equal, proposal fails (no action taken)
        
        # Determine status
        if proposal.status == "active":
            # Proposal is still active, don't change status
            status = "active"
        elif not quorum_reached:
            status = "rejected"  # Failed due to quorum
        elif is_passed:
            status = "passed"
        else:
            status = "rejected"
        
        return ProposalResult(
            proposal_id=proposal.id,
            status=status,
            votes_yes=votes_yes,
            votes_no=votes_no,
            votes_abstain=votes_abstain,
            total_weight_yes=total_weight_yes,
            total_weight_no=total_weight_no,
            total_weight_abstain=total_weight_abstain,
            total_eligible_voters=total_eligible_voters,
            quorum_required=quorum_required,
            quorum_reached=quorum_reached,
            is_passed=is_passed,
            winning_option=winning_option
        )
    
    # ========================================================================
    # Helper Methods
    # ========================================================================
    
    def calculate_participation_rate(
        self,
        total_votes: int,
        total_eligible: int
    ) -> Decimal:
        """Calculate participation rate as percentage"""
        if total_eligible == 0:
            return Decimal('0')
        return Decimal(str(total_votes)) / Decimal(str(total_eligible)) * Decimal('100')

