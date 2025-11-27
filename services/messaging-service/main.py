"""
DAARION Messaging Service (Matrix-aware)
FastAPI backend for Messenger module
Port: 7004
"""
import os
import asyncio
import json
from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import httpx
import asyncpg

# PEP Integration (Phase 4)
from pep_middleware import require_actor, require_channel_permission, require_microdao_permission

# ============================================================================
# Configuration
# ============================================================================

MATRIX_GATEWAY_URL = os.getenv("MATRIX_GATEWAY_URL", "http://matrix-gateway:7003")
MATRIX_GATEWAY_SECRET = os.getenv("MATRIX_GATEWAY_SECRET", "dev-secret-token")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/daarion")
NATS_URL = os.getenv("NATS_URL", "nats://localhost:4222")

# ============================================================================
# App Setup
# ============================================================================

app = FastAPI(
    title="DAARION Messaging Service",
    version="1.0.0",
    description="Matrix-aware messaging service for DAARION",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Database Connection Pool
# ============================================================================

db_pool: Optional[asyncpg.Pool] = None
nc = None  # NATS connection
nats_available = False

@app.on_event("startup")
async def startup():
    global db_pool, nc, nats_available
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    print("✅ Database pool created")
    
    # Connect to NATS
    try:
        import nats
        nc = await nats.connect(NATS_URL)
        nats_available = True
        print(f"✅ Connected to NATS at {NATS_URL}")
    except Exception as e:
        print(f"⚠️  NATS not available: {e}")
        print("⚠️  Continuing without NATS (events won't be published)")
        nats_available = False

@app.on_event("shutdown")
async def shutdown():
    global nc
    if db_pool:
        await db_pool.close()
        print("✅ Database pool closed")
    if nc:
        await nc.close()
        print("✅ NATS connection closed")

async def get_db():
    async with db_pool.acquire() as conn:
        yield conn

# ============================================================================
# NATS Publishing Helper
# ============================================================================

async def publish_nats_event(subject: str, data: dict):
    """Publish event to NATS"""
    if nc and nats_available:
        try:
            await nc.publish(subject, json.dumps(data, default=str).encode())
            print(f"✅ Published to NATS: {subject}")
        except Exception as e:
            print(f"❌ Error publishing to NATS: {e}")
    else:
        print(f"⚠️  NATS not available, event not published: {subject}")

# ============================================================================
# Models
# ============================================================================

class ChannelCreate(BaseModel):
    slug: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    microdao_id: str = Field(..., regex=r"^microdao:[a-z0-9-]+$")
    visibility: str = Field("microdao", regex="^(public|private|microdao)$")
    is_encrypted: bool = False

class Channel(BaseModel):
    id: UUID
    slug: str
    name: str
    description: Optional[str]
    microdao_id: str
    matrix_room_id: str
    visibility: str
    is_direct: bool
    is_encrypted: bool
    created_by: str
    created_at: datetime
    updated_at: datetime

class MessageSend(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    msgtype: str = Field("m.text", regex="^m\\.(text|notice|image|file|audio|video)$")
    formatted_body: Optional[str] = None
    reply_to: Optional[UUID] = None  # thread/reply support

class Message(BaseModel):
    id: UUID
    channel_id: UUID
    matrix_event_id: str
    sender_id: str
    sender_type: str
    content_preview: str
    content_type: str
    thread_id: Optional[UUID]
    created_at: datetime

class MemberInvite(BaseModel):
    member_id: str = Field(..., regex=r"^(user|agent):[a-z0-9-]+$")
    role: str = Field("member", regex="^(owner|admin|member|guest|agent)$")
    can_read: bool = True
    can_write: bool = True
    can_invite: bool = False
    can_create_tasks: bool = False

class ChannelMember(BaseModel):
    id: UUID
    channel_id: UUID
    member_id: str
    member_type: str
    role: str
    can_read: bool
    can_write: bool
    joined_at: datetime

# ============================================================================
# Matrix Gateway Client
# ============================================================================

class MatrixGatewayClient:
    def __init__(self, base_url: str, secret: str):
        self.base_url = base_url
        self.headers = {
            "X-Internal-Service-Token": secret,
            "Content-Type": "application/json"
        }
    
    async def create_room(self, name: str, topic: str, visibility: str, alias: str):
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/internal/matrix/create-room",
                headers=self.headers,
                json={
                    "name": name,
                    "topic": topic,
                    "visibility": visibility,
                    "room_alias_name": alias,
                    "preset": "public_chat" if visibility == "public" else "private_chat"
                },
                timeout=10.0
            )
            resp.raise_for_status()
            return resp.json()
    
    async def send_message(self, room_id: str, sender: str, sender_matrix_id: str, body: str, msgtype: str = "m.text", formatted_body: Optional[str] = None, reply_to: Optional[str] = None):
        payload = {
            "room_id": room_id,
            "sender": sender,
            "sender_matrix_id": sender_matrix_id,
            "msgtype": msgtype,
            "body": body
        }
        if formatted_body:
            payload["format"] = "org.matrix.custom.html"
            payload["formatted_body"] = formatted_body
        if reply_to:
            payload["relates_to"] = {
                "m.in_reply_to": {
                    "event_id": reply_to
                }
            }
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/internal/matrix/send",
                headers=self.headers,
                json=payload,
                timeout=10.0
            )
            resp.raise_for_status()
            return resp.json()
    
    async def invite_user(self, room_id: str, user_id: str, inviter: str, inviter_matrix_id: str):
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/internal/matrix/invite",
                headers=self.headers,
                json={
                    "room_id": room_id,
                    "user_id": user_id,
                    "inviter": inviter,
                    "inviter_matrix_id": inviter_matrix_id
                },
                timeout=10.0
            )
            resp.raise_for_status()
            return resp.json()

matrix_client = MatrixGatewayClient(MATRIX_GATEWAY_URL, MATRIX_GATEWAY_SECRET)

# ============================================================================
# API Endpoints: Channels
# ============================================================================

@app.get("/api/messaging/channels", response_model=List[Channel])
async def list_channels(
    microdao_id: Optional[str] = None,
    conn: asyncpg.Connection = Depends(get_db)
):
    """List all channels (optionally filtered by microDAO)"""
    if microdao_id:
        rows = await conn.fetch(
            """
            SELECT * FROM channels
            WHERE microdao_id = $1 AND archived_at IS NULL
            ORDER BY created_at DESC
            """,
            microdao_id
        )
    else:
        rows = await conn.fetch(
            """
            SELECT * FROM channels
            WHERE archived_at IS NULL
            ORDER BY created_at DESC
            """
        )
    return [dict(row) for row in rows]

@app.post("/api/messaging/channels", response_model=Channel, status_code=201)
async def create_channel(
    data: ChannelCreate,
    actor = Depends(require_actor),
    conn: asyncpg.Connection = Depends(get_db)
):
    """Create a new channel (creates Matrix room)"""
    
    # PEP: Check permission to create channel in microDAO
    await require_microdao_permission(
        microdao_id=data.microdao_id,
        action="manage",
        actor=actor
    )
    
    # Check if slug already exists in this microDAO
    exists = await conn.fetchval(
        "SELECT 1 FROM channels WHERE slug = $1 AND microdao_id = $2",
        data.slug, data.microdao_id
    )
    if exists:
        raise HTTPException(400, f"Channel slug '{data.slug}' already exists in {data.microdao_id}")
    
    # Create Matrix room
    try:
        matrix_resp = await matrix_client.create_room(
            name=data.name,
            topic=data.description or "",
            visibility=data.visibility,
            alias=f"{data.slug}-{data.microdao_id.split(':')[1]}"
        )
        matrix_room_id = matrix_resp["room_id"]
    except Exception as e:
        raise HTTPException(500, f"Failed to create Matrix room: {str(e)}")
    
    # Insert channel record
    channel_id = uuid4()
    row = await conn.fetchrow(
        """
        INSERT INTO channels (id, slug, name, description, microdao_id, matrix_room_id, visibility, is_encrypted, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        """,
        channel_id, data.slug, data.name, data.description, data.microdao_id,
        matrix_room_id, data.visibility, data.is_encrypted, current_user
    )
    
    # TODO: Publish NATS event messaging.channel.created
    
    return dict(row)

@app.get("/api/messaging/channels/{channel_id}", response_model=Channel)
async def get_channel(
    channel_id: UUID,
    conn: asyncpg.Connection = Depends(get_db)
):
    """Get channel by ID"""
    row = await conn.fetchrow("SELECT * FROM channels WHERE id = $1", channel_id)
    if not row:
        raise HTTPException(404, "Channel not found")
    return dict(row)

# ============================================================================
# API Endpoints: Messages
# ============================================================================

@app.get("/api/messaging/channels/{channel_id}/messages", response_model=List[Message])
async def list_messages(
    channel_id: UUID,
    limit: int = 50,
    before: Optional[datetime] = None,
    conn: asyncpg.Connection = Depends(get_db)
):
    """List messages in a channel (paginated)"""
    if before:
        rows = await conn.fetch(
            """
            SELECT * FROM messages
            WHERE channel_id = $1 AND created_at < $2 AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT $3
            """,
            channel_id, before, limit
        )
    else:
        rows = await conn.fetch(
            """
            SELECT * FROM messages
            WHERE channel_id = $1 AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT $2
            """,
            channel_id, limit
        )
    return [dict(row) for row in rows]

@app.post("/api/messaging/channels/{channel_id}/messages", response_model=Message, status_code=201)
async def send_message(
    channel_id: UUID,
    data: MessageSend,
    actor = Depends(require_actor),
    conn: asyncpg.Connection = Depends(get_db)
):
    """Send a message to a channel"""
    
    # Get channel
    channel = await conn.fetchrow("SELECT * FROM channels WHERE id = $1", channel_id)
    if not channel:
        raise HTTPException(404, "Channel not found")
    
    # PEP: Check permission to send message
    await require_channel_permission(
        channel_id=str(channel_id),
        action="send_message",
        actor=actor,
        context={"message_length": len(data.text)}
    )
    
    current_user = actor["actor_id"]
    
    # Determine Matrix user ID (simplified, should map from DAARION ID)
    sender_matrix_id = f"@{current_user.replace(':', '-')}:daarion.city"
    
    # Get reply-to Matrix event ID if threading
    reply_to_matrix_id = None
    if data.reply_to:
        reply_msg = await conn.fetchval(
            "SELECT matrix_event_id FROM messages WHERE id = $1",
            data.reply_to
        )
        reply_to_matrix_id = reply_msg
    
    # Send to Matrix
    try:
        matrix_resp = await matrix_client.send_message(
            room_id=channel["matrix_room_id"],
            sender=current_user,
            sender_matrix_id=sender_matrix_id,
            body=data.text,
            msgtype=data.msgtype,
            formatted_body=data.formatted_body,
            reply_to=reply_to_matrix_id
        )
        matrix_event_id = matrix_resp["event_id"]
    except Exception as e:
        raise HTTPException(500, f"Failed to send message to Matrix: {str(e)}")
    
    # Index message
    message_id = uuid4()
    sender_type = "agent" if current_user.startswith("agent:") else "human"
    content_preview = data.text[:500]  # truncate for index
    
    row = await conn.fetchrow(
        """
        INSERT INTO messages (id, channel_id, matrix_event_id, matrix_type, sender_id, sender_type, sender_matrix_id, content_preview, content_type, thread_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
        """,
        message_id, channel_id, matrix_event_id, "m.room.message",
        current_user, sender_type, sender_matrix_id, content_preview, "text", data.reply_to
    )
    
    # Publish NATS event messaging.message.created
    await publish_nats_event("messaging.message.created", {
        "channel_id": str(channel_id),
        "message_id": str(message_id),
        "matrix_event_id": matrix_event_id,
        "sender_id": current_user,
        "sender_type": sender_type,
        "microdao_id": channel["microdao_id"],
        "created_at": row["created_at"].isoformat()
    })
    
    return dict(row)

# ============================================================================
# API Endpoints: Members
# ============================================================================

@app.get("/api/messaging/channels/{channel_id}/members", response_model=List[ChannelMember])
async def list_members(
    channel_id: UUID,
    conn: asyncpg.Connection = Depends(get_db)
):
    """List channel members"""
    rows = await conn.fetch(
        """
        SELECT * FROM channel_members
        WHERE channel_id = $1 AND left_at IS NULL
        ORDER BY joined_at ASC
        """,
        channel_id
    )
    return [dict(row) for row in rows]

@app.post("/api/messaging/channels/{channel_id}/members", response_model=ChannelMember, status_code=201)
async def invite_member(
    channel_id: UUID,
    data: MemberInvite,
    current_user: str = Header("user:admin", alias="X-User-Id"),
    conn: asyncpg.Connection = Depends(get_db)
):
    """Invite a member (user or agent) to a channel"""
    
    # Get channel
    channel = await conn.fetchrow("SELECT * FROM channels WHERE id = $1", channel_id)
    if not channel:
        raise HTTPException(404, "Channel not found")
    
    # TODO: Check permissions (can_invite)
    
    # Check if already member
    exists = await conn.fetchval(
        "SELECT 1 FROM channel_members WHERE channel_id = $1 AND member_id = $2 AND left_at IS NULL",
        channel_id, data.member_id
    )
    if exists:
        raise HTTPException(400, "Member already in channel")
    
    # Determine Matrix user ID
    member_matrix_id = f"@{data.member_id.replace(':', '-')}:daarion.city"
    inviter_matrix_id = f"@{current_user.replace(':', '-')}:daarion.city"
    
    # Invite to Matrix room
    try:
        await matrix_client.invite_user(
            room_id=channel["matrix_room_id"],
            user_id=member_matrix_id,
            inviter=current_user,
            inviter_matrix_id=inviter_matrix_id
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to invite to Matrix room: {str(e)}")
    
    # Add member record
    member_id = uuid4()
    member_type = "agent" if data.member_id.startswith("agent:") else "human"
    matrix_power_level = 50 if data.role in ["admin", "owner"] else 0
    
    row = await conn.fetchrow(
        """
        INSERT INTO channel_members (id, channel_id, member_id, member_type, matrix_user_id, role, can_read, can_write, can_invite, can_create_tasks, matrix_power_level, invited_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
        """,
        member_id, channel_id, data.member_id, member_type, member_matrix_id,
        data.role, data.can_read, data.can_write, data.can_invite, data.can_create_tasks,
        matrix_power_level, current_user
    )
    
    # TODO: Publish NATS event messaging.member.invited
    
    return dict(row)

# ============================================================================
# WebSocket: Real-time messages
# ============================================================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[UUID, list[WebSocket]] = {}
    
    async def connect(self, channel_id: UUID, websocket: WebSocket):
        await websocket.accept()
        if channel_id not in self.active_connections:
            self.active_connections[channel_id] = []
        self.active_connections[channel_id].append(websocket)
    
    def disconnect(self, channel_id: UUID, websocket: WebSocket):
        if channel_id in self.active_connections:
            self.active_connections[channel_id].remove(websocket)
    
    async def broadcast(self, channel_id: UUID, message: dict):
        if channel_id in self.active_connections:
            for connection in self.active_connections[channel_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass

manager = ConnectionManager()

@app.websocket("/ws/messaging/{channel_id}")
async def websocket_messages(websocket: WebSocket, channel_id: UUID):
    """WebSocket endpoint for real-time messages"""
    await manager.connect(channel_id, websocket)
    try:
        while True:
            # Keep connection alive (ping/pong)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(channel_id, websocket)

# ============================================================================
# Internal API: Agent posting
# ============================================================================

@app.post("/internal/agents/{agent_id}/post-to-channel")
async def agent_post_to_channel(
    agent_id: str,
    channel_id: UUID,
    text: str,
    conn: asyncpg.Connection = Depends(get_db)
):
    """Internal endpoint for agents to post to channels"""
    
    # Get channel
    channel = await conn.fetchrow("SELECT * FROM channels WHERE id = $1", channel_id)
    if not channel:
        raise HTTPException(404, "Channel not found")
    
    # Check if agent is member
    is_member = await conn.fetchval(
        "SELECT 1 FROM channel_members WHERE channel_id = $1 AND member_id = $2 AND left_at IS NULL",
        channel_id, agent_id
    )
    if not is_member:
        raise HTTPException(403, "Agent is not a member of this channel")
    
    # Send message (reuse existing logic)
    agent_matrix_id = f"@{agent_id.replace(':', '-')}:daarion.city"
    
    try:
        matrix_resp = await matrix_client.send_message(
            room_id=channel["matrix_room_id"],
            sender=agent_id,
            sender_matrix_id=agent_matrix_id,
            body=text,
            msgtype="m.notice"  # agents send as notices
        )
        matrix_event_id = matrix_resp["event_id"]
    except Exception as e:
        raise HTTPException(500, f"Failed to send agent message: {str(e)}")
    
    # Index message
    message_id = uuid4()
    content_preview = text[:500]
    
    row = await conn.fetchrow(
        """
        INSERT INTO messages (id, channel_id, matrix_event_id, matrix_type, sender_id, sender_type, sender_matrix_id, content_preview, content_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        """,
        message_id, channel_id, matrix_event_id, "m.room.message",
        agent_id, "agent", agent_matrix_id, content_preview, "text"
    )
    
    # Broadcast to WebSocket clients
    await manager.broadcast(channel_id, {
        "type": "message.created",
        "message": dict(row)
    })
    
    return {"status": "posted", "message_id": str(message_id)}

# ============================================================================
# Internal Endpoints: Agent Filter Context
# ============================================================================

@app.get("/internal/messaging/channels/{channel_id}/context")
async def get_channel_context(
    channel_id: UUID,
    conn: asyncpg.Connection = Depends(get_db)
):
    """
    Get channel context for agent-filter
    
    Returns channel metadata for filtering decisions
    """
    channel = await conn.fetchrow("SELECT * FROM channels WHERE id = $1", channel_id)
    if not channel:
        raise HTTPException(404, "Channel not found")
    
    # TODO: Load allowed_agents from channel_members or config
    # For now, return default Sofia agent
    return {
        "microdao_id": channel["microdao_id"],
        "visibility": channel["visibility"],
        "allowed_agents": ["agent:sofia"],
        "disabled_agents": []
    }

# ============================================================================
# Health Check
# ============================================================================

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "messaging-service",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7004)

