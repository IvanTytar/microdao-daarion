"""
Repository для City Backend (PostgreSQL)
"""

import os
import asyncpg
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
import secrets


# Database connection
_pool: Optional[asyncpg.Pool] = None


async def get_pool() -> asyncpg.Pool:
    """Отримати connection pool"""
    global _pool
    
    if _pool is None:
        database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/daarion")
        _pool = await asyncpg.create_pool(database_url, min_size=2, max_size=10)
    
    return _pool


async def close_pool():
    """Закрити connection pool"""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def generate_id(prefix: str) -> str:
    """Генерувати простий ID"""
    return f"{prefix}_{secrets.token_urlsafe(12)}"


def _normalize_capabilities(value: Any) -> List[str]:
    """Ensure capabilities are returned as a list."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        import json
        try:
            return json.loads(value)
        except Exception:
            return []
    return list(value)


# =============================================================================
# City Rooms Repository
# =============================================================================

async def get_all_rooms(limit: int = 100, offset: int = 0) -> List[dict]:
    """Отримати всі кімнати"""
    pool = await get_pool()
    
    query = """
        SELECT id, slug, name, description, is_default, created_at, created_by,
               matrix_room_id, matrix_room_alias
        FROM city_rooms
        ORDER BY is_default DESC, created_at DESC
        LIMIT $1 OFFSET $2
    """
    
    rows = await pool.fetch(query, limit, offset)
    return [dict(row) for row in rows]


async def get_room_by_id(room_id: str) -> Optional[dict]:
    """Отримати кімнату по ID"""
    pool = await get_pool()
    
    query = """
        SELECT id, slug, name, description, is_default, created_at, created_by,
               matrix_room_id, matrix_room_alias
        FROM city_rooms
        WHERE id = $1
    """
    
    row = await pool.fetchrow(query, room_id)
    return dict(row) if row else None


async def get_room_by_slug(slug: str) -> Optional[dict]:
    """Отримати кімнату по slug"""
    pool = await get_pool()
    
    query = """
        SELECT id, slug, name, description, is_default, created_at, created_by,
               matrix_room_id, matrix_room_alias
        FROM city_rooms
        WHERE slug = $1
    """
    
    row = await pool.fetchrow(query, slug)
    return dict(row) if row else None


async def create_room(
    slug: str, 
    name: str, 
    description: Optional[str], 
    created_by: Optional[str],
    matrix_room_id: Optional[str] = None,
    matrix_room_alias: Optional[str] = None
) -> dict:
    """Створити кімнату"""
    pool = await get_pool()
    
    room_id = f"room_city_{slug}"
    
    query = """
        INSERT INTO city_rooms (id, slug, name, description, created_by, matrix_room_id, matrix_room_alias)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, slug, name, description, is_default, created_at, created_by, matrix_room_id, matrix_room_alias
    """
    
    row = await pool.fetchrow(query, room_id, slug, name, description, created_by, matrix_room_id, matrix_room_alias)
    return dict(row)


async def update_room_matrix(room_id: str, matrix_room_id: str, matrix_room_alias: str) -> Optional[dict]:
    """Оновити Matrix поля кімнати"""
    pool = await get_pool()
    
    query = """
        UPDATE city_rooms
        SET matrix_room_id = $2, matrix_room_alias = $3
        WHERE id = $1
        RETURNING id, slug, name, description, is_default, created_at, created_by, matrix_room_id, matrix_room_alias
    """
    
    row = await pool.fetchrow(query, room_id, matrix_room_id, matrix_room_alias)
    return dict(row) if row else None


async def get_rooms_without_matrix() -> List[dict]:
    """Отримати кімнати без Matrix інтеграції"""
    pool = await get_pool()
    
    query = """
        SELECT id, slug, name, description, is_default, created_at, created_by,
               matrix_room_id, matrix_room_alias
        FROM city_rooms
        WHERE matrix_room_id IS NULL
        ORDER BY created_at
    """
    
    rows = await pool.fetch(query)
    return [dict(row) for row in rows]


# =============================================================================
# City Room Messages Repository
# =============================================================================

async def get_room_messages(room_id: str, limit: int = 50) -> List[dict]:
    """Отримати повідомлення кімнати"""
    pool = await get_pool()
    
    query = """
        SELECT id, room_id, author_user_id, author_agent_id, body, created_at
        FROM city_room_messages
        WHERE room_id = $1
        ORDER BY created_at DESC
        LIMIT $2
    """
    
    rows = await pool.fetch(query, room_id, limit)
    # Reverse для правильного порядку (старі → нові)
    return [dict(row) for row in reversed(rows)]


async def create_room_message(
    room_id: str,
    body: str,
    author_user_id: Optional[str] = None,
    author_agent_id: Optional[str] = None
) -> dict:
    """Створити повідомлення в кімнаті"""
    pool = await get_pool()
    
    message_id = generate_id("m_city")
    
    query = """
        INSERT INTO city_room_messages (id, room_id, author_user_id, author_agent_id, body)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, room_id, author_user_id, author_agent_id, body, created_at
    """
    
    row = await pool.fetchrow(query, message_id, room_id, author_user_id, author_agent_id, body)
    return dict(row)


# =============================================================================
# City Feed Events Repository
# =============================================================================

async def get_feed_events(limit: int = 20, offset: int = 0) -> List[dict]:
    """Отримати події feed"""
    pool = await get_pool()
    
    query = """
        SELECT id, kind, room_id, user_id, agent_id, payload, created_at
        FROM city_feed_events
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
    """
    
    rows = await pool.fetch(query, limit, offset)
    return [dict(row) for row in rows]


async def create_feed_event(
    kind: str,
    payload: dict,
    room_id: Optional[str] = None,
    user_id: Optional[str] = None,
    agent_id: Optional[str] = None
) -> dict:
    """Створити подію в feed"""
    pool = await get_pool()
    
    event_id = generate_id("evt_city")
    
    query = """
        INSERT INTO city_feed_events (id, kind, room_id, user_id, agent_id, payload)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        RETURNING id, kind, room_id, user_id, agent_id, payload, created_at
    """
    
    import json
    payload_json = json.dumps(payload)
    
    row = await pool.fetchrow(query, event_id, kind, room_id, user_id, agent_id, payload_json)
    return dict(row)


# =============================================================================
# City Map Repository
# =============================================================================

async def get_map_config() -> dict:
    """Отримати конфігурацію мапи міста"""
    pool = await get_pool()
    
    query = """
        SELECT id, grid_width, grid_height, cell_size, background_url, updated_at
        FROM city_map_config
        WHERE id = 'default'
    """
    
    row = await pool.fetchrow(query)
    if row:
        return dict(row)
    
    # Повернути дефолтні значення якщо немає запису
    return {
        "id": "default",
        "grid_width": 6,
        "grid_height": 3,
        "cell_size": 100,
        "background_url": None
    }


async def get_rooms_for_map() -> List[dict]:
    """Отримати кімнати з координатами для 2D мапи"""
    pool = await get_pool()
    
    query = """
        SELECT 
            id, slug, name, description,
            room_type, zone, icon, color,
            map_x, map_y, map_w, map_h,
            matrix_room_id
        FROM city_rooms
        ORDER BY map_y, map_x
    """
    
    rows = await pool.fetch(query)
    return [dict(row) for row in rows]


# =============================================================================
# Agents Repository
# =============================================================================

async def list_agent_summaries(
    *,
    node_id: Optional[str] = None,
    visibility_scope: Optional[str] = None,
    listed_only: Optional[bool] = None,
    kinds: Optional[List[str]] = None,
    include_system: bool = True,
    include_archived: bool = False,
    limit: int = 200,
    offset: int = 0
) -> Tuple[List[dict], int]:
    """
    Unified method to list agents with all necessary data.
    Used by both Agent Console and Citizens page.
    """
    pool = await get_pool()
    
    params: List[Any] = []
    where_clauses = []
    
    # Always filter archived unless explicitly included
    if not include_archived:
        where_clauses.append("COALESCE(a.is_archived, false) = false")
    
    if node_id:
        params.append(node_id)
        where_clauses.append(f"a.node_id = ${len(params)}")
    
    if visibility_scope:
        params.append(visibility_scope)
        where_clauses.append(f"COALESCE(a.visibility_scope, 'city') = ${len(params)}")
    
    if listed_only is True:
        where_clauses.append("COALESCE(a.is_listed_in_directory, true) = true")
    elif listed_only is False:
        where_clauses.append("COALESCE(a.is_listed_in_directory, true) = false")
    
    if kinds:
        params.append(kinds)
        where_clauses.append(f"a.kind = ANY(${len(params)})")
    
    if not include_system:
        where_clauses.append("COALESCE(a.is_system, false) = false")
    
    where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
    
    query = f"""
        SELECT
            a.id,
            COALESCE(a.slug, a.public_slug, LOWER(REPLACE(a.display_name, ' ', '-'))) AS slug,
            a.display_name,
            COALESCE(a.public_title, '') AS title,
            COALESCE(a.public_tagline, '') AS tagline,
            a.kind,
            a.avatar_url,
            COALESCE(a.status, 'offline') AS status,
            a.node_id,
            nc.node_name AS node_label,
            nc.hostname AS node_hostname,
            nc.roles AS node_roles,
            nc.environment AS node_environment,
            COALESCE(a.visibility_scope, 'city') AS visibility_scope,
            COALESCE(a.is_listed_in_directory, true) AS is_listed_in_directory,
            COALESCE(a.is_system, false) AS is_system,
            COALESCE(a.is_public, false) AS is_public,
            a.primary_microdao_id,
            pm.name AS primary_microdao_name,
            pm.slug AS primary_microdao_slug,
            pm.district AS district,
            COALESCE(a.public_skills, ARRAY[]::text[]) AS public_skills,
            COUNT(*) OVER() AS total_count
        FROM agents a
        LEFT JOIN node_cache nc ON a.node_id = nc.node_id
        LEFT JOIN microdaos pm ON a.primary_microdao_id = pm.id
        WHERE {where_sql}
        ORDER BY a.display_name
        LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
    """
    
    params.append(limit)
    params.append(offset)
    
    rows = await pool.fetch(query, *params)
    if not rows:
        return [], 0
    
    total = rows[0]["total_count"]
    items = []
    
    for row in rows:
        data = dict(row)
        data.pop("total_count", None)
        
        # Build home_node object
        if data.get("node_id"):
            data["home_node"] = {
                "id": data.get("node_id"),
                "name": data.get("node_label"),
                "hostname": data.get("node_hostname"),
                "roles": list(data.get("node_roles") or []),
                "environment": data.get("node_environment")
            }
        else:
            data["home_node"] = None
        
        # Clean up intermediate fields
        for key in ["node_hostname", "node_roles", "node_environment"]:
            data.pop(key, None)
        
        # Get MicroDAO memberships
        memberships = await get_agent_microdao_memberships(data["id"])
        data["microdaos"] = [
            {
                "id": m.get("microdao_id", ""),
                "name": m.get("name", ""),
                "slug": m.get("slug"),
                "role": m.get("role")
            }
            for m in memberships
        ]
        data["microdao_memberships"] = memberships  # backward compatibility
        
        data["public_skills"] = list(data.get("public_skills") or [])
        
        items.append(data)
    
    return items, total


async def get_all_agents() -> List[dict]:
    """Отримати всіх агентів (non-archived) - legacy method"""
    pool = await get_pool()
    
    query = """
        SELECT id, display_name, kind, avatar_url, color, status, 
               current_room_id, capabilities, created_at, updated_at
        FROM agents
        WHERE COALESCE(is_archived, false) = false
        ORDER BY display_name
    """
    
    rows = await pool.fetch(query)
    return [dict(row) for row in rows]


async def update_agent_visibility(
    agent_id: str,
    visibility_scope: str,
    is_listed_in_directory: bool
) -> bool:
    """Оновити налаштування видимості агента"""
    pool = await get_pool()
    
    query = """
        UPDATE agents
        SET visibility_scope = $2,
            is_listed_in_directory = $3,
            is_public = $3,
            updated_at = NOW()
        WHERE id = $1
          AND COALESCE(is_archived, false) = false
        RETURNING id
    """
    
    result = await pool.fetchrow(query, agent_id, visibility_scope, is_listed_in_directory)
    return result is not None


async def get_agent_prompts(agent_id: str) -> dict:
    """Отримати системні промти агента"""
    pool = await get_pool()
    
    query = """
        SELECT kind, content, version, created_at, note
        FROM agent_prompts
        WHERE agent_id = $1
          AND is_active = true
        ORDER BY kind
    """
    
    rows = await pool.fetch(query, agent_id)
    
    result = {
        "core": None,
        "safety": None,
        "governance": None,
        "tools": None
    }
    
    for row in rows:
        kind = row["kind"]
        if kind in result:
            result[kind] = {
                "content": row["content"],
                "version": row["version"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "note": row.get("note")
            }
    
    return result


async def get_agent_public_profile(agent_id: str) -> Optional[dict]:
    """Отримати публічний профіль агента"""
    pool = await get_pool()
    
    query = """
        SELECT
            is_public,
            public_slug,
            public_title,
            public_tagline,
            COALESCE(public_skills, ARRAY[]::text[]) AS public_skills,
            public_district,
            public_primary_room_slug,
            COALESCE(visibility_scope, 'city') AS visibility_scope,
            COALESCE(is_listed_in_directory, true) AS is_listed_in_directory,
            COALESCE(is_system, false) AS is_system
        FROM agents
        WHERE id = $1
    """
    
    row = await pool.fetchrow(query, agent_id)
    if not row:
        return None
    
    return {
        "is_public": row["is_public"],
        "public_slug": row["public_slug"],
        "public_title": row["public_title"],
        "public_tagline": row["public_tagline"],
        "public_skills": list(row["public_skills"] or []),
        "public_district": row["public_district"],
        "public_primary_room_slug": row["public_primary_room_slug"],
        "visibility_scope": row["visibility_scope"],
        "is_listed_in_directory": row["is_listed_in_directory"],
        "is_system": row["is_system"]
    }


async def get_agents_with_home_node(
    kind: Optional[str] = None,
    node_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> Tuple[List[dict], int]:
    """Отримати агентів з інформацією про home_node"""
    pool = await get_pool()
    
    params: List[Any] = []
    where_clauses = ["COALESCE(a.is_archived, false) = false"]
    
    if kind:
        params.append(kind)
        where_clauses.append(f"a.kind = ${len(params)}")
    
    if node_id:
        params.append(node_id)
        where_clauses.append(f"a.node_id = ${len(params)}")
    
    where_sql = " AND ".join(where_clauses)
    
    query = f"""
        SELECT
            a.id,
            a.display_name,
            a.kind,
            a.avatar_url,
            a.status,
            a.is_public,
            a.public_slug,
            a.public_title,
            a.public_district,
            a.node_id,
            nc.node_name AS home_node_name,
            nc.hostname AS home_node_hostname,
            nc.roles AS home_node_roles,
            nc.environment AS home_node_environment,
            COUNT(*) OVER() AS total_count
        FROM agents a
        LEFT JOIN node_cache nc ON a.node_id = nc.node_id
        WHERE {where_sql}
        ORDER BY a.display_name
        LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
    """
    
    params.append(limit)
    params.append(offset)
    
    rows = await pool.fetch(query, *params)
    if not rows:
        return [], 0
    
    total = rows[0]["total_count"]
    items = []
    
    for row in rows:
        data = dict(row)
        data.pop("total_count", None)
        
        # Build home_node object
        if data.get("node_id"):
            data["home_node"] = {
                "id": data.get("node_id"),
                "name": data.get("home_node_name"),
                "hostname": data.get("home_node_hostname"),
                "roles": list(data.get("home_node_roles") or []),
                "environment": data.get("home_node_environment")
            }
        else:
            data["home_node"] = None
        
        # Clean up intermediate fields
        for key in ["home_node_name", "home_node_hostname", "home_node_roles", "home_node_environment"]:
            data.pop(key, None)
        
        items.append(data)
    
    return items, total


async def get_agents_by_room(room_id: str) -> List[dict]:
    """Отримати агентів у конкретній кімнаті"""
    pool = await get_pool()
    
    query = """
        SELECT id, display_name, kind, avatar_url, color, status, 
               current_room_id, capabilities
        FROM agents
        WHERE current_room_id = $1 AND status != 'offline'
        ORDER BY display_name
    """
    
    rows = await pool.fetch(query, room_id)
    return [dict(row) for row in rows]


async def get_online_agents() -> List[dict]:
    """Отримати всіх онлайн агентів"""
    pool = await get_pool()
    
    query = """
        SELECT id, display_name, kind, avatar_url, color, status, 
               current_room_id, capabilities
        FROM agents
        WHERE status IN ('online', 'busy')
        ORDER BY display_name
    """
    
    rows = await pool.fetch(query)
    return [dict(row) for row in rows]


async def update_agent_status(agent_id: str, status: str, room_id: Optional[str] = None) -> Optional[dict]:
    """Оновити статус агента"""
    pool = await get_pool()
    
    if room_id:
        query = """
            UPDATE agents
            SET status = $2, current_room_id = $3, updated_at = NOW()
            WHERE id = $1
            RETURNING id, display_name, kind, status, current_room_id
        """
        row = await pool.fetchrow(query, agent_id, status, room_id)
    else:
        query = """
            UPDATE agents
            SET status = $2, updated_at = NOW()
            WHERE id = $1
            RETURNING id, display_name, kind, status, current_room_id
        """
        row = await pool.fetchrow(query, agent_id, status)
    
    return dict(row) if row else None


async def get_agent_by_id(agent_id: str) -> Optional[dict]:
    """Отримати агента по ID"""
    pool = await get_pool()
    
    query = """
        SELECT
            a.id,
            a.display_name,
            a.kind,
            a.status,
            a.node_id,
            a.role,
            a.avatar_url,
            COALESCE(a.color_hint, a.color, 'cyan') AS color,
            a.capabilities,
            a.primary_room_slug,
            a.public_primary_room_slug,
            a.public_district,
            a.public_title,
            a.public_tagline,
            a.public_skills,
            a.public_slug,
            a.is_public,
            a.district AS home_district
        FROM agents a
        WHERE a.id = $1
    """
    
    row = await pool.fetchrow(query, agent_id)
    if not row:
        return None
    
    agent = dict(row)
    agent["capabilities"] = _normalize_capabilities(agent.get("capabilities"))
    if agent.get("public_skills") is None:
        agent["public_skills"] = []
    return agent


async def get_agent_public_profile(agent_id: str) -> Optional[dict]:
    """Отримати публічний профіль агента"""
    pool = await get_pool()
    
    query = """
        SELECT
            is_public,
            public_slug,
            public_title,
            public_tagline,
            public_skills,
            public_district,
            public_primary_room_slug
        FROM agents
        WHERE id = $1
    """
    
    row = await pool.fetchrow(query, agent_id)
    if not row:
        return None
    
    result = dict(row)
    if result.get("public_skills") is None:
        result["public_skills"] = []
    return result


async def update_agent_public_profile(
    agent_id: str,
    is_public: bool,
    public_slug: Optional[str],
    public_title: Optional[str],
    public_tagline: Optional[str],
    public_skills: Optional[List[str]],
    public_district: Optional[str],
    public_primary_room_slug: Optional[str]
) -> Optional[dict]:
    """Оновити публічний профіль агента"""
    pool = await get_pool()
    
    query = """
        UPDATE agents
        SET
            is_public = $2,
            public_slug = $3,
            public_title = $4,
            public_tagline = $5,
            public_skills = $6,
            public_district = $7,
            public_primary_room_slug = $8,
            updated_at = NOW()
        WHERE id = $1
        RETURNING
            is_public,
            public_slug,
            public_title,
            public_tagline,
            public_skills,
            public_district,
            public_primary_room_slug
    """
    
    row = await pool.fetchrow(
        query,
        agent_id,
        is_public,
        public_slug,
        public_title,
        public_tagline,
        public_skills,
        public_district,
        public_primary_room_slug
    )
    
    if not row:
        return None
    
    result = dict(row)
    if result.get("public_skills") is None:
        result["public_skills"] = []
    return result


async def get_agent_rooms(agent_id: str) -> List[dict]:
    """Отримати список кімнат агента (primary/public)"""
    pool = await get_pool()
    
    query = """
        SELECT primary_room_slug, public_primary_room_slug
        FROM agents
        WHERE id = $1
    """
    
    row = await pool.fetchrow(query, agent_id)
    if not row:
        return []
    
    slugs = []
    if row.get("primary_room_slug"):
        slugs.append(row["primary_room_slug"])
    if row.get("public_primary_room_slug") and row["public_primary_room_slug"] not in slugs:
        slugs.append(row["public_primary_room_slug"])
    
    if not slugs:
        return []
    
    rooms_query = """
        SELECT id, slug, name
        FROM city_rooms
        WHERE slug = ANY($1::text[])
    """
    
    rooms = await pool.fetch(rooms_query, slugs)
    return [dict(room) for room in rooms]


async def get_agent_matrix_config(agent_id: str) -> Optional[dict]:
    """Отримати Matrix-конфіг агента"""
    pool = await get_pool()
    
    query = """
        SELECT agent_id, matrix_user_id, primary_room_id
        FROM agent_matrix_config
        WHERE agent_id = $1
    """
    
    row = await pool.fetchrow(query, agent_id)
    return dict(row) if row else None


async def get_public_agent_by_slug(slug: str) -> Optional[dict]:
    """Отримати базову інформацію про публічного агента"""
    pool = await get_pool()
    
    query = """
        SELECT
            id,
            display_name,
            public_primary_room_slug,
            primary_room_slug,
            public_district,
            public_title,
            public_tagline
        FROM agents
        WHERE public_slug = $1
          AND is_public = true
        LIMIT 1
    """
    
    row = await pool.fetchrow(query, slug)
    return dict(row) if row else None


async def get_microdao_for_agent(agent_id: str) -> Optional[dict]:
    """Отримати MicroDAO для агента (аліас get_agent_microdao)"""
    return await get_agent_microdao(agent_id)


# =============================================================================
# Citizens Repository
# =============================================================================

async def get_public_citizens(
    district: Optional[str] = None,
    kind: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> Tuple[List[dict], int]:
    """Отримати публічних громадян"""
    pool = await get_pool()
    
    params: List[Any] = []
    where_clauses = ["a.is_public = true", "a.public_slug IS NOT NULL", "COALESCE(a.is_archived, false) = false"]
    
    if district:
        params.append(district)
        where_clauses.append(f"a.public_district = ${len(params)}")
    
    if kind:
        params.append(kind)
        where_clauses.append(f"a.kind = ${len(params)}")
    
    if q:
        params.append(f"%{q}%")
        where_clauses.append(
            f"(a.display_name ILIKE ${len(params)} OR a.public_title ILIKE ${len(params)} OR a.public_tagline ILIKE ${len(params)})"
        )
    
    where_sql = " AND ".join(where_clauses)
    
    query = f"""
        SELECT
            a.id,
            a.public_slug,
            a.display_name,
            a.public_title,
            a.public_tagline,
            a.avatar_url,
            a.kind,
            a.public_district,
            a.public_primary_room_slug,
            COALESCE(a.public_skills, ARRAY[]::text[]) AS public_skills,
            COALESCE(a.status, 'unknown') AS status,
            a.node_id,
            nc.node_name AS home_node_name,
            nc.hostname AS home_node_hostname,
            nc.roles AS home_node_roles,
            nc.environment AS home_node_environment,
            COUNT(*) OVER() AS total_count
        FROM agents a
        LEFT JOIN node_cache nc ON a.node_id = nc.node_id
        WHERE {where_sql}
        ORDER BY a.display_name
        LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
    """
    
    params.append(limit)
    params.append(offset)
    
    rows = await pool.fetch(query, *params)
    if not rows:
        return [], 0
    
    total = rows[0]["total_count"]
    items = []
    for row in rows:
        data = dict(row)
        data.pop("total_count", None)
        data["public_skills"] = list(data.get("public_skills") or [])
        data["online_status"] = data.get("status") or "unknown"
        # Build home_node object
        if data.get("node_id"):
            data["home_node"] = {
                "id": data.get("node_id"),
                "name": data.get("home_node_name"),
                "hostname": data.get("home_node_hostname"),
                "roles": list(data.get("home_node_roles") or []),
                "environment": data.get("home_node_environment")
            }
        else:
            data["home_node"] = None
        # Clean up intermediate fields
        for key in ["home_node_name", "home_node_hostname", "home_node_roles", "home_node_environment"]:
            data.pop(key, None)
        items.append(data)
    
    return items, total


async def get_agent_microdao(agent_id: str) -> Optional[dict]:
    """Отримати MicroDAO, до якого належить агент (перший збіг)"""
    pool = await get_pool()
    
    query = """
        SELECT
            m.id,
            m.slug,
            m.name,
            m.district
        FROM microdao_agents ma
        JOIN microdaos m ON m.id = ma.microdao_id
        WHERE ma.agent_id = $1
        ORDER BY ma.is_core DESC, m.name
        LIMIT 1
    """
    
    row = await pool.fetchrow(query, agent_id)
    return dict(row) if row else None


async def get_microdao_public_citizens(microdao_id: str) -> List[dict]:
    """Отримати публічних громадян конкретного MicroDAO"""
    pool = await get_pool()
    
    query = """
        SELECT
            a.public_slug AS slug,
            a.display_name,
            a.public_title,
            a.public_tagline,
            a.avatar_url,
            a.public_district,
            a.public_primary_room_slug
        FROM microdao_agents ma
        JOIN agents a ON a.id = ma.agent_id
        WHERE ma.microdao_id = $1
          AND a.is_public = true
          AND a.public_slug IS NOT NULL
        ORDER BY a.display_name
    """
    
    rows = await pool.fetch(query, microdao_id)
    result = []
    for row in rows:
        data = dict(row)
        result.append(data)
    return result


async def get_public_citizen_by_slug(slug: str) -> Optional[dict]:
    """Отримати детальний профіль громадянина"""
    pool = await get_pool()
    
    query = """
        SELECT
            a.id,
            a.display_name,
            a.kind,
            a.status,
            a.node_id,
            a.avatar_url,
            a.public_slug,
            a.public_title,
            a.public_tagline,
            COALESCE(a.public_skills, ARRAY[]::text[]) AS public_skills,
            a.public_district,
            a.public_primary_room_slug,
            a.primary_room_slug,
            nc.node_name AS home_node_name,
            nc.hostname AS home_node_hostname,
            nc.roles AS home_node_roles,
            nc.environment AS home_node_environment
        FROM agents a
        LEFT JOIN node_cache nc ON a.node_id = nc.node_id
        WHERE a.public_slug = $1
          AND a.is_public = true
        LIMIT 1
    """
    
    agent_row = await pool.fetchrow(query, slug)
    if not agent_row:
        return None
    
    agent = dict(agent_row)
    agent["public_skills"] = list(agent.get("public_skills") or [])
    
    # Build home_node object
    home_node = None
    if agent.get("node_id"):
        home_node = {
            "id": agent.get("node_id"),
            "name": agent.get("home_node_name"),
            "hostname": agent.get("home_node_hostname"),
            "roles": list(agent.get("home_node_roles") or []),
            "environment": agent.get("home_node_environment")
        }
    
    rooms = await get_agent_rooms(agent["id"])
    primary_room = agent.get("public_primary_room_slug") or agent.get("primary_room_slug")
    city_presence = {
        "primary_room_slug": primary_room,
        "rooms": rooms
    } if rooms else {
        "primary_room_slug": primary_room,
        "rooms": []
    }
    
    dais_public = {
        "core": {
            "archetype": agent.get("kind"),
            "bio_short": agent.get("public_tagline")
        },
        "phenotype": {
            "visual": {
                "avatar_url": agent.get("avatar_url"),
                "color": None
            }
        },
        "memex": {},
        "economics": {}
    }
    
    interaction = {
        "matrix_user": None,
        "primary_room_slug": primary_room,
        "actions": ["chat", "ask_for_help"]
    }
    
    metrics_public: Dict[str, Any] = {}
    
    microdao = await get_agent_microdao(agent["id"])
    
    return {
        "slug": agent["public_slug"],
        "display_name": agent["display_name"],
        "kind": agent.get("kind"),
        "public_title": agent.get("public_title"),
        "public_tagline": agent.get("public_tagline"),
        "district": agent.get("public_district"),
        "avatar_url": agent.get("avatar_url"),
        "status": agent.get("status"),
        "node_id": agent.get("node_id"),
        "public_skills": agent.get("public_skills"),
        "city_presence": city_presence,
        "dais_public": dais_public,
        "interaction": interaction,
        "metrics_public": metrics_public,
        "microdao": microdao,
        "admin_panel_url": f"/agents/{agent['id']}",
        "home_node": home_node
    }


# =============================================================================
# MicroDAO Membership Repository
# =============================================================================

async def get_microdao_options() -> List[dict]:
    """Отримати список активних MicroDAO для селектора"""
    pool = await get_pool()
    
    query = """
        SELECT id, slug, name, district, is_active
        FROM microdaos
        WHERE is_active = true
        ORDER BY name
    """
    
    rows = await pool.fetch(query)
    return [dict(row) for row in rows]


async def get_agent_microdao_memberships(agent_id: str) -> List[dict]:
    """Отримати всі членства агента в MicroDAO"""
    pool = await get_pool()
    
    query = """
        SELECT
            ma.microdao_id,
            m.slug AS microdao_slug,
            m.name AS microdao_name,
            ma.role,
            ma.is_core
        FROM microdao_agents ma
        JOIN microdaos m ON m.id = ma.microdao_id
        WHERE ma.agent_id = $1
        ORDER BY ma.is_core DESC, m.name
    """
    
    rows = await pool.fetch(query, agent_id)
    return [dict(row) for row in rows]


async def upsert_agent_microdao_membership(
    agent_id: str,
    microdao_id: str,
    role: Optional[str],
    is_core: bool
) -> Optional[dict]:
    """Призначити або оновити членство агента в MicroDAO"""
    pool = await get_pool()
    
    query = """
        WITH upsert AS (
            INSERT INTO microdao_agents (microdao_id, agent_id, role, is_core)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (microdao_id, agent_id)
            DO UPDATE SET role = EXCLUDED.role, is_core = EXCLUDED.is_core
            RETURNING microdao_id, agent_id, role, is_core
        )
        SELECT
            u.microdao_id,
            m.slug AS microdao_slug,
            m.name AS microdao_name,
            u.role,
            u.is_core
        FROM upsert u
        JOIN microdaos m ON m.id = u.microdao_id
    """
    
    row = await pool.fetchrow(query, microdao_id, agent_id, role, is_core)
    return dict(row) if row else None


async def remove_agent_microdao_membership(agent_id: str, microdao_id: str) -> bool:
    """Видалити членство агента в MicroDAO"""
    pool = await get_pool()
    
    result = await pool.execute(
        "DELETE FROM microdao_agents WHERE agent_id = $1 AND microdao_id = $2",
        agent_id,
        microdao_id
    )
    
    # asyncpg returns strings like "DELETE 1"
    return result.split(" ")[-1] != "0"


# =============================================================================
# MicroDAO Repository
# =============================================================================

async def get_microdaos(district: Optional[str] = None, q: Optional[str] = None, limit: int = 50, offset: int = 0) -> List[dict]:
    """Отримати список MicroDAOs з агрегованою статистикою"""
    pool = await get_pool()
    
    params = []
    
    where_clauses = ["m.is_public = true", "m.is_active = true", "COALESCE(m.is_archived, false) = false"]
    
    if district:
        params.append(district)
        where_clauses.append(f"m.district = ${len(params)}")
        
    if q:
        params.append(f"%{q}%")
        where_clauses.append(f"(m.name ILIKE ${len(params)} OR m.description ILIKE ${len(params)})")
        
    where_sql = " AND ".join(where_clauses)
    
    query = f"""
        SELECT
          m.id,
          m.slug,
          m.name,
          m.description,
          m.district,
          m.owner_agent_id as orchestrator_agent_id,
          m.is_active,
          m.logo_url,
          COUNT(DISTINCT ma.agent_id) AS agents_count,
          COUNT(DISTINCT mc.id) AS channels_count,
          COUNT(DISTINCT CASE WHEN mc.kind = 'city_room' THEN mc.id END) AS rooms_count
        FROM microdaos m
        LEFT JOIN microdao_agents ma ON ma.microdao_id = m.id
        LEFT JOIN microdao_channels mc ON mc.microdao_id = m.id
        WHERE {where_sql}
        GROUP BY m.id
        ORDER BY m.name
        LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
    """
    
    # Append limit and offset to params
    params.append(limit)
    params.append(offset)
    
    rows = await pool.fetch(query, *params)
    return [dict(row) for row in rows]


async def get_microdao_by_slug(slug: str) -> Optional[dict]:
    """Отримати детальну інформацію про MicroDAO"""
    pool = await get_pool()
    
    # 1. Get main DAO info
    query_dao = """
        SELECT
          m.id,
          m.slug,
          m.name,
          m.description,
          m.district,
          m.owner_agent_id as orchestrator_agent_id,
          m.is_active,
          m.is_public,
          m.logo_url,
          a.display_name as orchestrator_display_name
        FROM microdaos m
        LEFT JOIN agents a ON m.owner_agent_id = a.id
        WHERE m.slug = $1 AND COALESCE(m.is_archived, false) = false
    """
    
    dao_row = await pool.fetchrow(query_dao, slug)
    if not dao_row:
        return None
        
    result = dict(dao_row)
    dao_id = result["id"]
    
    # 2. Get Agents
    query_agents = """
        SELECT 
            ma.agent_id,
            ma.role,
            ma.is_core,
            a.display_name
        FROM microdao_agents ma
        JOIN agents a ON ma.agent_id = a.id
        WHERE ma.microdao_id = $1
        ORDER BY ma.is_core DESC, ma.role
    """
    agents_rows = await pool.fetch(query_agents, dao_id)
    result["agents"] = [dict(row) for row in agents_rows]
    
    # 3. Get Channels
    query_channels = """
        SELECT 
            kind,
            ref_id,
            display_name,
            is_primary
        FROM microdao_channels
        WHERE microdao_id = $1
        ORDER BY is_primary DESC, kind
    """
    channels_rows = await pool.fetch(query_channels, dao_id)
    result["channels"] = [dict(row) for row in channels_rows]
    
    public_citizens = await get_microdao_public_citizens(dao_id)
    result["public_citizens"] = public_citizens
    
    return result


# =============================================================================
# Nodes Repository
# =============================================================================

async def get_all_nodes() -> List[dict]:
    """Отримати список всіх нод з кількістю агентів"""
    pool = await get_pool()
    
    query = """
        SELECT 
            nc.node_id,
            nc.node_name AS name,
            nc.hostname,
            nc.roles,
            nc.environment,
            nc.status,
            nc.gpu,
            nc.last_sync AS last_heartbeat,
            (SELECT COUNT(*) FROM agents a WHERE a.node_id = nc.node_id) AS agents_total,
            (SELECT COUNT(*) FROM agents a WHERE a.node_id = nc.node_id AND a.status = 'online') AS agents_online
        FROM node_cache nc
        ORDER BY nc.environment DESC, nc.node_name
    """
    
    rows = await pool.fetch(query)
    return [dict(row) for row in rows]


async def get_node_by_id(node_id: str) -> Optional[dict]:
    """Отримати ноду по ID"""
    pool = await get_pool()
    
    query = """
        SELECT 
            nc.node_id,
            nc.node_name AS name,
            nc.hostname,
            nc.roles,
            nc.environment,
            nc.status,
            nc.gpu,
            nc.last_sync AS last_heartbeat,
            (SELECT COUNT(*) FROM agents a WHERE a.node_id = nc.node_id) AS agents_total,
            (SELECT COUNT(*) FROM agents a WHERE a.node_id = nc.node_id AND a.status = 'online') AS agents_online
        FROM node_cache nc
        WHERE nc.node_id = $1
    """
    
    row = await pool.fetchrow(query, node_id)
    return dict(row) if row else None

