#!/usr/bin/env python3
"""
Sync Agents from YAML Config to DAARION City Database

This script reads config/agents_city_mapping.yaml and syncs:
1. Agents to `agents` table
2. Agent-Room bindings to `agent_room_bindings` table
3. Validates node_id against Node Registry

Usage:
    python scripts/sync_agents_from_config.py

Environment:
    DATABASE_URL - PostgreSQL connection string for DAARION city DB
    NODE_REGISTRY_URL - URL for Node Registry API (default: http://localhost:9205)
"""

import os
import sys
import yaml
import logging
import httpx
from datetime import datetime
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/daarion')
NODE_REGISTRY_URL = os.getenv('NODE_REGISTRY_URL', 'http://localhost:9205')
CONFIG_PATH = Path(__file__).parent.parent / 'config' / 'agents_city_mapping.yaml'


def load_config() -> dict:
    """Load agents configuration from YAML file."""
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(f"Config file not found: {CONFIG_PATH}")
    
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)
    
    logger.info(f"✅ Loaded config: {len(config.get('agents', []))} agents, {len(config.get('districts', []))} districts")
    return config


def validate_node(node_id: str) -> bool:
    """Check if node exists in Node Registry."""
    try:
        response = httpx.get(f"{NODE_REGISTRY_URL}/api/v1/nodes/{node_id}", timeout=5.0)
        if response.status_code == 200:
            logger.debug(f"✅ Node validated: {node_id}")
            return True
        else:
            logger.warning(f"⚠️ Node not found in registry: {node_id}")
            return False
    except Exception as e:
        logger.warning(f"⚠️ Cannot validate node {node_id}: {e}")
        return False


def get_room_id_by_slug(cursor, slug: str) -> str | None:
    """Get room_id by slug from city_rooms."""
    cursor.execute("SELECT id FROM city_rooms WHERE slug = %s", (slug,))
    row = cursor.fetchone()
    return row['id'] if row else None


def sync_agents(config: dict, conn) -> tuple[int, int, int]:
    """
    Sync agents from config to database.
    
    Returns:
        Tuple of (created, updated, errors)
    """
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    created = 0
    updated = 0
    errors = 0
    
    default_node_id = config.get('default_node_id', 'node-2-macbook-m4max')
    
    for agent in config.get('agents', []):
        agent_id = agent['agent_id']
        node_id = agent.get('node_id', default_node_id)
        
        try:
            # Validate node (optional - just warning)
            validate_node(node_id)
            
            # Upsert agent (using 'id' as primary key, which is agent_id)
            cursor.execute("""
                INSERT INTO agents (
                    id, display_name, kind, role, avatar_url, color_hint,
                    is_active, node_id, district, primary_room_slug, model, priority,
                    status, created_at, updated_at
                ) VALUES (
                    %(agent_id)s, %(display_name)s, %(kind)s, %(role)s, %(avatar_url)s, %(color_hint)s,
                    true, %(node_id)s, %(district)s, %(primary_room_slug)s, %(model)s, %(priority)s,
                    'online', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                ON CONFLICT (id) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    kind = EXCLUDED.kind,
                    role = EXCLUDED.role,
                    avatar_url = EXCLUDED.avatar_url,
                    color_hint = EXCLUDED.color_hint,
                    is_active = true,
                    node_id = EXCLUDED.node_id,
                    district = EXCLUDED.district,
                    primary_room_slug = EXCLUDED.primary_room_slug,
                    model = EXCLUDED.model,
                    priority = EXCLUDED.priority,
                    status = 'online',
                    updated_at = CURRENT_TIMESTAMP
                RETURNING (xmax = 0) as is_insert
            """, {
                'agent_id': agent_id,
                'display_name': agent.get('display_name', agent_id),
                'kind': agent.get('kind', 'agent'),
                'role': agent.get('role', ''),
                'avatar_url': agent.get('avatar_url'),
                'color_hint': agent.get('color_hint', '#6366F1'),
                'node_id': node_id,
                'district': agent.get('district'),
                'primary_room_slug': agent.get('primary_room_slug'),
                'model': agent.get('model'),
                'priority': agent.get('priority', 'medium'),
            })
            
            result = cursor.fetchone()
            if result and result['is_insert']:
                created += 1
                logger.info(f"✅ Created agent: {agent_id}")
            else:
                updated += 1
                logger.debug(f"🔄 Updated agent: {agent_id}")
            
            # Create room binding
            room_slug = agent.get('primary_room_slug')
            if room_slug:
                room_id = get_room_id_by_slug(cursor, room_slug)
                if room_id:
                    cursor.execute("""
                        INSERT INTO agent_room_bindings (agent_id, room_id, role, is_primary)
                        VALUES (%(agent_id)s, %(room_id)s, 'resident', true)
                        ON CONFLICT (agent_id, room_id) DO UPDATE SET
                            is_primary = true,
                            updated_at = CURRENT_TIMESTAMP
                    """, {'agent_id': agent_id, 'room_id': room_id})
                else:
                    logger.warning(f"⚠️ Room not found for agent {agent_id}: {room_slug}")
            
        except Exception as e:
            errors += 1
            logger.error(f"❌ Error syncing agent {agent_id}: {e}")
    
    conn.commit()
    return created, updated, errors


def sync_districts(config: dict, conn) -> int:
    """Sync districts from config to database."""
    cursor = conn.cursor()
    count = 0
    
    for district in config.get('districts', []):
        try:
            cursor.execute("""
                INSERT INTO city_districts (id, name, description, color, icon, room_slug)
                VALUES (%(id)s, %(name)s, %(description)s, %(color)s, %(icon)s, %(room_slug)s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    color = EXCLUDED.color,
                    icon = EXCLUDED.icon,
                    room_slug = EXCLUDED.room_slug,
                    updated_at = CURRENT_TIMESTAMP
            """, {
                'id': district['id'],
                'name': district['name'],
                'description': district.get('description', ''),
                'color': district.get('color', '#6366F1'),
                'icon': district.get('icon', 'building'),
                'room_slug': district.get('room_slug'),
            })
            count += 1
        except Exception as e:
            logger.error(f"❌ Error syncing district {district['id']}: {e}")
    
    conn.commit()
    logger.info(f"✅ Synced {count} districts")
    return count


def main():
    """Main entry point."""
    logger.info("🚀 Starting Agent-City Sync")
    logger.info(f"📁 Config: {CONFIG_PATH}")
    logger.info(f"🗄️ Database: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
    logger.info(f"📡 Node Registry: {NODE_REGISTRY_URL}")
    print()
    
    try:
        # Load config
        config = load_config()
        
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        logger.info("✅ Connected to database")
        
        # Sync districts
        sync_districts(config, conn)
        
        # Sync agents
        created, updated, errors = sync_agents(config, conn)
        
        # Summary
        print()
        logger.info("=" * 50)
        logger.info("📊 SYNC SUMMARY")
        logger.info("=" * 50)
        logger.info(f"✅ Agents created: {created}")
        logger.info(f"🔄 Agents updated: {updated}")
        logger.info(f"❌ Errors: {errors}")
        logger.info(f"📍 Total agents: {created + updated}")
        logger.info("=" * 50)
        
        conn.close()
        
        if errors > 0:
            sys.exit(1)
        
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()

