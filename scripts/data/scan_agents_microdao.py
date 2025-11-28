import asyncio
import os
import json
import asyncpg
from datetime import datetime

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://daarion:daarion@localhost:5432/daarion")
REPORT_DIR = "docs/internal/clean"
REPORT_FILE = os.path.join(REPORT_DIR, "DATA_CLEANUP_REPORT.md")

SYSTEM_CANDIDATE_KINDS = ['infra', 'router', 'monitor', 'system']
SYSTEM_CANDIDATE_NAMES = [
    'daarwizz', 'helion', 'greenfood', 'clan', 'druid', 'eonarch', 'soul', 
    'yaromir', 'core-monitor', 'exor', 'faye', 'helix', 'iris', 'sofia'
]

async def main():
    print(f"Connecting to DB...")
    # Use provided URL or default local
    try:
        conn = await asyncpg.connect(DATABASE_URL)
    except Exception as e:
        print(f"Failed to connect to DB: {e}")
        return
    
    try:
        print("Fetching data...")
        
        # 1. Nodes
        try:
            nodes = await conn.fetch("SELECT id, name, hostname, roles FROM node_registry.nodes")
        except asyncpg.UndefinedTableError:
            print("Warning: node_registry.nodes table not found. Using empty list.")
            nodes = []
            
        node_ids = {str(n['id']) for n in nodes}
        
        # 2. MicroDAOs
        # Check if table is microdao or microdaos
        try:
            table_name = "microdaos"
            await conn.execute(f"SELECT 1 FROM {table_name} LIMIT 1")
        except asyncpg.UndefinedTableError:
            table_name = "microdao"
        
        print(f"Using microdao table: {table_name}")
        
        microdaos = await conn.fetch(f"""
            SELECT m.id, m.slug, m.name, COUNT(ma.agent_id) as agent_count
            FROM {table_name} m
            LEFT JOIN microdao_agents ma ON ma.microdao_id = m.id
            GROUP BY m.id, m.slug, m.name
        """)
        
        # 3. Agents
        agents = await conn.fetch("""
            SELECT a.id, a.display_name, a.kind, a.node_id, a.slug, a.is_public,
                   (SELECT COUNT(*) FROM microdao_agents ma WHERE ma.agent_id = a.id) as microdao_count
            FROM agents a
        """)
        
        # Analyze Agents
        agent_report = []
        for a in agents:
            agent_id = str(a['id'])
            node_id = a['node_id']
            
            has_valid_node = node_id in node_ids if node_id else False
            # If no nodes found at all, we assume valid node check is skipped or failed
            if not nodes:
                has_valid_node = True
                
            has_microdao_membership = a['microdao_count'] > 0
            is_orphan = not has_valid_node or not has_microdao_membership
            
            display_name = a['display_name'] or ''
            slug = a['slug'] or ''
            
            is_system_candidate = (
                a['kind'] in SYSTEM_CANDIDATE_KINDS or 
                any(name in display_name.lower() for name in SYSTEM_CANDIDATE_NAMES) or
                any(name in slug.lower() for name in SYSTEM_CANDIDATE_NAMES)
            )
            
            agent_report.append({
                "id": agent_id,
                "name": display_name,
                "slug": slug,
                "kind": a['kind'],
                "node_id": node_id,
                "has_valid_node": has_valid_node,
                "microdao_count": a['microdao_count'],
                "is_orphan": is_orphan,
                "is_system_candidate": is_system_candidate
            })
            
        # Generate Report
        os.makedirs(REPORT_DIR, exist_ok=True)
        
        with open(REPORT_FILE, "w") as f:
            f.write(f"# Data Cleanup Report\n")
            f.write(f"Generated at: {datetime.now()}\n\n")
            
            f.write("## Nodes Summary\n")
            f.write("| ID | Name | Hostname | Roles |\n")
            f.write("|---|---|---|---|\n")
            for n in nodes:
                f.write(f"| {n['id']} | {n['name']} | {n['hostname']} | {n['roles']} |\n")
            f.write("\n")
            
            f.write("## MicroDAO Summary\n")
            f.write("| Name | Slug | Agents Count | Suspicious (0 agents) |\n")
            f.write("|---|---|---|---|\n")
            for m in microdaos:
                suspicious = "⚠️ YES" if m['agent_count'] == 0 else "NO"
                f.write(f"| {m['name']} | {m['slug']} | {m['agent_count']} | {suspicious} |\n")
            f.write("\n")
            
            f.write("## Agents by Node\n")
            f.write("| ID | Name | Slug | Kind | Node | Valid Node? | MicroDAOs | Orphan? | System? |\n")
            f.write("|---|---|---|---|---|---|---|---|---|\n")
            for a in agent_report:
                orphan_mark = "⚠️ YES" if a['is_orphan'] else "NO"
                system_mark = "✅ YES" if a['is_system_candidate'] else "NO"
                valid_node_mark = "✅" if a['has_valid_node'] else "❌"
                
                f.write(f"| {a['id']} | {a['name']} | {a['slug']} | {a['kind']} | {a['node_id']} | {valid_node_mark} | {a['microdao_count']} | {orphan_mark} | {system_mark} |\n")
        
        print(f"Report generated: {REPORT_FILE}")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
