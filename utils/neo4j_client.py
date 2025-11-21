"""
Neo4j Client для Router
Інтеграція Neo4j для збереження взаємодій та knowledge graphs
"""

import logging
import os
from typing import Optional, Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)

# Neo4j driver (if available)
try:
    from neo4j import AsyncGraphDatabase
    NEO4J_AVAILABLE = True
except ImportError:
    NEO4J_AVAILABLE = False
    logger.warning("Neo4j driver not available. Install with: pip install neo4j")


class Neo4jClient:
    """Клієнт для роботи з Neo4j"""
    
    def __init__(
        self,
        uri: Optional[str] = None,
        user: Optional[str] = None,
        password: Optional[str] = None
    ):
        """
        Initialize Neo4j client.
        
        Args:
            uri: Neo4j URI (default: from env NEO4J_URI)
            user: Neo4j user (default: from env NEO4J_USER)
            password: Neo4j password (default: from env NEO4J_PASSWORD)
        """
        if not NEO4J_AVAILABLE:
            raise RuntimeError("Neo4j driver not available. Install with: pip install neo4j")
        
        self.uri = uri or os.getenv("NEO4J_URI", "bolt://neo4j:7687")
        self.user = user or os.getenv("NEO4J_USER", "neo4j")
        self.password = password or os.getenv("NEO4J_PASSWORD", "neo4jpassword")
        
        self.driver = None
        self._connected = False
    
    async def connect(self):
        """Підключитися до Neo4j"""
        if self._connected:
            return
        
        try:
            self.driver = AsyncGraphDatabase.driver(
                self.uri,
                auth=(self.user, self.password)
            )
            # Test connection
            async with self.driver.session() as session:
                await session.run("RETURN 1")
            
            self._connected = True
            logger.info(f"Connected to Neo4j: {self.uri}")
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {e}")
            raise
    
    async def close(self):
        """Закрити з'єднання"""
        if self.driver:
            await self.driver.close()
            self._connected = False
            logger.info("Neo4j connection closed")
    
    async def save_interaction(
        self,
        user_id: str,
        agent_id: str,
        message: str,
        response: str,
        dao_id: Optional[str] = None,
        session_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Зберегти взаємодію користувача з агентом
        
        Args:
            user_id: User ID
            agent_id: Agent ID
            message: User message
            response: Agent response
            dao_id: Optional DAO ID
            session_id: Optional session ID
            metadata: Optional metadata
        """
        if not self._connected:
            await self.connect()
        
        try:
            async with self.driver.session() as session:
                query = """
                // Створити/оновити вузли
                MERGE (u:User {user_id: $user_id})
                MERGE (a:Agent {agent_id: $agent_id})
                
                // Створити взаємодію
                CREATE (i:Interaction {
                    message: $message,
                    response: $response,
                    created_at: datetime(),
                    session_id: $session_id
                })
                
                // Зв'язки
                MERGE (u)-[:ASKED]->(i)
                MERGE (a)-[:RESPONDED]->(i)
                """
                
                params = {
                    "user_id": user_id,
                    "agent_id": agent_id,
                    "message": message[:1000],  # Обмежуємо довжину
                    "response": response[:2000],  # Обмежуємо довжину
                    "session_id": session_id or f"{user_id}_{agent_id}",
                }
                
                await session.run(query, params)
                
                # Якщо є DAO
                if dao_id:
                    dao_query = """
                    MATCH (u:User {user_id: $user_id})
                    MATCH (a:Agent {agent_id: $agent_id})
                    MERGE (d:DAO {dao_id: $dao_id})
                    MERGE (u)-[:MEMBER_OF]->(d)
                    MERGE (d)-[:OWNS_AGENT]->(a)
                    """
                    await session.run(dao_query, {
                        "user_id": user_id,
                        "agent_id": agent_id,
                        "dao_id": dao_id
                    })
                
                logger.debug(f"Saved interaction: user={user_id}, agent={agent_id}")
        
        except Exception as e:
            logger.error(f"Failed to save interaction: {e}", exc_info=True)
    
    async def get_user_interactions(
        self,
        user_id: str,
        agent_id: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Отримати взаємодії користувача
        
        Args:
            user_id: User ID
            agent_id: Optional agent ID filter
            limit: Maximum number of interactions
        
        Returns:
            List of interactions
        """
        if not self._connected:
            await self.connect()
        
        try:
            async with self.driver.session() as session:
                if agent_id:
                    query = """
                    MATCH (u:User {user_id: $user_id})-[:ASKED]->(i:Interaction)
                    MATCH (a:Agent {agent_id: $agent_id})-[:RESPONDED]->(i)
                    RETURN i.message, i.response, i.created_at
                    ORDER BY i.created_at DESC
                    LIMIT $limit
                    """
                    params = {"user_id": user_id, "agent_id": agent_id, "limit": limit}
                else:
                    query = """
                    MATCH (u:User {user_id: $user_id})-[:ASKED]->(i:Interaction)
                    RETURN i.message, i.response, i.created_at
                    ORDER BY i.created_at DESC
                    LIMIT $limit
                    """
                    params = {"user_id": user_id, "limit": limit}
                
                result = await session.run(query, params)
                interactions = []
                
                async for record in result:
                    interactions.append({
                        "message": record.get("i.message", ""),
                        "response": record.get("i.response", ""),
                        "created_at": record.get("i.created_at", "")
                    })
                
                return interactions
        
        except Exception as e:
            logger.error(f"Failed to get user interactions: {e}", exc_info=True)
            return []
    
    async def get_agent_stats(
        self,
        agent_id: str
    ) -> Dict[str, Any]:
        """
        Отримати статистику агента
        
        Args:
            agent_id: Agent ID
        
        Returns:
            Statistics dictionary
        """
        if not self._connected:
            await self.connect()
        
        try:
            async with self.driver.session() as session:
                query = """
                MATCH (a:Agent {agent_id: $agent_id})-[:RESPONDED]->(i:Interaction)
                RETURN count(i) as total_interactions,
                       count(DISTINCT (i)<-[:ASKED]-(u:User)) as unique_users
                """
                
                result = await session.run(query, {"agent_id": agent_id})
                record = await result.single()
                
                if record:
                    return {
                        "agent_id": agent_id,
                        "total_interactions": record.get("total_interactions", 0),
                        "unique_users": record.get("unique_users", 0)
                    }
                else:
                    return {
                        "agent_id": agent_id,
                        "total_interactions": 0,
                        "unique_users": 0
                    }
        
        except Exception as e:
            logger.error(f"Failed to get agent stats: {e}", exc_info=True)
            return {
                "agent_id": agent_id,
                "total_interactions": 0,
                "unique_users": 0
            }


# Global instance
_neo4j_client: Optional[Neo4jClient] = None


def get_neo4j_client() -> Optional[Neo4jClient]:
    """Отримати глобальний Neo4j client"""
    global _neo4j_client
    
    if not NEO4J_AVAILABLE:
        return None
    
    if _neo4j_client is None:
        try:
            _neo4j_client = Neo4jClient()
        except Exception as e:
            logger.warning(f"Failed to create Neo4j client: {e}")
            return None
    
    return _neo4j_client

