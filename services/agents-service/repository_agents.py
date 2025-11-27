"""
Agent Repository — Database operations for agents
Phase 6: CRUD + DB Persistence
"""
import uuid
from typing import List, Optional
from datetime import datetime
import asyncpg
from models import AgentCreate, AgentUpdate, AgentRead, AgentBlueprint

class AgentRepository:
    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool
    
    # ========================================================================
    # Blueprints
    # ========================================================================
    
    async def get_blueprint_by_code(self, code: str) -> Optional[AgentBlueprint]:
        """Get blueprint by code"""
        row = await self.db.fetchrow(
            """
            SELECT id, code, name, description, default_model, 
                   default_tools, default_system_prompt, created_at
            FROM agent_blueprints
            WHERE code = $1
            """,
            code
        )
        
        if not row:
            return None
        
        return AgentBlueprint(
            id=str(row['id']),
            code=row['code'],
            name=row['name'],
            description=row['description'],
            default_model=row['default_model'],
            default_tools=row['default_tools'] or [],
            default_system_prompt=row['default_system_prompt'],
            created_at=row['created_at']
        )
    
    async def list_blueprints(self) -> List[AgentBlueprint]:
        """List all blueprints"""
        rows = await self.db.fetch(
            """
            SELECT id, code, name, description, default_model,
                   default_tools, default_system_prompt, created_at
            FROM agent_blueprints
            ORDER BY name
            """
        )
        
        return [
            AgentBlueprint(
                id=str(row['id']),
                code=row['code'],
                name=row['name'],
                description=row['description'],
                default_model=row['default_model'],
                default_tools=row['default_tools'] or [],
                default_system_prompt=row['default_system_prompt'],
                created_at=row['created_at']
            )
            for row in rows
        ]
    
    # ========================================================================
    # Agents — CRUD
    # ========================================================================
    
    async def create_agent(
        self, 
        data: AgentCreate,
        actor_id: Optional[str] = None
    ) -> AgentRead:
        """Create new agent"""
        # Get blueprint
        blueprint = await self.get_blueprint_by_code(data.blueprint_code)
        if not blueprint:
            raise ValueError(f"Blueprint '{data.blueprint_code}' not found")
        
        # Generate IDs
        agent_id = uuid.uuid4()
        external_id = f"agent:{agent_id.hex[:12]}"
        
        # Determine model (use provided or blueprint default)
        model = data.model or blueprint.default_model
        
        # Determine system prompt
        system_prompt = data.system_prompt or blueprint.default_system_prompt
        
        # Insert
        row = await self.db.fetchrow(
            """
            INSERT INTO agents (
                id, external_id, name, kind, microdao_id, owner_user_id,
                blueprint_id, model, tools_enabled, system_prompt,
                avatar_url, description, is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id, external_id, name, kind, microdao_id, owner_user_id,
                      blueprint_id, model, tools_enabled, system_prompt,
                      avatar_url, description, is_active, created_at, updated_at
            """,
            agent_id,
            external_id,
            data.name,
            data.kind.value,
            uuid.UUID(data.microdao_id) if data.microdao_id else None,
            uuid.UUID(data.owner_user_id or actor_id) if (data.owner_user_id or actor_id) else None,
            uuid.UUID(blueprint.id),
            model,
            data.tools_enabled or [],
            system_prompt,
            data.avatar_url,
            data.description,
            True
        )
        
        return self._row_to_agent_read(row)
    
    async def update_agent(
        self,
        agent_id: str,
        data: AgentUpdate
    ) -> AgentRead:
        """Update agent"""
        # Build dynamic update query
        updates = []
        values = []
        param_idx = 1
        
        if data.name is not None:
            updates.append(f"name = ${param_idx}")
            values.append(data.name)
            param_idx += 1
        
        if data.description is not None:
            updates.append(f"description = ${param_idx}")
            values.append(data.description)
            param_idx += 1
        
        if data.model is not None:
            updates.append(f"model = ${param_idx}")
            values.append(data.model)
            param_idx += 1
        
        if data.tools_enabled is not None:
            updates.append(f"tools_enabled = ${param_idx}")
            values.append(data.tools_enabled)
            param_idx += 1
        
        if data.system_prompt is not None:
            updates.append(f"system_prompt = ${param_idx}")
            values.append(data.system_prompt)
            param_idx += 1
        
        if data.avatar_url is not None:
            updates.append(f"avatar_url = ${param_idx}")
            values.append(data.avatar_url)
            param_idx += 1
        
        if data.is_active is not None:
            updates.append(f"is_active = ${param_idx}")
            values.append(data.is_active)
            param_idx += 1
        
        if not updates:
            # No changes
            return await self.get_agent_by_external_id(agent_id)
        
        # Always update updated_at
        updates.append(f"updated_at = NOW()")
        
        # Add agent_id to values
        values.append(agent_id)
        
        query = f"""
            UPDATE agents
            SET {', '.join(updates)}
            WHERE external_id = ${param_idx}
            RETURNING id, external_id, name, kind, microdao_id, owner_user_id,
                      blueprint_id, model, tools_enabled, system_prompt,
                      avatar_url, description, is_active, created_at, updated_at
        """
        
        row = await self.db.fetchrow(query, *values)
        
        if not row:
            raise ValueError(f"Agent '{agent_id}' not found")
        
        return self._row_to_agent_read(row)
    
    async def delete_agent(self, agent_id: str) -> None:
        """Soft delete agent (set is_active = false)"""
        result = await self.db.execute(
            """
            UPDATE agents
            SET is_active = false, updated_at = NOW()
            WHERE external_id = $1
            """,
            agent_id
        )
        
        if result == "UPDATE 0":
            raise ValueError(f"Agent '{agent_id}' not found")
    
    async def get_agent_by_external_id(self, external_id: str) -> Optional[AgentRead]:
        """Get agent by external_id"""
        row = await self.db.fetchrow(
            """
            SELECT id, external_id, name, kind, microdao_id, owner_user_id,
                   blueprint_id, model, tools_enabled, system_prompt,
                   avatar_url, description, is_active, created_at, updated_at
            FROM agents
            WHERE external_id = $1
            """,
            external_id
        )
        
        if not row:
            return None
        
        return self._row_to_agent_read(row)
    
    async def list_agents(
        self,
        microdao_id: Optional[str] = None,
        owner_user_id: Optional[str] = None,
        kind: Optional[str] = None,
        is_active: bool = True
    ) -> List[AgentRead]:
        """List agents with filters"""
        query = """
            SELECT id, external_id, name, kind, microdao_id, owner_user_id,
                   blueprint_id, model, tools_enabled, system_prompt,
                   avatar_url, description, is_active, created_at, updated_at
            FROM agents
            WHERE 1=1
        """
        
        values = []
        param_idx = 1
        
        if microdao_id:
            query += f" AND microdao_id = ${param_idx}"
            values.append(uuid.UUID(microdao_id))
            param_idx += 1
        
        if owner_user_id:
            query += f" AND owner_user_id = ${param_idx}"
            values.append(uuid.UUID(owner_user_id))
            param_idx += 1
        
        if kind:
            query += f" AND kind = ${param_idx}"
            values.append(kind)
            param_idx += 1
        
        query += f" AND is_active = ${param_idx}"
        values.append(is_active)
        
        query += " ORDER BY created_at DESC"
        
        rows = await self.db.fetch(query, *values)
        
        return [self._row_to_agent_read(row) for row in rows]
    
    # ========================================================================
    # Helpers
    # ========================================================================
    
    def _row_to_agent_read(self, row) -> AgentRead:
        """Convert DB row to AgentRead"""
        from models import AgentKind
        
        return AgentRead(
            id=str(row['id']),
            external_id=row['external_id'],
            name=row['name'],
            kind=AgentKind(row['kind']),
            description=row['description'],
            microdao_id=str(row['microdao_id']) if row['microdao_id'] else None,
            owner_user_id=str(row['owner_user_id']) if row['owner_user_id'] else None,
            blueprint_id=str(row['blueprint_id']) if row['blueprint_id'] else None,
            model=row['model'],
            tools_enabled=row['tools_enabled'] or [],
            system_prompt=row['system_prompt'],
            avatar_url=row['avatar_url'],
            is_active=row['is_active'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )

