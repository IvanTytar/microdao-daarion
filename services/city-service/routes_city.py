"""
City Backend API Routes
"""

from fastapi import APIRouter, HTTPException, Depends, Body, Header, Query, Request
from pydantic import BaseModel
from typing import List, Optional
import logging
import httpx
import os

from models_city import (
    CityRoomRead,
    CityRoomCreate,
    CityRoomDetail,
    CityRoomMessageRead,
    CityRoomMessageCreate,
    CityFeedEventRead,
    CityMapRoom,
    CityMapConfig,
    CityMapResponse,
    AgentRead,
    AgentPresence,
    AgentSummary,
    MicrodaoBadge,
    HomeNodeView,
    NodeProfile,
    PublicCitizenSummary,
    PublicCitizenProfile,
    CitizenInteractionInfo,
    CitizenAskRequest,
    CitizenAskResponse,
    AgentMicrodaoMembership,
    MicrodaoSummary,
    MicrodaoDetail,
    MicrodaoAgentView,
    MicrodaoChannelView,
    MicrodaoCitizenView,
    MicrodaoOption
)
import repo_city
from common.redis_client import PresenceRedis, get_redis
from matrix_client import create_matrix_room, find_matrix_room_by_alias
from dagi_router_client import get_dagi_router_client, DagiRouterClient

logger = logging.getLogger(__name__)

# JWT validation (simplified for MVP)
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://daarion-auth:7020")
MATRIX_GATEWAY_URL = os.getenv("MATRIX_GATEWAY_URL", "http://daarion-matrix-gateway:7025")

router = APIRouter(prefix="/city", tags=["city"])
public_router = APIRouter(prefix="/public", tags=["public"])
api_router = APIRouter(prefix="/api/v1", tags=["api_v1"])


class MicrodaoMembershipPayload(BaseModel):
    microdao_id: str
    role: Optional[str] = None
    is_core: bool = False


# =============================================================================
# Agents API (for Agent Console)
# =============================================================================

@public_router.get("/agents")
async def list_agents(
    kind: Optional[str] = Query(None, description="Filter by agent kind"),
    node_id: Optional[str] = Query(None, description="Filter by node_id"),
    microdao_id: Optional[str] = Query(None, description="Filter by microDAO id"),
    is_public: Optional[bool] = Query(None, description="Filter by public status"),
    visibility_scope: Optional[str] = Query(None, description="Filter by visibility: global, microdao, private"),
    include_system: bool = Query(True, description="Include system agents"),
    limit: int = Query(100, le=200),
    offset: int = Query(0, ge=0)
):
    """Список всіх агентів для Agent Console (unified API)"""
    try:
        kinds_list = [kind] if kind else None
        agents, total = await repo_city.list_agent_summaries(
            node_id=node_id,
            microdao_id=microdao_id,
            is_public=is_public,
            visibility_scope=visibility_scope,
            kinds=kinds_list,
            include_system=include_system,
            limit=limit,
            offset=offset
        )
        
        items: List[AgentSummary] = []
        for agent in agents:
            # Build home_node if available
            home_node_data = agent.get("home_node")
            home_node = None
            if home_node_data:
                home_node = HomeNodeView(
                    id=home_node_data.get("id"),
                    name=home_node_data.get("name"),
                    hostname=home_node_data.get("hostname"),
                    roles=home_node_data.get("roles", []),
                    environment=home_node_data.get("environment")
                )
            
            # Build microdao badges
            microdaos = [
                MicrodaoBadge(
                    id=m.get("id", ""),
                    name=m.get("name", ""),
                    slug=m.get("slug"),
                    role=m.get("role")
                )
                for m in agent.get("microdaos", [])
            ]
            
            items.append(AgentSummary(
                id=agent["id"],
                slug=agent.get("slug"),
                display_name=agent["display_name"],
                title=agent.get("title"),
                tagline=agent.get("tagline"),
                kind=agent.get("kind", "assistant"),
                avatar_url=agent.get("avatar_url"),
                status=agent.get("status", "offline"),
                node_id=agent.get("node_id"),
                node_label=agent.get("node_label"),
                home_node=home_node,
                visibility_scope=agent.get("visibility_scope", "city"),
                is_listed_in_directory=agent.get("is_listed_in_directory", True),
                is_system=agent.get("is_system", False),
                is_public=agent.get("is_public", False),
                is_orchestrator=agent.get("is_orchestrator", False),
                primary_microdao_id=agent.get("primary_microdao_id"),
                primary_microdao_name=agent.get("primary_microdao_name"),
                primary_microdao_slug=agent.get("primary_microdao_slug"),
                district=agent.get("district"),
                microdaos=microdaos,
                microdao_memberships=agent.get("microdao_memberships", []),
                public_skills=agent.get("public_skills", [])
            ))
        
        return {"items": items, "total": total}
    except Exception as e:
        logger.error(f"Failed to list agents: {e}")
        raise HTTPException(status_code=500, detail="Failed to list agents")


class AgentVisibilityPayload(BaseModel):
    visibility_scope: str  # city, microdao, owner_only
    is_listed_in_directory: bool = True


@router.put("/agents/{agent_id}/visibility")
async def update_agent_visibility(
    agent_id: str,
    payload: AgentVisibilityPayload
):
    """Оновити налаштування видимості агента"""
    try:
        # Validate visibility_scope
        if payload.visibility_scope not in ("city", "microdao", "owner_only"):
            raise HTTPException(
                status_code=400, 
                detail="visibility_scope must be one of: city, microdao, owner_only"
            )
        
        # Update in database
        success = await repo_city.update_agent_visibility(
            agent_id=agent_id,
            visibility_scope=payload.visibility_scope,
            is_listed_in_directory=payload.is_listed_in_directory
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        return {"status": "ok", "agent_id": agent_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update agent visibility: {e}")
        raise HTTPException(status_code=500, detail="Failed to update visibility")


# =============================================================================
# Nodes API (for Node Directory)
# =============================================================================

@public_router.get("/nodes")
async def list_nodes():
    """Список всіх нод мережі"""
    try:
        nodes = await repo_city.get_all_nodes()
        
        items: List[NodeProfile] = []
        for node in nodes:
            items.append(NodeProfile(
                node_id=node["node_id"],
                name=node["name"],
                hostname=node.get("hostname"),
                roles=list(node.get("roles") or []),
                environment=node.get("environment", "unknown"),
                status=node.get("status", "offline"),
                gpu_info=node.get("gpu"),
                agents_total=node.get("agents_total", 0),
                agents_online=node.get("agents_online", 0),
                last_heartbeat=str(node["last_heartbeat"]) if node.get("last_heartbeat") else None
            ))
        
        return {"items": items, "total": len(items)}
    except Exception as e:
        logger.error(f"Failed to list nodes: {e}")
        raise HTTPException(status_code=500, detail="Failed to list nodes")


@public_router.get("/nodes/{node_id}")
async def get_node_profile(node_id: str):
    """Отримати профіль ноди"""
    try:
        node = await repo_city.get_node_by_id(node_id)
        if not node:
            raise HTTPException(status_code=404, detail="Node not found")
        
        return NodeProfile(
            node_id=node["node_id"],
            name=node["name"],
            hostname=node.get("hostname"),
            roles=list(node.get("roles") or []),
            environment=node.get("environment", "unknown"),
            status=node.get("status", "offline"),
            gpu_info=node.get("gpu"),
            agents_total=node.get("agents_total", 0),
            agents_online=node.get("agents_online", 0),
            last_heartbeat=str(node["last_heartbeat"]) if node.get("last_heartbeat") else None
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get node {node_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get node")


# =============================================================================
# Public Citizens API
# =============================================================================

@public_router.get("/citizens")
async def list_public_citizens(
    district: Optional[str] = Query(None, description="Filter by district"),
    kind: Optional[str] = Query(None, description="Filter by agent kind"),
    q: Optional[str] = Query(None, description="Search by display name or title"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0)
):
    """Публічний список громадян з фільтрами"""
    try:
        citizens, total = await repo_city.get_public_citizens(
            district=district,
            kind=kind,
            q=q,
            limit=limit,
            offset=offset
        )
        
        items: List[PublicCitizenSummary] = []
        for citizen in citizens:
            # Build home_node if available
            home_node_data = citizen.get("home_node")
            home_node = None
            if home_node_data:
                home_node = HomeNodeView(
                    id=home_node_data.get("id"),
                    name=home_node_data.get("name"),
                    hostname=home_node_data.get("hostname"),
                    roles=home_node_data.get("roles", []),
                    environment=home_node_data.get("environment")
                )
            
            items.append(PublicCitizenSummary(
                slug=citizen["public_slug"],
                display_name=citizen["display_name"],
                public_title=citizen.get("public_title"),
                public_tagline=citizen.get("public_tagline"),
                avatar_url=citizen.get("avatar_url"),
                kind=citizen.get("kind"),
                district=citizen.get("public_district"),
                primary_room_slug=citizen.get("public_primary_room_slug"),
                public_skills=citizen.get("public_skills", []),
                online_status=citizen.get("online_status"),
                status=citizen.get("status"),
                home_node=home_node
            ))
        
        return {"items": items, "total": total}
    except Exception as e:
        logger.error(f"Failed to list public citizens: {e}")
        raise HTTPException(status_code=500, detail="Failed to list public citizens")


@public_router.get("/citizens/{slug}")
async def get_public_citizen(slug: str, request: Request):
    """Отримати публічний профіль громадянина"""
    try:
        include_admin_url = False
        authorization = request.headers.get("Authorization")
        if authorization:
            user_info = await validate_jwt_token(authorization)
            if user_info:
                roles = user_info.get("roles", [])
                if any(role in ["admin", "architect"] for role in roles):
                    include_admin_url = True
        
        citizen = await repo_city.get_public_citizen_by_slug(slug)
        if not citizen:
            raise HTTPException(status_code=404, detail=f"Citizen not found: {slug}")
        
        if not include_admin_url:
            citizen["admin_panel_url"] = None
        
        return PublicCitizenProfile(**citizen)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get public citizen {slug}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get citizen")


@public_router.get("/citizens/{slug}/interaction", response_model=CitizenInteractionInfo)
async def get_citizen_interaction_info(slug: str):
    """Отримати інформацію для взаємодії з громадянином"""
    try:
        agent = await repo_city.get_public_agent_by_slug(slug)
        if not agent:
            raise HTTPException(status_code=404, detail=f"Citizen not found: {slug}")
        
        matrix_config = await repo_city.get_agent_matrix_config(agent["id"])
        matrix_user_id = matrix_config.get("matrix_user_id") if matrix_config else None
        
        primary_room_slug = agent.get("public_primary_room_slug") or agent.get("primary_room_slug")
        primary_room_id = matrix_config.get("primary_room_id") if matrix_config else None
        primary_room_name = None
        room_record = None
        
        if primary_room_id:
            room_record = await repo_city.get_room_by_id(primary_room_id)
        elif primary_room_slug:
            room_record = await repo_city.get_room_by_slug(primary_room_slug)
        
        if room_record:
            primary_room_id = room_record.get("id")
            primary_room_name = room_record.get("name")
            primary_room_slug = room_record.get("slug") or primary_room_slug
        
        microdao = await repo_city.get_microdao_for_agent(agent["id"])
        
        return CitizenInteractionInfo(
            slug=slug,
            display_name=agent["display_name"],
            primary_room_slug=primary_room_slug,
            primary_room_id=primary_room_id,
            primary_room_name=primary_room_name,
            matrix_user_id=matrix_user_id,
            district=agent.get("public_district"),
            microdao_slug=microdao.get("slug") if microdao else None,
            microdao_name=microdao.get("name") if microdao else None,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get interaction info for citizen {slug}: {e}")
        raise HTTPException(status_code=500, detail="Failed to load interaction info")


@public_router.post("/citizens/{slug}/ask", response_model=CitizenAskResponse)
async def ask_citizen(
    slug: str,
    payload: CitizenAskRequest,
    router_client: DagiRouterClient = Depends(get_dagi_router_client),
):
    """Надіслати запитання громадянину через DAGI Router"""
    question = (payload.question or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")
    
    try:
        agent = await repo_city.get_public_agent_by_slug(slug)
        if not agent:
            raise HTTPException(status_code=404, detail=f"Citizen not found: {slug}")
        
        router_response = await router_client.ask_agent(
            agent_id=agent["id"],
            prompt=question,
            system_prompt=payload.context,
        )
        
        answer = (
            router_response.get("response")
            or router_response.get("answer")
            or router_response.get("result")
        )
        if answer:
            answer = answer.strip()
        if not answer:
            answer = "Вибач, агент наразі не може відповісти."
        
        return CitizenAskResponse(
            answer=answer,
            agent_display_name=agent["display_name"],
            agent_id=agent["id"],
        )
    except HTTPException:
        raise
    except httpx.HTTPError as e:
        logger.error(f"DAGI Router request failed for citizen {slug}: {e}")
        raise HTTPException(status_code=502, detail="Citizen is temporarily unavailable")
    except Exception as e:
        logger.error(f"Failed to ask citizen {slug}: {e}")
        raise HTTPException(status_code=500, detail="Failed to ask citizen")


# =============================================================================
# API v1 — MicroDAO Membership
# =============================================================================

@api_router.get("/microdao/options")
async def get_microdao_options():
    """Отримати список MicroDAO для селектора"""
    try:
        options = await repo_city.get_microdao_options()
        items = [MicrodaoOption(**option) for option in options]
        return {"items": items}
    except Exception as e:
        logger.error(f"Failed to get microdao options: {e}")
        raise HTTPException(status_code=500, detail="Failed to get microdao options")


@api_router.put("/agents/{agent_id}/microdao-membership")
async def assign_agent_microdao_membership(
    agent_id: str,
    payload: MicrodaoMembershipPayload,
    authorization: Optional[str] = Header(None)
):
    """Призначити/оновити членство агента в MicroDAO"""
    await ensure_architect_or_admin(authorization)
    
    try:
        membership = await repo_city.upsert_agent_microdao_membership(
            agent_id=agent_id,
            microdao_id=payload.microdao_id,
            role=payload.role,
            is_core=payload.is_core
        )
        if not membership:
            raise HTTPException(status_code=404, detail="MicroDAO not found")
        return membership
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to assign microdao membership: {e}")
        raise HTTPException(status_code=500, detail="Failed to assign microdao membership")


@api_router.delete("/agents/{agent_id}/microdao-membership/{microdao_id}")
async def delete_agent_microdao_membership(
    agent_id: str,
    microdao_id: str,
    authorization: Optional[str] = Header(None)
):
    """Видалити членство агента в MicroDAO"""
    await ensure_architect_or_admin(authorization)
    
    try:
        deleted = await repo_city.remove_agent_microdao_membership(agent_id, microdao_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Membership not found")
        return {"status": "deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete microdao membership: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete microdao membership")


# =============================================================================
# City Rooms API
# =============================================================================

@router.get("/rooms", response_model=List[CityRoomRead])
async def get_city_rooms(limit: int = 100, offset: int = 0):
    """
    Отримати список всіх City Rooms
    """
    try:
        rooms = await repo_city.get_all_rooms(limit=limit, offset=offset)
        
        # Додати online count (приблизно)
        online_count = await PresenceRedis.get_online_count()
        
        result = []
        for room in rooms:
            result.append({
                **room,
                "members_online": online_count if room.get("is_default") else max(1, online_count // 2),
                "last_event": None  # TODO: з останнього повідомлення
            })
        
        return result
    except Exception as e:
        logger.error(f"Failed to get city rooms: {e}")
        raise HTTPException(status_code=500, detail="Failed to get city rooms")


@router.post("/rooms", response_model=CityRoomRead)
async def create_city_room(payload: CityRoomCreate):
    """
    Створити нову City Room (автоматично створює Matrix room)
    """
    try:
        # TODO: витягнути user_id з JWT
        created_by = "u_system"  # Mock для MVP
        
        # Перевірити чи не існує вже
        existing = await repo_city.get_room_by_slug(payload.slug)
        if existing:
            raise HTTPException(status_code=409, detail="Room with this slug already exists")
        
        # Створити Matrix room
        matrix_room_id, matrix_room_alias = await create_matrix_room(
            slug=payload.slug,
            name=payload.name,
            visibility="public"
        )
        
        if not matrix_room_id:
            logger.warning(f"Failed to create Matrix room for {payload.slug}, proceeding without Matrix")
        
        room = await repo_city.create_room(
            slug=payload.slug,
            name=payload.name,
            description=payload.description,
            created_by=created_by,
            matrix_room_id=matrix_room_id,
            matrix_room_alias=matrix_room_alias
        )
        
        # Додати початкове повідомлення
        await repo_city.create_room_message(
            room_id=room["id"],
            body=f"Кімната '{payload.name}' створена! Ласкаво просимо! 🎉",
            author_agent_id="ag_system"
        )
        
        # Додати в feed
        await repo_city.create_feed_event(
            kind="system",
            room_id=room["id"],
            payload={"action": "room_created", "room_name": payload.name, "matrix_room_id": matrix_room_id}
        )
        
        return {**room, "members_online": 1, "last_event": None}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create city room: {e}")
        raise HTTPException(status_code=500, detail="Failed to create city room")


@router.get("/rooms/{room_id}", response_model=CityRoomDetail)
async def get_city_room(room_id: str):
    """
    Отримати деталі City Room з повідомленнями
    """
    try:
        room = await repo_city.get_room_by_id(room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        
        messages = await repo_city.get_room_messages(room_id, limit=50)
        
        # Додати username до повідомлень
        for msg in messages:
            if msg.get("author_user_id"):
                msg["username"] = f"User-{msg['author_user_id'][-4:]}"  # Mock
            elif msg.get("author_agent_id"):
                msg["username"] = "System Agent"
            else:
                msg["username"] = "Anonymous"
        
        online_users = await PresenceRedis.get_all_online()
        
        return {
            **room,
            "members_online": len(online_users),
            "last_event": None,
            "messages": messages,
            "online_members": online_users[:20]  # Перші 20
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get city room: {e}")
        raise HTTPException(status_code=500, detail="Failed to get city room")


@router.post("/rooms/{room_id}/messages", response_model=CityRoomMessageRead)
async def send_city_room_message(room_id: str, payload: CityRoomMessageCreate):
    """
    Надіслати повідомлення в City Room
    """
    try:
        # Перевірити чи кімната існує
        room = await repo_city.get_room_by_id(room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        
        # TODO: витягнути user_id з JWT
        author_user_id = "u_mock_user"  # Mock для MVP
        
        # Створити повідомлення
        message = await repo_city.create_room_message(
            room_id=room_id,
            body=payload.body,
            author_user_id=author_user_id
        )
        
        # Додати в feed
        await repo_city.create_feed_event(
            kind="room_message",
            room_id=room_id,
            user_id=author_user_id,
            payload={"body": payload.body[:100], "message_id": message["id"]}
        )
        
        # TODO: Broadcast WS event
        # await ws_manager.broadcast_to_room(room_id, {
        #     "event": "room.message",
        #     "message": message
        # })
        
        # Додати username
        message["username"] = f"User-{author_user_id[-4:]}"
        
        return message
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send room message: {e}")
        raise HTTPException(status_code=500, detail="Failed to send message")


@router.post("/rooms/{room_id}/join")
async def join_city_room(room_id: str):
    """
    Приєднатися до City Room (для tracking)
    """
    # TODO: витягнути user_id з JWT
    user_id = "u_mock_user"
    
    # Для MVP просто повертаємо success
    # У production можна зберігати active memberships в Redis
    
    logger.info(f"User {user_id} joined room {room_id}")
    return {"status": "joined", "room_id": room_id}


@router.post("/rooms/{room_id}/leave")
async def leave_city_room(room_id: str):
    """
    Покинути City Room
    """
    # TODO: витягнути user_id з JWT
    user_id = "u_mock_user"
    
    logger.info(f"User {user_id} left room {room_id}")
    return {"status": "left", "room_id": room_id}


# =============================================================================
# Matrix Backfill API (Internal)
# =============================================================================

@router.post("/matrix/backfill")
async def backfill_matrix_rooms():
    """
    Backfill Matrix rooms for existing City Rooms that don't have Matrix integration.
    This is an internal endpoint for admin use.
    """
    try:
        rooms_without_matrix = await repo_city.get_rooms_without_matrix()
        
        results = {
            "processed": 0,
            "created": 0,
            "found": 0,
            "failed": 0,
            "details": []
        }
        
        for room in rooms_without_matrix:
            results["processed"] += 1
            slug = room["slug"]
            name = room["name"]
            room_id = room["id"]
            
            # Спочатку спробувати знайти існуючу Matrix room
            alias = f"#city_{slug}:daarion.space"
            matrix_room_id, matrix_room_alias = await find_matrix_room_by_alias(alias)
            
            if matrix_room_id:
                # Знайдено існуючу
                await repo_city.update_room_matrix(room_id, matrix_room_id, matrix_room_alias)
                results["found"] += 1
                results["details"].append({
                    "room_id": room_id,
                    "slug": slug,
                    "status": "found",
                    "matrix_room_id": matrix_room_id
                })
            else:
                # Створити нову
                matrix_room_id, matrix_room_alias = await create_matrix_room(slug, name, "public")
                
                if matrix_room_id:
                    await repo_city.update_room_matrix(room_id, matrix_room_id, matrix_room_alias)
                    results["created"] += 1
                    results["details"].append({
                        "room_id": room_id,
                        "slug": slug,
                        "status": "created",
                        "matrix_room_id": matrix_room_id
                    })
                else:
                    results["failed"] += 1
                    results["details"].append({
                        "room_id": room_id,
                        "slug": slug,
                        "status": "failed",
                        "error": "Could not create Matrix room"
                    })
        
        logger.info(f"Matrix backfill completed: {results['processed']} processed, "
                   f"{results['created']} created, {results['found']} found, {results['failed']} failed")
        
        return results
    
    except Exception as e:
        logger.error(f"Matrix backfill failed: {e}")
        raise HTTPException(status_code=500, detail=f"Backfill failed: {str(e)}")


# =============================================================================
# Chat Bootstrap API (Matrix Integration)
# =============================================================================

async def validate_jwt_token(authorization: str) -> Optional[dict]:
    """Validate JWT token via auth-service introspect endpoint."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    token = authorization.replace("Bearer ", "")
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(
                f"{AUTH_SERVICE_URL}/api/auth/introspect",
                json={"token": token}
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("active"):
                    return {"user_id": data.get("sub"), "email": data.get("email"), "roles": data.get("roles", [])}
            return None
        except Exception as e:
            logger.error(f"JWT validation error: {e}")
            return None


async def ensure_architect_or_admin(authorization: Optional[str]) -> dict:
    """Переконатися, що користувач має роль architect/admin"""
    if not authorization:
        raise HTTPException(status_code=403, detail="Missing authorization token")
    
    user_info = await validate_jwt_token(authorization)
    if not user_info:
        raise HTTPException(status_code=403, detail="Invalid authorization token")
    
    roles = user_info.get("roles", [])
    if not any(role in ["admin", "architect"] for role in roles):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    return user_info


@router.get("/chat/bootstrap")
async def chat_bootstrap(
    room_slug: str = Query(..., description="City room slug"),
    authorization: Optional[str] = Header(None)
):
    """
    Bootstrap Matrix chat for a city room.
    
    Returns Matrix credentials and room info for the authenticated user.
    """
    # Validate JWT
    user_info = await validate_jwt_token(authorization)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid or missing authorization token")
    
    user_id = user_info.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token: missing user_id")
    
    # Get room by slug
    room = await repo_city.get_room_by_slug(room_slug)
    if not room:
        raise HTTPException(status_code=404, detail=f"Room '{room_slug}' not found")
    
    # Check if room has Matrix integration
    matrix_room_id = room.get("matrix_room_id")
    matrix_room_alias = room.get("matrix_room_alias")
    
    if not matrix_room_id:
        raise HTTPException(
            status_code=400, 
            detail="Room does not have Matrix integration. Run /city/matrix/backfill first."
        )
    
    # Get Matrix user token from matrix-gateway
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            token_resp = await client.post(
                f"{MATRIX_GATEWAY_URL}/internal/matrix/users/token",
                json={"user_id": user_id}
            )
            
            if token_resp.status_code != 200:
                error = token_resp.json()
                logger.error(f"Failed to get Matrix token: {error}")
                raise HTTPException(status_code=500, detail="Failed to get Matrix credentials")
            
            matrix_creds = token_resp.json()
            
        except httpx.RequestError as e:
            logger.error(f"Matrix gateway request error: {e}")
            raise HTTPException(status_code=503, detail="Matrix service unavailable")
    
    # Return bootstrap data
    return {
        "matrix_hs_url": f"https://app.daarion.space",  # Through nginx proxy
        "matrix_user_id": matrix_creds["matrix_user_id"],
        "matrix_access_token": matrix_creds["access_token"],
        "matrix_device_id": matrix_creds["device_id"],
        "matrix_room_id": matrix_room_id,
        "matrix_room_alias": matrix_room_alias,
        "room": {
            "id": room["id"],
            "slug": room["slug"],
            "name": room["name"],
            "description": room.get("description")
        }
    }


# =============================================================================
# City Feed API
# =============================================================================

@router.get("/feed", response_model=List[CityFeedEventRead])
async def get_city_feed(limit: int = 20, offset: int = 0):
    """
    Отримати City Feed (останні події)
    """
    try:
        events = await repo_city.get_feed_events(limit=limit, offset=offset)
        return events
    except Exception as e:
        logger.error(f"Failed to get city feed: {e}")
        raise HTTPException(status_code=500, detail="Failed to get city feed")


# =============================================================================
# City Map API (2D Map)
# =============================================================================

@router.get("/map", response_model=CityMapResponse)
async def get_city_map():
    """
    Отримати дані для 2D мапи міста.
    
    Повертає:
    - config: розміри сітки та налаштування
    - rooms: список кімнат з координатами
    """
    try:
        # Отримати конфігурацію
        config_data = await repo_city.get_map_config()
        config = CityMapConfig(
            grid_width=config_data.get("grid_width", 6),
            grid_height=config_data.get("grid_height", 3),
            cell_size=config_data.get("cell_size", 100),
            background_url=config_data.get("background_url")
        )
        
        # Отримати кімнати з координатами
        rooms_data = await repo_city.get_rooms_for_map()
        rooms = []
        
        for room in rooms_data:
            rooms.append(CityMapRoom(
                id=room["id"],
                slug=room["slug"],
                name=room["name"],
                description=room.get("description"),
                room_type=room.get("room_type", "public"),
                zone=room.get("zone", "central"),
                icon=room.get("icon"),
                color=room.get("color"),
                x=room.get("map_x", 0),
                y=room.get("map_y", 0),
                w=room.get("map_w", 1),
                h=room.get("map_h", 1),
                matrix_room_id=room.get("matrix_room_id")
            ))
        
        return CityMapResponse(config=config, rooms=rooms)
    
    except Exception as e:
        logger.error(f"Failed to get city map: {e}")
        raise HTTPException(status_code=500, detail="Failed to get city map")


# =============================================================================
# Agents API
# =============================================================================

@router.put("/agents/{agent_id}/public-profile")
async def update_agent_public_profile(agent_id: str, request: Request):
    """
    Оновити публічний профіль агента.
    Тільки для Architect/Admin.
    """
    try:
        # Check agent exists
        agent = await repo_city.get_agent_by_id(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")
        
        # Parse body
        body = await request.json()
        
        is_public = body.get("is_public", False)
        public_slug = body.get("public_slug")
        public_title = body.get("public_title")
        public_tagline = body.get("public_tagline")
        public_skills = body.get("public_skills", [])
        public_district = body.get("public_district")
        public_primary_room_slug = body.get("public_primary_room_slug")
        
        # Validate: if is_public, slug is required
        if is_public and not public_slug:
            raise HTTPException(status_code=400, detail="public_slug is required when is_public is true")
        
        # Validate slug format
        if public_slug:
            import re
            if not re.match(r'^[a-z0-9_-]+$', public_slug.lower()):
                raise HTTPException(status_code=400, detail="public_slug must contain only lowercase letters, numbers, underscores, and hyphens")
        
        # Validate skills (max 10, max 64 chars each)
        if public_skills:
            public_skills = [s[:64] for s in public_skills[:10]]
        
        # Update
        result = await repo_city.update_agent_public_profile(
            agent_id=agent_id,
            is_public=is_public,
            public_slug=public_slug,
            public_title=public_title,
            public_tagline=public_tagline,
            public_skills=public_skills,
            public_district=public_district,
            public_primary_room_slug=public_primary_room_slug
        )
        
        logger.info(f"Updated public profile for agent {agent_id}: is_public={is_public}, slug={public_slug}")
        
        return result
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update agent public profile: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to update agent public profile")


@router.get("/citizens")
async def get_public_citizens_legacy(limit: int = 50, offset: int = 0):
    """
    Отримати список публічних громадян DAARION City.
    """
    try:
        citizens, total = await repo_city.get_public_citizens(limit=limit, offset=offset)
        return {"citizens": citizens, "total": total}
    except Exception as e:
        logger.error(f"Failed to get public citizens: {e}")
        raise HTTPException(status_code=500, detail="Failed to get public citizens")


@router.get("/citizens/{slug}")
async def get_citizen_by_slug(slug: str, request: Request):
    """
    Отримати публічного громадянина за slug.
    Для адмінів/архітекторів додається admin_panel_url.
    """
    try:
        include_admin_url = True  # legacy endpoint доступний тільки з адмінської панелі
        
        citizen = await repo_city.get_public_citizen_by_slug(slug)
        if not citizen:
            raise HTTPException(status_code=404, detail=f"Citizen not found: {slug}")
        
        if not include_admin_url:
            citizen["admin_panel_url"] = None
        
        return citizen
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get citizen: {e}")
        raise HTTPException(status_code=500, detail="Failed to get citizen")


@router.put("/agents/{agent_id}/prompts/{kind}")
async def update_agent_prompt(agent_id: str, kind: str, request: Request):
    """
    Оновити системний промт агента.
    Тільки для Architect/Admin.
    kind: core | safety | governance | tools
    """
    try:
        # Validate kind
        valid_kinds = ["core", "safety", "governance", "tools"]
        if kind not in valid_kinds:
            raise HTTPException(status_code=400, detail=f"Invalid kind. Must be one of: {valid_kinds}")
        
        # Check agent exists
        agent = await repo_city.get_agent_by_id(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")
        
        # Parse body
        body = await request.json()
        content = body.get("content")
        note = body.get("note")
        
        if not content or not content.strip():
            raise HTTPException(status_code=400, detail="Content is required")
        
        # TODO: Get user from JWT and check permissions
        # For now, use a placeholder
        created_by = "ARCHITECT"  # Will be replaced with actual user from auth
        
        # Update prompt
        result = await repo_city.update_agent_prompt(
            agent_id=agent_id,
            kind=kind,
            content=content.strip(),
            created_by=created_by,
            note=note
        )
        
        logger.info(f"Updated {kind} prompt for agent {agent_id} to version {result['version']}")
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update agent prompt: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to update agent prompt")


@router.get("/agents/{agent_id}/prompts/{kind}/history")
async def get_agent_prompt_history(agent_id: str, kind: str, limit: int = 10):
    """
    Отримати історію версій промту агента.
    """
    try:
        valid_kinds = ["core", "safety", "governance", "tools"]
        if kind not in valid_kinds:
            raise HTTPException(status_code=400, detail=f"Invalid kind. Must be one of: {valid_kinds}")
        
        history = await repo_city.get_agent_prompt_history(agent_id, kind, limit)
        return {"agent_id": agent_id, "kind": kind, "history": history}
    
    except Exception as e:
        logger.error(f"Failed to get prompt history: {e}")
        raise HTTPException(status_code=500, detail="Failed to get prompt history")


@router.get("/agents/{agent_id}/dashboard")
async def get_agent_dashboard(agent_id: str):
    """
    Отримати повний dashboard агента (DAIS Profile + Node + Metrics)
    """
    try:
        # Get agent profile
        agent = await repo_city.get_agent_by_id(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")
        
        # Get agent's rooms
        rooms = await repo_city.get_agent_rooms(agent_id)
        
        # Build DAIS profile
        profile = {
            "agent_id": agent["id"],
            "display_name": agent["display_name"],
            "kind": agent.get("kind", "assistant"),
            "avatar_url": agent.get("avatar_url"),
            "status": agent.get("status", "offline"),
            "node_id": agent.get("node_id"),
            "is_public": agent.get("is_public", False),
            "is_orchestrator": agent.get("is_orchestrator", False),
            "primary_microdao_id": agent.get("primary_microdao_id"),
            "primary_microdao_name": agent.get("primary_microdao_name"),
            "primary_microdao_slug": agent.get("primary_microdao_slug"),
            "roles": [agent.get("role")] if agent.get("role") else [],
            "tags": [],
            "dais": {
                "core": {
                    "title": agent.get("display_name"),
                    "bio": f"{agent.get('kind', 'assistant').title()} agent in DAARION",
                    "version": "1.0.0"
                },
                "vis": {
                    "avatar_url": agent.get("avatar_url"),
                    "color_primary": agent.get("color", "#22D3EE")
                },
                "cog": {
                    "base_model": agent.get("model", "default"),
                    "provider": "ollama",
                    "node_id": agent.get("node_id")
                },
                "act": {
                    "tools": agent.get("capabilities", [])
                }
            },
            "city_presence": {
                "primary_room_slug": agent.get("primary_room_slug"),
                "district": agent.get("home_district"),
                "rooms": rooms
            }
        }
        
        # Get node info (simplified)
        node_info = None
        if agent.get("node_id"):
            node_info = {
                "node_id": agent["node_id"],
                "status": "online"  # Would fetch from Node Registry in production
            }
        
        # Get system prompts
        system_prompts = await repo_city.get_agent_prompts(agent_id)
        
        # Get public profile
        public_profile = await repo_city.get_agent_public_profile(agent_id)
        
        # MicroDAO memberships
        memberships_raw = await repo_city.get_agent_microdao_memberships(agent_id)
        memberships = [
            AgentMicrodaoMembership(
                microdao_id=item["microdao_id"],
                microdao_slug=item.get("microdao_slug"),
                microdao_name=item.get("microdao_name"),
                role=item.get("role"),
                is_core=item.get("is_core", False)
            )
            for item in memberships_raw
        ]
        
        # Build dashboard response
        dashboard = {
            "profile": profile,
            "node": node_info,
            "runtime": {
                "health": "healthy" if agent.get("status") == "online" else "unknown",
                "last_success_at": None,
                "last_error_at": None
            },
            "metrics": {
                "tasks_1h": 0,
                "tasks_24h": 0,
                "errors_24h": 0,
                "avg_latency_ms_1h": 0,
                "success_rate_24h": 1.0
            },
            "recent_activity": [],
            "system_prompts": system_prompts,
            "public_profile": public_profile,
            "microdao_memberships": memberships
        }
        
        return dashboard
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get agent dashboard: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to get agent dashboard")


@router.get("/agents", response_model=List[AgentRead])
async def get_agents():
    """
    Отримати список всіх агентів
    """
    try:
        agents = await repo_city.get_all_agents()
        result = []
        
        for agent in agents:
            capabilities = agent.get("capabilities", [])
            if isinstance(capabilities, str):
                import json
                capabilities = json.loads(capabilities)
            
            result.append(AgentRead(
                id=agent["id"],
                display_name=agent["display_name"],
                kind=agent.get("kind", "assistant"),
                avatar_url=agent.get("avatar_url"),
                color=agent.get("color", "cyan"),
                status=agent.get("status", "offline"),
                current_room_id=agent.get("current_room_id"),
                capabilities=capabilities
            ))
        
        return result
    
    except Exception as e:
        logger.error(f"Failed to get agents: {e}")
        raise HTTPException(status_code=500, detail="Failed to get agents")


@router.get("/agents/online", response_model=List[AgentPresence])
async def get_online_agents():
    """
    Отримати список онлайн агентів (для presence)
    """
    try:
        agents = await repo_city.get_online_agents()
        result = []
        
        for agent in agents:
            result.append(AgentPresence(
                agent_id=agent["id"],
                display_name=agent["display_name"],
                kind=agent.get("kind", "assistant"),
                status=agent.get("status", "offline"),
                room_id=agent.get("current_room_id"),
                color=agent.get("color", "cyan")
            ))
        
        return result
    
    except Exception as e:
        logger.error(f"Failed to get online agents: {e}")
        raise HTTPException(status_code=500, detail="Failed to get online agents")


@router.get("/rooms/{room_id}/agents", response_model=List[AgentPresence])
async def get_room_agents(room_id: str):
    """
    Отримати агентів у конкретній кімнаті
    """
    try:
        agents = await repo_city.get_agents_by_room(room_id)
        result = []
        
        for agent in agents:
            result.append(AgentPresence(
                agent_id=agent["id"],
                display_name=agent["display_name"],
                kind=agent.get("kind", "assistant"),
                status=agent.get("status", "offline"),
                room_id=room_id,
                color=agent.get("color", "cyan"),
                node_id=agent.get("node_id"),
                model=agent.get("model"),
                role=agent.get("role")
            ))
        
        return result
    
    except Exception as e:
        logger.error(f"Failed to get room agents: {e}")
        raise HTTPException(status_code=500, detail="Failed to get room agents")


@router.get("/agents/presence-snapshot")
async def get_agents_presence_snapshot():
    """
    Отримати snapshot всіх агентів для presence (50 агентів по 10 districts)
    """
    try:
        snapshot = await repo_city.get_agents_presence_snapshot()
        return snapshot
    except Exception as e:
        logger.error(f"Failed to get agents presence snapshot: {e}")
        raise HTTPException(status_code=500, detail="Failed to get agents presence snapshot")


# =============================================================================
# MicroDAO API
# =============================================================================

@router.get("/microdao", response_model=List[MicrodaoSummary])
async def get_microdaos(
    district: Optional[str] = Query(None, description="Filter by district"),
    is_public: Optional[bool] = Query(None, description="Filter by public status"),
    is_platform: Optional[bool] = Query(None, description="Filter by platform status"),
    q: Optional[str] = Query(None, description="Search by name/description"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0)
):
    """
    Отримати список MicroDAOs.
    
    - **district**: фільтр по дістрікту (Core, Energy, Green, Labs, etc.)
    - **is_public**: фільтр по публічності
    - **is_platform**: фільтр по типу (платформа/дістрікт)
    - **q**: пошук по назві або опису
    """
    try:
        daos = await repo_city.list_microdao_summaries(
            district=district,
            is_public=is_public,
            is_platform=is_platform,
            q=q,
            limit=limit,
            offset=offset
        )
        
        result = []
        for dao in daos:
            result.append(MicrodaoSummary(
                id=dao["id"],
                slug=dao["slug"],
                name=dao["name"],
                description=dao.get("description"),
                district=dao.get("district"),
                is_public=dao.get("is_public", True),
                is_platform=dao.get("is_platform", False),
                is_active=dao.get("is_active", True),
                orchestrator_agent_id=dao.get("orchestrator_agent_id"),
                orchestrator_agent_name=dao.get("orchestrator_agent_name"),
                parent_microdao_id=dao.get("parent_microdao_id"),
                parent_microdao_slug=dao.get("parent_microdao_slug"),
                logo_url=dao.get("logo_url"),
                member_count=dao.get("member_count", 0),
                agents_count=dao.get("agents_count", 0),
                room_count=dao.get("room_count", 0),
                rooms_count=dao.get("rooms_count", 0),
                channels_count=dao.get("channels_count", 0)
            ))
        
        return result
    
    except Exception as e:
        logger.error(f"Failed to get microdaos: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to get microdaos")


@router.get("/microdao/{slug}", response_model=MicrodaoDetail)
async def get_microdao_by_slug(slug: str):
    """
    Отримати детальну інформацію про MicroDAO.
    
    Включає:
    - Базову інформацію про DAO
    - Список агентів (з ролями)
    - Список каналів (Telegram, Matrix, City rooms, CrewAI)
    """
    try:
        dao = await repo_city.get_microdao_by_slug(slug)
        if not dao:
            raise HTTPException(status_code=404, detail=f"MicroDAO not found: {slug}")
        
        # Build agents list
        agents = []
        for agent in dao.get("agents", []):
            agents.append(MicrodaoAgentView(
                agent_id=agent["agent_id"],
                display_name=agent.get("display_name", agent["agent_id"]),
                role=agent.get("role"),
                is_core=agent.get("is_core", False)
            ))
        
        # Build channels list
        channels = []
        for channel in dao.get("channels", []):
            channels.append(MicrodaoChannelView(
                kind=channel["kind"],
                ref_id=channel["ref_id"],
                display_name=channel.get("display_name"),
                is_primary=channel.get("is_primary", False)
            ))
        
        public_citizens = []
        for citizen in dao.get("public_citizens", []):
            public_citizens.append(MicrodaoCitizenView(
                slug=citizen["slug"],
                display_name=citizen["display_name"],
                public_title=citizen.get("public_title"),
                public_tagline=citizen.get("public_tagline"),
                avatar_url=citizen.get("avatar_url"),
                district=citizen.get("public_district"),
                primary_room_slug=citizen.get("public_primary_room_slug")
            ))
        
        # Build child microDAOs list
        child_microdaos = []
        for child in dao.get("child_microdaos", []):
            child_microdaos.append(MicrodaoSummary(
                id=child["id"],
                slug=child["slug"],
                name=child["name"],
                is_public=child.get("is_public", True),
                is_platform=child.get("is_platform", False)
            ))
        
        return MicrodaoDetail(
            id=dao["id"],
            slug=dao["slug"],
            name=dao["name"],
            description=dao.get("description"),
            district=dao.get("district"),
            is_public=dao.get("is_public", True),
            is_platform=dao.get("is_platform", False),
            is_active=dao.get("is_active", True),
            orchestrator_agent_id=dao.get("orchestrator_agent_id"),
            orchestrator_display_name=dao.get("orchestrator_display_name"),
            parent_microdao_id=dao.get("parent_microdao_id"),
            parent_microdao_slug=dao.get("parent_microdao_slug"),
            child_microdaos=child_microdaos,
            logo_url=dao.get("logo_url"),
            agents=agents,
            channels=channels,
            public_citizens=public_citizens
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get microdao {slug}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to get microdao")

