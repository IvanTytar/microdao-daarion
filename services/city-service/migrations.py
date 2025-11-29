import asyncpg
import os
import logging

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/daarion")

async def run_migrations():
    conn = None
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        
        # Add logo_url and banner_url to microdaos table (previous task)
        await conn.execute("""
            ALTER TABLE microdaos
            ADD COLUMN IF NOT EXISTS logo_url TEXT,
            ADD COLUMN IF NOT EXISTS banner_url TEXT;
        """)
        
        # Add logo_url and banner_url to city_rooms table (previous task)
        await conn.execute("""
            ALTER TABLE city_rooms
            ADD COLUMN IF NOT EXISTS logo_url TEXT,
            ADD COLUMN IF NOT EXISTS banner_url TEXT;
        """)

        # NEW: Add crew_team_key to agents table (TASK 044)
        await conn.execute("""
            ALTER TABLE agents
            ADD COLUMN IF NOT EXISTS crew_team_key TEXT;
        """)
        logger.info("Migration: Added crew_team_key to agents table.")

        # TASK 044: Add room_role, is_public, sort_order to city_rooms table
        await conn.execute("""
            ALTER TABLE city_rooms
            ADD COLUMN IF NOT EXISTS room_role TEXT,
            ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 100;
        """)
        logger.info("Migration: Added room_role, is_public, sort_order to city_rooms table.")

    except Exception as e:
        logger.error(f"Error running migrations: {e}")
        raise
    finally:
        if conn:
            await conn.close()
