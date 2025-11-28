import asyncio
import os
import asyncpg
import yaml
import argparse
from typing import List, Dict, Any, Set

# Configuration
SYSTEM_CANDIDATE_KINDS = {'infra', 'router', 'monitor', 'system'}
SYSTEM_CANDIDATE_NAMES = {
    'daarwizz', 'helion', 'greenfood', 'clan', 'druid', 'eonarch', 'soul', 'yaromir', 'core-monitor',
    'sofia', 'exor', 'faye', 'helix', 'iris'
}

async def get_db_connection():
    url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/daarion")
    return await asyncpg.connect(url)

async def fetch_all(conn, query):
    records = await conn.fetch(query)
    return [dict(r) for r in records]

def load_allowlist():
    # Try relative path first (for local dev)
    path = os.path.join(os.path.dirname(__file__), '../../config/data_cleanup_allowlist.yml')
    if not os.path.exists(path):
        # Try absolute path (for container)
        path = '/app/config/data_cleanup_allowlist.yml'
    
    with open(path, 'r') as f:
        return yaml.safe_load(f)

async def mark_entities(apply=False):
    conn = await get_db_connection()
    try:
        allowlist = load_allowlist()
        allowed_agent_slugs = set()
        if allowlist.get('agents'):
            allowed_agent_slugs = {a['slug'] for a in allowlist['agents']}
            
        allowed_microdao_slugs = set()
        if allowlist.get('microdao'):
            allowed_microdao_slugs = {m['slug'] for m in allowlist['microdao']}

        # 1. Fetch Agents
        agents = await fetch_all(conn, """
            SELECT id, display_name, slug, public_slug, node_id, kind, is_test, deleted_at 
            FROM agents 
            WHERE deleted_at IS NULL
        """)

        # 2. Fetch MicroDAOs
        microdaos = await fetch_all(conn, """
            SELECT id, name, slug, is_test, deleted_at 
            FROM microdaos 
            WHERE deleted_at IS NULL
        """)
        
        # 3. Fetch Memberships
        memberships = await fetch_all(conn, """
            SELECT ma.agent_id, m.slug as microdao_slug
            FROM microdao_agents ma
            JOIN microdaos m ON ma.microdao_id = m.id
        """)
        
        agent_dao_slugs = {}
        for m in memberships:
            aid = m['agent_id']
            if aid not in agent_dao_slugs:
                agent_dao_slugs[aid] = set()
            agent_dao_slugs[aid].add(m['microdao_slug'])

        # Identify Test Agents
        test_agent_ids = []
        print("\n--- Agents Analysis ---")
        for agent in agents:
            aid = agent['id']
            slug = agent.get('slug') or agent.get('public_slug') or ''
            name = agent['display_name']
            kind = agent['kind']
            
            is_allowed_slug = slug in allowed_agent_slugs
            
            is_in_allowed_dao = False
            for dao_slug in agent_dao_slugs.get(aid, []):
                if dao_slug in allowed_microdao_slugs:
                    is_in_allowed_dao = True
                    break
            
            is_system = (kind in SYSTEM_CANDIDATE_KINDS) or \
                        (name.lower() in SYSTEM_CANDIDATE_NAMES) or \
                        (slug and slug.lower() in SYSTEM_CANDIDATE_NAMES)
                        
            is_real = is_allowed_slug or is_in_allowed_dao or is_system
            
            if not is_real:
                print(f"Mark as TEST: {aid} ({name}) - Slug: {slug}, Kind: {kind}")
                test_agent_ids.append(aid)

        # Identify Test MicroDAOs
        # Fetch agent counts (only non-test agents count towards realness, but we haven't updated DB yet)
        # For this check, we'll consider a MicroDAO real if it's in the allowlist.
        # Empty MicroDAOs not in allowlist are test.
        
        microdao_agent_counts = {}
        memberships_all = await fetch_all(conn, "SELECT microdao_id FROM microdao_agents")
        for m in memberships_all:
            mid = m['microdao_id']
            microdao_agent_counts[mid] = microdao_agent_counts.get(mid, 0) + 1
            
        test_microdao_ids = []
        print("\n--- MicroDAO Analysis ---")
        for md in microdaos:
            mid = md['id']
            slug = md['slug']
            count = microdao_agent_counts.get(mid, 0)
            
            is_allowed = slug in allowed_microdao_slugs
            # If it has agents but not in allowlist, it's tricky. But user said: "All others with agents_count = 0 -> candidates"
            # Let's stick to: in allowlist = real. Not in allowlist AND count=0 = test.
            # What if count > 0 but not in allowlist? User didn't specify. I'll assume test if not allowed.
            # Actually user logic: "Real if in allowlist. All others with agents_count=0 -> candidates".
            # So if count > 0 and not in allowlist, we should be careful.
            
            is_real = is_allowed
            if not is_real:
                if count == 0:
                    print(f"Mark as TEST: {mid} ({md['name']}) - Slug: {slug}, Count: {count}")
                    test_microdao_ids.append(mid)
                else:
                    print(f"WARNING: MicroDAO {slug} has {count} agents but is not in allowlist. Skipping mark.")

        # Apply updates
        if apply:
            print(f"\nApplying updates...")
            if test_agent_ids:
                await conn.execute("""
                    UPDATE agents
                    SET is_test = true,
                        deleted_at = NOW()
                    WHERE id = ANY($1::text[])
                """, test_agent_ids)
                print(f"Updated {len(test_agent_ids)} agents.")
            
            if test_microdao_ids:
                await conn.execute("""
                    UPDATE microdaos
                    SET is_test = true,
                        deleted_at = NOW()
                    WHERE id = ANY($1::text[])
                """, test_microdao_ids)
                print(f"Updated {len(test_microdao_ids)} microdaos.")
        else:
            print("\nDry run. Use --apply to update database.")

    finally:
        await conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Apply changes to database")
    args = parser.parse_args()
    
    asyncio.run(mark_entities(args.apply))

