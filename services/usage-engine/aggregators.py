"""
Usage Data Aggregators
Queries and aggregates usage data from database
"""
import asyncpg
from datetime import datetime, timedelta
from typing import Optional, List

from models import (
    UsageSummary,
    ModelUsage,
    AgentUsage,
    ToolUsage,
    UsageQueryRequest
)

class UsageAggregator:
    """Aggregates usage data for reporting"""
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
    
    async def get_summary(
        self,
        microdao_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        period_hours: int = 24
    ) -> UsageSummary:
        """Get aggregated usage summary"""
        
        period_start = datetime.utcnow() - timedelta(hours=period_hours)
        period_end = datetime.utcnow()
        
        async with self.db_pool.acquire() as conn:
            # LLM stats
            llm_stats = await conn.fetchrow("""
                SELECT
                    COUNT(*) as calls,
                    SUM(total_tokens) as tokens_total,
                    SUM(prompt_tokens) as tokens_prompt,
                    SUM(completion_tokens) as tokens_completion,
                    AVG(latency_ms) as latency_avg
                FROM usage_llm
                WHERE timestamp >= $1 AND timestamp <= $2
                    AND ($3::text IS NULL OR microdao_id = $3)
                    AND ($4::text IS NULL OR agent_id = $4)
            """, period_start, period_end, microdao_id, agent_id)
            
            # Tool stats
            tool_stats = await conn.fetchrow("""
                SELECT
                    COUNT(*) as calls,
                    SUM(CASE WHEN success THEN 1 ELSE 0 END) as success,
                    SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed,
                    AVG(latency_ms) as latency_avg
                FROM usage_tool
                WHERE timestamp >= $1 AND timestamp <= $2
                    AND ($3::text IS NULL OR microdao_id = $3)
                    AND ($4::text IS NULL OR agent_id = $4)
            """, period_start, period_end, microdao_id, agent_id)
            
            # Agent stats
            agent_stats = await conn.fetchrow("""
                SELECT
                    COUNT(*) as invocations,
                    SUM(CASE WHEN success THEN 1 ELSE 0 END) as success,
                    SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed
                FROM usage_agent
                WHERE timestamp >= $1 AND timestamp <= $2
                    AND ($3::text IS NULL OR microdao_id = $3)
                    AND ($4::text IS NULL OR agent_id = $4)
            """, period_start, period_end, microdao_id, agent_id)
            
            # Message stats
            message_stats = await conn.fetchrow("""
                SELECT
                    COUNT(*) as sent,
                    SUM(message_length) as total_length
                FROM usage_message
                WHERE timestamp >= $1 AND timestamp <= $2
                    AND ($3::text IS NULL OR microdao_id = $3)
            """, period_start, period_end, microdao_id)
        
        return UsageSummary(
            period_start=period_start,
            period_end=period_end,
            microdao_id=microdao_id,
            agent_id=agent_id,
            
            llm_calls_total=llm_stats['calls'] or 0,
            llm_tokens_total=llm_stats['tokens_total'] or 0,
            llm_tokens_prompt=llm_stats['tokens_prompt'] or 0,
            llm_tokens_completion=llm_stats['tokens_completion'] or 0,
            llm_latency_avg_ms=float(llm_stats['latency_avg'] or 0),
            
            tool_calls_total=tool_stats['calls'] or 0,
            tool_calls_success=tool_stats['success'] or 0,
            tool_calls_failed=tool_stats['failed'] or 0,
            tool_latency_avg_ms=float(tool_stats['latency_avg'] or 0),
            
            agent_invocations_total=agent_stats['invocations'] or 0,
            agent_invocations_success=agent_stats['success'] or 0,
            agent_invocations_failed=agent_stats['failed'] or 0,
            
            messages_sent=message_stats['sent'] or 0,
            messages_total_length=message_stats['total_length'] or 0
        )
    
    async def get_model_breakdown(
        self,
        microdao_id: Optional[str] = None,
        period_hours: int = 24
    ) -> List[ModelUsage]:
        """Get usage breakdown by model"""
        
        period_start = datetime.utcnow() - timedelta(hours=period_hours)
        period_end = datetime.utcnow()
        
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT
                    model,
                    provider,
                    COUNT(*) as calls,
                    SUM(total_tokens) as tokens,
                    AVG(latency_ms) as latency_avg
                FROM usage_llm
                WHERE timestamp >= $1 AND timestamp <= $2
                    AND ($3::text IS NULL OR microdao_id = $3)
                GROUP BY model, provider
                ORDER BY tokens DESC
                LIMIT 20
            """, period_start, period_end, microdao_id)
        
        return [
            ModelUsage(
                model=row['model'],
                provider=row['provider'],
                calls=row['calls'],
                tokens=row['tokens'] or 0,
                avg_latency_ms=float(row['latency_avg'] or 0)
            )
            for row in rows
        ]
    
    async def get_agent_breakdown(
        self,
        microdao_id: Optional[str] = None,
        period_hours: int = 24
    ) -> List[AgentUsage]:
        """Get usage breakdown by agent"""
        
        period_start = datetime.utcnow() - timedelta(hours=period_hours)
        period_end = datetime.utcnow()
        
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT
                    a.agent_id,
                    COUNT(DISTINCT a.event_id) as invocations,
                    COALESCE(SUM(a.llm_calls), 0) as llm_calls,
                    COALESCE(SUM(a.tool_calls), 0) as tool_calls,
                    COALESCE(llm.tokens, 0) as total_tokens,
                    COALESCE(msg.messages, 0) as messages_sent
                FROM usage_agent a
                LEFT JOIN (
                    SELECT agent_id, SUM(total_tokens) as tokens
                    FROM usage_llm
                    WHERE timestamp >= $1 AND timestamp <= $2
                        AND ($3::text IS NULL OR microdao_id = $3)
                    GROUP BY agent_id
                ) llm ON llm.agent_id = a.agent_id
                LEFT JOIN (
                    SELECT actor_id, COUNT(*) as messages
                    FROM usage_message
                    WHERE timestamp >= $1 AND timestamp <= $2
                        AND actor_type = 'agent'
                        AND ($3::text IS NULL OR microdao_id = $3)
                    GROUP BY actor_id
                ) msg ON msg.actor_id = a.agent_id
                WHERE a.timestamp >= $1 AND a.timestamp <= $2
                    AND ($3::text IS NULL OR a.microdao_id = $3)
                GROUP BY a.agent_id, llm.tokens, msg.messages
                ORDER BY invocations DESC
                LIMIT 20
            """, period_start, period_end, microdao_id)
        
        return [
            AgentUsage(
                agent_id=row['agent_id'],
                invocations=row['invocations'],
                llm_calls=row['llm_calls'],
                tool_calls=row['tool_calls'],
                messages_sent=row['messages_sent'],
                total_tokens=row['total_tokens']
            )
            for row in rows
        ]
    
    async def get_tool_breakdown(
        self,
        microdao_id: Optional[str] = None,
        period_hours: int = 24
    ) -> List[ToolUsage]:
        """Get usage breakdown by tool"""
        
        period_start = datetime.utcnow() - timedelta(hours=period_hours)
        period_end = datetime.utcnow()
        
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT
                    tool_id,
                    tool_name,
                    COUNT(*) as calls,
                    AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END) as success_rate,
                    AVG(latency_ms) as latency_avg
                FROM usage_tool
                WHERE timestamp >= $1 AND timestamp <= $2
                    AND ($3::text IS NULL OR microdao_id = $3)
                GROUP BY tool_id, tool_name
                ORDER BY calls DESC
                LIMIT 20
            """, period_start, period_end, microdao_id)
        
        return [
            ToolUsage(
                tool_id=row['tool_id'],
                tool_name=row['tool_name'],
                calls=row['calls'],
                success_rate=float(row['success_rate'] or 0),
                avg_latency_ms=float(row['latency_avg'] or 0)
            )
            for row in rows
        ]




