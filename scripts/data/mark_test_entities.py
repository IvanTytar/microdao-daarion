import asyncio
import os
import yaml
import argparse
import asyncpg
from datetime import datetime

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://daarion:daarion@localhost:5432/daarion")
ALLOWLIST_PATH = os.getenv("ALLOWLIST_PATH", "config/data_cleanup_allowlist.yml")

SYSTEM_CANDIDATE_KINDS = ['infra', 'router', 'monitor', 'system']

def load_allowlist():
    # Resolve relative path if running from root
    path = ALLOWLIST_PATH
    if not os.path.exists(path):
        # Try absolute path assuming docker context
        path = os.path.join('/app', ALLOWLIST_PATH)
    
    if not os.path.exists(path):
         print(f"Warning: Allowlist file not found at {path}")
         return {}

    with open(path, 'r') as f:
        return yaml.safe_load(f)

async def main():
    parser = argparse.ArgumentParser(description='Mark test entities')
    parser.add_argument('--apply', action='store_true', help='Apply changes to DB')
    args = parser.parse_args()
    
    allowlist = load_allowlist()
    allowed_microdao_slugs = set(allowlist.get('microdao', []))
    allowed_agent_slugs = set(allowlist.get('agents', []))
    
    print(f"Loaded allowlist: {len(allowed_agent_slugs)} agents, {len(allowed_microdao_slugs)} microdaos")
    print(f"Allowed agents sample: {list(allowed_agent_slugs)[:5]}")
    print(f"Allowed microdaos sample: {list(allowed_microdao_slugs)[:5]}")
    
    print(f"Connecting to DB...")
    try:
        conn = await asyncpg.connect(DATABASE_URL)
    except Exception as e:
        print(f"Failed to connect: {e}")
        return
        
    try:
        # Check table name for microdao
        try:
            table_name = "microdaos"
            await conn.execute(f"SELECT 1 FROM {table_name} LIMIT 1")
        except asyncpg.UndefinedTableError:
            table_name = "microdao"
            
        print(f"Using microdao table: {table_name}")
            
        # 1. Identify Test Agents
        # Use dynamic table name for JOIN
        query = f"""
            SELECT a.id, a.display_name, a.slug, a.kind, a.is_test,
                   (SELECT COUNT(*) FROM microdao_agents ma WHERE ma.agent_id = a.id) as microdao_count
            FROM agents a
            WHERE a.is_test = false AND a.deleted_at IS NULL
        """
        agents = await conn.fetch(query)
        
        agents_to_mark = []
        for a in agents:
            is_real = False
            
            # Check if allowed explicitly
            if a['slug'] and a['slug'] in allowed_agent_slugs:
                is_real = True
            
            # Check if in allowed microdao
            if not is_real:
                memberships = await conn.fetch(f"""
                    SELECT m.slug FROM microdao_agents ma 
                    JOIN {table_name} m ON ma.microdao_id = m.id 
                    WHERE ma.agent_id = $1
                """, a['id'])
                for m in memberships:
                    if m['slug'] in allowed_microdao_slugs:
                        is_real = True
                        break
            
            # Check if system
            if not is_real:
                if a['kind'] in SYSTEM_CANDIDATE_KINDS:
                    is_real = True
                    
            if not is_real:
                agents_to_mark.append(a)
                
        print(f"\nAGENTS TO MARK AS TEST: {len(agents_to_mark)}")
        for a in agents_to_mark:
            print(f" - {a['display_name']} ({a['slug']}) [MicroDAOs: {a['microdao_count']}]")
            
        # 2. Identify Test MicroDAOs
        microdaos = await conn.fetch(f"""
            SELECT m.id, m.slug, m.name, m.is_test,
                   (SELECT COUNT(*) FROM microdao_agents ma WHERE ma.microdao_id = m.id) as agent_count
            FROM {table_name} m
            WHERE m.is_test = false AND m.deleted_at IS NULL
        """)
        
        microdaos_to_mark = []
        for m in microdaos:
            is_real = False
            if m['slug'] in allowed_microdao_slugs:
                is_real = True
            
            if not is_real and m['agent_count'] == 0:
                 microdaos_to_mark.append(m)
                 
        print(f"\nMICRODAOS TO MARK AS TEST: {len(microdaos_to_mark)}")
        for m in microdaos_to_mark:
             print(f" - {m['name']} ({m['slug']}) [Agents: {m['agent_count']}]")

        if args.apply:
            print("\nAPPLYING CHANGES...")
            if agents_to_mark:
                agent_ids = [a['id'] for a in agents_to_mark]
                await conn.execute("""
                    UPDATE agents 
                    SET is_test = true, deleted_at = NOW() 
                    WHERE id = ANY($1::uuid[])
                """, agent_ids)
                print(f"Marked {len(agent_ids)} agents as test.")
                
            if microdaos_to_mark:
                microdao_ids = [m['id'] for m in microdaos_to_mark]
                await conn.execute(f"""
                    UPDATE {table_name}
                    SET is_test = true, deleted_at = NOW() 
                    WHERE id = ANY($1::uuid[])
                """, microdao_ids)
                print(f"Marked {len(microdao_ids)} microdaos as test.")
        else:
            print("\nDry run. Use --apply to execute changes.")
            
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
