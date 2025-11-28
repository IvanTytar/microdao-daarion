import asyncio
import os
import asyncpg
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

async def scan_entities():
    conn = await get_db_connection()
    try:
        # 1. Fetch Nodes
        # Note: node_registry is usually a separate service/db, but we might have cached nodes in node_cache table
        # or we assume known nodes. For this script, let's query node_cache if available or just use hardcoded known nodes for validation
        # Actually user said "Source of truth по нодах: node_registry". Assuming we can query node_registry.nodes table if it's in the same DB 
        # or use node_cache table which we used in previous tasks.
        # Let's try to fetch from node_cache table.
        try:
            nodes = await fetch_all(conn, "SELECT node_id, node_name, status FROM node_cache")
        except asyncpg.UndefinedTableError:
            print("Warning: node_cache table not found. Using empty list for nodes.")
            nodes = []
            
        known_node_ids = {n['node_id'] for n in nodes}
        # Add hardcoded known nodes just in case cache is empty
        known_node_ids.update({'node-1-hetzner-gex44', 'node-2-macbook-m4max'})

        # 2. Fetch Agents
        agents = await fetch_all(conn, """
            SELECT id, display_name, slug, node_id, kind, is_test, deleted_at 
            FROM agents 
            WHERE deleted_at IS NULL
        """)

        # 3. Fetch MicroDAOs
        microdaos = await fetch_all(conn, """
            SELECT id, name, slug, is_test, deleted_at 
            FROM microdaos 
            WHERE deleted_at IS NULL
        """)
        
        # 4. Fetch MicroDAO Agents
        memberships = await fetch_all(conn, "SELECT agent_id, microdao_id FROM microdao_agents")
        
        # Process Data
        agent_microdao_map = {}
        for m in memberships:
            agent_id = m['agent_id']
            if agent_id not in agent_microdao_map:
                agent_microdao_map[agent_id] = set()
            agent_microdao_map[agent_id].add(m['microdao_id'])
            
        microdao_agent_count = {}
        for m in memberships:
            md_id = m['microdao_id']
            microdao_agent_count[md_id] = microdao_agent_count.get(md_id, 0) + 1

        # Generate Report
        report_lines = []
        report_lines.append("# Data Cleanup Report")
        report_lines.append(f"Generated at: {asyncio.get_event_loop().time()}") # Placeholder for time
        
        report_lines.append("\n## Nodes Summary")
        for node_id in known_node_ids:
            report_lines.append(f"- {node_id}")

        report_lines.append("\n## Agents Analysis")
        report_lines.append("| ID | Name | Node | Kind | MicroDAOs | Is Orphan | System Candidate | Is Test |")
        report_lines.append("|---|---|---|---|---|---|---|---|")
        
        orphan_count = 0
        
        for agent in agents:
            a_id = agent['id']
            name = agent['display_name']
            node = agent['node_id']
            kind = agent['kind']
            slug = agent.get('slug')
            
            has_valid_node = node in known_node_ids
            dao_count = len(agent_microdao_map.get(a_id, []))
            has_membership = dao_count > 0
            
            is_orphan = not has_valid_node or not has_membership
            if is_orphan:
                orphan_count += 1
                
            is_system = (kind in SYSTEM_CANDIDATE_KINDS) or \
                        (name.lower() in SYSTEM_CANDIDATE_NAMES) or \
                        (slug and slug.lower() in SYSTEM_CANDIDATE_NAMES)
                        
            report_lines.append(
                f"| {a_id} | {name} | {node} | {kind} | {dao_count} | {is_orphan} | {is_system} | {agent['is_test']} |"
            )

        report_lines.append("\n## MicroDAO Summary")
        report_lines.append("| ID | Name | Slug | Agent Count | Suspicious (0 agents) | Is Test |")
        report_lines.append("|---|---|---|---|---|---|")
        
        for md in microdaos:
            md_id = md['id']
            count = microdao_agent_count.get(md_id, 0)
            is_suspicious = count == 0
            report_lines.append(
                f"| {md_id} | {md['name']} | {md['slug']} | {count} | {is_suspicious} | {md['is_test']} |"
            )

        # Output
        report_content = "\n".join(report_lines)
        print(report_content)
        
        os.makedirs("docs/internal/clean", exist_ok=True)
        with open("docs/internal/clean/DATA_CLEANUP_REPORT.md", "w") as f:
            f.write(report_content)
            
        print(f"\nReport saved to docs/internal/clean/DATA_CLEANUP_REPORT.md")
        print(f"Total agents: {len(agents)}")
        print(f"Orphan agents found: {orphan_count}")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(scan_entities())

