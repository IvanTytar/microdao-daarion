#!/usr/bin/env python3
"""
Find orphan agents that don't belong to any MicroDAO.

This script checks:
1. Agents without MicroDAO membership
2. Agents without node_id (home node)
3. Agents that are not in router-config

Usage:
    python scripts/maintenance/find_orphan_agents.py
"""

import asyncio
import os
import asyncpg
from typing import List, Dict, Any

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/daarion"
)


async def get_pool():
    """Get database connection pool."""
    return await asyncpg.create_pool(DATABASE_URL)


async def find_agents_without_microdao(pool) -> List[Dict[str, Any]]:
    """Find agents that don't belong to any MicroDAO."""
    query = """
        SELECT a.id, a.display_name, a.kind, a.node_id, a.is_public, a.is_archived
        FROM agents a
        LEFT JOIN microdao_agents ma ON ma.agent_id = a.id
        WHERE ma.agent_id IS NULL
          AND COALESCE(a.is_archived, false) = false
        ORDER BY a.display_name
    """
    rows = await pool.fetch(query)
    return [dict(row) for row in rows]


async def find_agents_without_node(pool) -> List[Dict[str, Any]]:
    """Find agents without home node."""
    query = """
        SELECT id, display_name, kind
        FROM agents
        WHERE (node_id IS NULL OR node_id = '')
          AND COALESCE(is_archived, false) = false
        ORDER BY display_name
    """
    rows = await pool.fetch(query)
    return [dict(row) for row in rows]


async def find_microdao_without_orchestrator(pool) -> List[Dict[str, Any]]:
    """Find MicroDAOs without an orchestrator."""
    query = """
        SELECT m.id, m.slug, m.name, COUNT(ma.agent_id) as agents_count
        FROM microdaos m
        LEFT JOIN microdao_agents ma ON ma.microdao_id = m.id AND ma.role = 'orchestrator'
        WHERE COALESCE(m.is_archived, false) = false
        GROUP BY m.id
        HAVING COUNT(ma.agent_id) = 0
        ORDER BY m.name
    """
    rows = await pool.fetch(query)
    return [dict(row) for row in rows]


async def find_empty_microdao(pool) -> List[Dict[str, Any]]:
    """Find MicroDAOs with 0 agents."""
    query = """
        SELECT m.id, m.slug, m.name
        FROM microdaos m
        LEFT JOIN microdao_agents ma ON ma.microdao_id = m.id
        WHERE COALESCE(m.is_archived, false) = false
        GROUP BY m.id
        HAVING COUNT(ma.agent_id) = 0
        ORDER BY m.name
    """
    rows = await pool.fetch(query)
    return [dict(row) for row in rows]


async def get_stats(pool) -> Dict[str, int]:
    """Get overall stats."""
    total_agents = await pool.fetchval(
        "SELECT COUNT(*) FROM agents WHERE COALESCE(is_archived, false) = false"
    )
    total_microdao = await pool.fetchval(
        "SELECT COUNT(*) FROM microdaos WHERE COALESCE(is_archived, false) = false"
    )
    agents_with_microdao = await pool.fetchval("""
        SELECT COUNT(DISTINCT a.id)
        FROM agents a
        JOIN microdao_agents ma ON ma.agent_id = a.id
        WHERE COALESCE(a.is_archived, false) = false
    """)
    
    return {
        "total_agents": total_agents,
        "total_microdao": total_microdao,
        "agents_with_microdao": agents_with_microdao,
        "agents_without_microdao": total_agents - agents_with_microdao,
    }


async def main():
    print("=" * 60)
    print("DAARION Agent Orphan Finder")
    print("=" * 60)
    
    pool = await get_pool()
    
    try:
        # Stats
        stats = await get_stats(pool)
        print(f"\n📊 Overall Stats:")
        print(f"   Total agents: {stats['total_agents']}")
        print(f"   Total MicroDAOs: {stats['total_microdao']}")
        print(f"   Agents with MicroDAO: {stats['agents_with_microdao']}")
        print(f"   Agents without MicroDAO: {stats['agents_without_microdao']}")
        
        # Orphan agents
        orphans = await find_agents_without_microdao(pool)
        if orphans:
            print(f"\n⚠️  Agents WITHOUT MicroDAO ({len(orphans)}):")
            for agent in orphans:
                print(f"   - {agent['display_name']} ({agent['kind']}) @ {agent['node_id']}")
        else:
            print("\n✅ All agents belong to at least one MicroDAO!")
        
        # Agents without node
        no_node = await find_agents_without_node(pool)
        if no_node:
            print(f"\n⚠️  Agents WITHOUT node_id ({len(no_node)}):")
            for agent in no_node:
                print(f"   - {agent['display_name']} ({agent['kind']})")
        else:
            print("\n✅ All agents have a home node!")
        
        # MicroDAOs without orchestrator
        no_orch = await find_microdao_without_orchestrator(pool)
        if no_orch:
            print(f"\n⚠️  MicroDAOs WITHOUT orchestrator ({len(no_orch)}):")
            for dao in no_orch:
                print(f"   - {dao['name']} ({dao['slug']})")
        else:
            print("\n✅ All MicroDAOs have an orchestrator!")
        
        # Empty MicroDAOs
        empty = await find_empty_microdao(pool)
        if empty:
            print(f"\n⚠️  Empty MicroDAOs ({len(empty)}):")
            for dao in empty:
                print(f"   - {dao['name']} ({dao['slug']})")
        else:
            print("\n✅ All MicroDAOs have at least one agent!")
        
        print("\n" + "=" * 60)
        print("Done!")
        
    finally:
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())

