import asyncio
import os
import sys
import argparse
import asyncpg
from uuid import UUID

# Add parent directory to path to allow importing from app if needed, 
# though we will try to use direct SQL for maintenance script ease.
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/daarion")

async def get_connection():
    return await asyncpg.connect(DATABASE_URL)

async def fix_agents(conn, apply=False):
    print("--- CHECKING AGENTS ---")
    
    # 1. Agents with missing public_slug
    rows = await conn.fetch("""
        SELECT id, display_name FROM agents 
        WHERE is_public = true AND (public_slug IS NULL OR public_slug = '')
    """)
    
    if rows:
        print(f"Found {len(rows)} public agents without public_slug.")
        for r in rows:
            print(f"  - {r['display_name']} ({r['id']}) -> will set to {r['id']}")
            if apply:
                await conn.execute("""
                    UPDATE agents SET public_slug = id 
                    WHERE id = $1
                """, r['id'])
    else:
        print("OK: All public agents have public_slug.")

    # 2. Agents without node_id
    # We assume NODE1 as default fallback if we must set it, but per task we mostly log it.
    rows = await conn.fetch("""
        SELECT id, display_name FROM agents 
        WHERE is_public = true AND (node_id IS NULL OR node_id = '')
    """)
    if rows:
        print(f"Found {len(rows)} public agents without node_id (WARNING).")
        for r in rows:
            print(f"  - {r['display_name']} ({r['id']})")
            # Option: could set to default node if needed, but task says "optionally try to set".
            # We will skip auto-setting for now to avoid assigning wrong node.
    else:
        print("OK: All public agents have node_id.")

    # 3. Agents without microdao memberships
    rows = await conn.fetch("""
        SELECT a.id, a.display_name 
        FROM agents a
        WHERE a.is_public = true
          AND NOT EXISTS (SELECT 1 FROM microdao_agents ma WHERE ma.agent_id = a.id)
    """)
    if rows:
        print(f"Found {len(rows)} public agents without MicroDAO membership (WARNING).")
        for r in rows:
            print(f"  - {r['display_name']} ({r['id']})")
    else:
        print("OK: All public agents have at least one MicroDAO membership.")


async def fix_microdaos(conn, apply=False):
    print("\n--- CHECKING MICRODAOS ---")
    
    # 1. MicroDAO without rooms
    rows = await conn.fetch("""
        SELECT m.id, m.slug, m.name
        FROM microdaos m
        WHERE m.is_public = true
          AND NOT EXISTS (SELECT 1 FROM city_rooms cr WHERE cr.microdao_id = m.id)
    """)
    if rows:
        print(f"Found {len(rows)} public MicroDAOs without rooms (WARNING).")
        for r in rows:
            print(f"  - {r['name']} ({r['slug']})")
    else:
        print("OK: All public MicroDAOs have at least one room.")

    # 2. MicroDAO without PRIMARY room (but has rooms)
    rows = await conn.fetch("""
        SELECT m.id, m.slug, m.name
        FROM microdaos m
        WHERE m.is_public = true
          AND EXISTS (SELECT 1 FROM city_rooms cr WHERE cr.microdao_id = m.id)
          AND NOT EXISTS (SELECT 1 FROM city_rooms cr WHERE cr.microdao_id = m.id AND cr.room_role = 'primary')
    """)
    
    if rows:
        print(f"Found {len(rows)} MicroDAOs with rooms but NO primary room.")
        for r in rows:
            print(f"  - {r['name']} ({r['slug']})")
            
            # Find candidate: lowest sort_order
            candidate = await conn.fetchrow("""
                SELECT id, name, sort_order FROM city_rooms 
                WHERE microdao_id = $1 
                ORDER BY sort_order ASC, name ASC 
                LIMIT 1
            """, r['id'])
            
            if candidate:
                print(f"    -> Candidate: {candidate['name']} (sort: {candidate['sort_order']})")
                if apply:
                    print("    -> Setting as primary...")
                    await conn.execute("""
                        UPDATE city_rooms SET room_role = 'primary', sort_order = 0 
                        WHERE id = $1
                    """, candidate['id'])
    else:
        print("OK: All MicroDAOs with rooms have a primary room.")

    # 3. MicroDAO with MULTIPLE primary rooms
    rows = await conn.fetch("""
        SELECT m.id, m.slug, m.name
        FROM microdaos m
        JOIN city_rooms cr ON cr.microdao_id = m.id
        WHERE cr.room_role = 'primary'
        GROUP BY m.id, m.slug, m.name
        HAVING COUNT(*) > 1
    """)
    
    if rows:
        print(f"Found {len(rows)} MicroDAOs with MULTIPLE primary rooms.")
        for r in rows:
            print(f"  - {r['name']} ({r['slug']})")
            
            primaries = await conn.fetch("""
                SELECT id, name, sort_order FROM city_rooms 
                WHERE microdao_id = $1 AND room_role = 'primary'
                ORDER BY sort_order ASC, name ASC
            """, r['id'])
            
            # Keep the first one, demote others
            keep = primaries[0]
            others = primaries[1:]
            
            print(f"    -> Keeping: {keep['name']}")
            for o in others:
                print(f"    -> Demoting: {o['name']}")
                if apply:
                    await conn.execute("""
                        UPDATE city_rooms SET room_role = 'team' 
                        WHERE id = $1
                    """, o['id'])
    else:
        print("OK: No MicroDAOs have multiple primary rooms.")


async def main():
    parser = argparse.ArgumentParser(description="Fix MicroDAO/Agent consistency")
    parser.add_argument("--apply", action="store_true", help="Apply changes to DB")
    args = parser.parse_args()

    print(f"Connecting to {DATABASE_URL}...")
    try:
        conn = await get_connection()
    except Exception as e:
        print(f"Failed to connect to DB: {e}")
        return

    try:
        await fix_agents(conn, args.apply)
        await fix_microdaos(conn, args.apply)
    finally:
        await conn.close()
    
    print("\nDone.")

if __name__ == "__main__":
    asyncio.run(main())

