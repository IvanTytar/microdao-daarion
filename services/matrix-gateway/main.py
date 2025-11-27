"""
Matrix Gateway Service
Provides internal API for Matrix operations (room creation, lookup, etc.)
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import httpx
import hashlib
import hmac
import logging

from config import get_settings

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title="DAARION Matrix Gateway",
    description="Internal API for Matrix operations",
    version=settings.service_version
)

# CORS (internal service, but add for flexibility)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Admin access token (will be set on first request)
_admin_token: Optional[str] = None


# Models
class CreateRoomRequest(BaseModel):
    slug: str
    name: str
    visibility: str = "public"
    topic: Optional[str] = None


class CreateRoomResponse(BaseModel):
    matrix_room_id: str
    matrix_room_alias: str


class FindRoomResponse(BaseModel):
    matrix_room_id: str
    matrix_room_alias: str


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    synapse: str
    server_name: str


class UserTokenRequest(BaseModel):
    user_id: str  # DAARION user_id (UUID)


class UserTokenResponse(BaseModel):
    matrix_user_id: str
    access_token: str
    device_id: str
    home_server: str


class SetPresenceRequest(BaseModel):
    matrix_user_id: str  # "@user:daarion.space"
    access_token: str    # User's Matrix access token
    status: str = "online"  # "online" | "unavailable" | "offline"
    status_msg: Optional[str] = None


class SetPresenceResponse(BaseModel):
    ok: bool
    matrix_user_id: str
    status: str


async def get_admin_token() -> str:
    """Get or create admin access token for Matrix operations."""
    global _admin_token
    
    if _admin_token and settings.synapse_admin_token:
        return settings.synapse_admin_token
    
    if _admin_token:
        return _admin_token
    
    # Try to use provided token
    if settings.synapse_admin_token:
        _admin_token = settings.synapse_admin_token
        return _admin_token
    
    # Create admin user and get token
    try:
        async with httpx.AsyncClient() as client:
            # Get nonce
            nonce_resp = await client.get(
                f"{settings.synapse_url}/_synapse/admin/v1/register"
            )
            nonce_resp.raise_for_status()
            nonce = nonce_resp.json()["nonce"]
            
            # Generate MAC
            mac = hmac.new(
                key=settings.synapse_registration_secret.encode('utf-8'),
                digestmod=hashlib.sha1
            )
            mac.update(nonce.encode('utf-8'))
            mac.update(b"\x00")
            mac.update(b"daarion_admin")
            mac.update(b"\x00")
            mac.update(b"admin_password_2024")
            mac.update(b"\x00")
            mac.update(b"admin")
            
            # Register admin
            register_resp = await client.post(
                f"{settings.synapse_url}/_synapse/admin/v1/register",
                json={
                    "nonce": nonce,
                    "username": "daarion_admin",
                    "password": "admin_password_2024",
                    "admin": True,
                    "mac": mac.hexdigest()
                }
            )
            
            if register_resp.status_code == 200:
                result = register_resp.json()
                _admin_token = result.get("access_token")
                logger.info("Admin user created successfully")
                return _admin_token
            elif register_resp.status_code == 400:
                # User already exists, try to login
                login_resp = await client.post(
                    f"{settings.synapse_url}/_matrix/client/v3/login",
                    json={
                        "type": "m.login.password",
                        "user": "daarion_admin",
                        "password": "admin_password_2024"
                    }
                )
                login_resp.raise_for_status()
                result = login_resp.json()
                _admin_token = result.get("access_token")
                logger.info("Admin user logged in successfully")
                return _admin_token
            else:
                raise Exception(f"Failed to create admin: {register_resp.text}")
                
    except Exception as e:
        logger.error(f"Failed to get admin token: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get admin token: {e}")


@app.get("/healthz", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    synapse_status = "unknown"
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.synapse_url}/_matrix/client/versions")
            if resp.status_code == 200:
                synapse_status = "connected"
            else:
                synapse_status = "error"
    except Exception:
        synapse_status = "unavailable"
    
    return HealthResponse(
        status="ok" if synapse_status == "connected" else "degraded",
        synapse=synapse_status,
        server_name=settings.matrix_server_name
    )


@app.post("/internal/matrix/rooms/create", response_model=CreateRoomResponse)
async def create_room(request: CreateRoomRequest):
    """
    Create a Matrix room for a City Room.
    
    This is an internal endpoint - should only be called by city-service.
    """
    admin_token = await get_admin_token()
    
    room_alias_name = f"city_{request.slug}"
    room_name = f"DAARION City — {request.name}"
    
    async with httpx.AsyncClient() as client:
        try:
            # Create room
            create_resp = await client.post(
                f"{settings.synapse_url}/_matrix/client/v3/createRoom",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={
                    "name": room_name,
                    "room_alias_name": room_alias_name,
                    "topic": request.topic or f"City room: {request.name}",
                    "preset": "public_chat" if request.visibility == "public" else "private_chat",
                    "visibility": "public" if request.visibility == "public" else "private",
                    "creation_content": {
                        "m.federate": False  # Don't federate for now
                    },
                    "initial_state": [
                        {
                            "type": "m.room.history_visibility",
                            "content": {"history_visibility": "shared"}
                        },
                        {
                            "type": "m.room.guest_access",
                            "content": {"guest_access": "can_join"}
                        }
                    ]
                }
            )
            
            if create_resp.status_code == 200:
                result = create_resp.json()
                matrix_room_id = result["room_id"]
                matrix_room_alias = f"#city_{request.slug}:{settings.matrix_server_name}"
                
                logger.info(f"Created Matrix room: {matrix_room_id} ({matrix_room_alias})")
                
                return CreateRoomResponse(
                    matrix_room_id=matrix_room_id,
                    matrix_room_alias=matrix_room_alias
                )
            elif create_resp.status_code == 400:
                error = create_resp.json()
                if "M_ROOM_IN_USE" in str(error):
                    # Room already exists, find it
                    alias = f"#city_{request.slug}:{settings.matrix_server_name}"
                    find_resp = await client.get(
                        f"{settings.synapse_url}/_matrix/client/v3/directory/room/{alias.replace('#', '%23').replace(':', '%3A')}",
                        headers={"Authorization": f"Bearer {admin_token}"}
                    )
                    if find_resp.status_code == 200:
                        room_info = find_resp.json()
                        return CreateRoomResponse(
                            matrix_room_id=room_info["room_id"],
                            matrix_room_alias=alias
                        )
                
                logger.error(f"Failed to create room: {create_resp.text}")
                raise HTTPException(status_code=400, detail=f"Matrix error: {error.get('error', 'Unknown')}")
            else:
                logger.error(f"Failed to create room: {create_resp.text}")
                raise HTTPException(status_code=500, detail="Failed to create Matrix room")
                
        except httpx.RequestError as e:
            logger.error(f"Matrix request error: {e}")
            raise HTTPException(status_code=503, detail="Matrix unavailable")


@app.get("/internal/matrix/rooms/find-by-alias", response_model=FindRoomResponse)
async def find_room_by_alias(alias: str = Query(..., description="Matrix room alias")):
    """
    Find a Matrix room by its alias.
    
    Example: ?alias=#city_general:daarion.space
    """
    admin_token = await get_admin_token()
    
    # URL encode the alias
    encoded_alias = alias.replace("#", "%23").replace(":", "%3A")
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{settings.synapse_url}/_matrix/client/v3/directory/room/{encoded_alias}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            
            if resp.status_code == 200:
                result = resp.json()
                return FindRoomResponse(
                    matrix_room_id=result["room_id"],
                    matrix_room_alias=alias
                )
            elif resp.status_code == 404:
                raise HTTPException(status_code=404, detail="Room not found")
            else:
                logger.error(f"Failed to find room: {resp.text}")
                raise HTTPException(status_code=500, detail="Failed to find room")
                
        except httpx.RequestError as e:
            logger.error(f"Matrix request error: {e}")
            raise HTTPException(status_code=503, detail="Matrix unavailable")


@app.get("/internal/matrix/rooms/{room_id}")
async def get_room_info(room_id: str):
    """Get information about a Matrix room."""
    admin_token = await get_admin_token()
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{settings.synapse_url}/_matrix/client/v3/rooms/{room_id}/state",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            
            if resp.status_code == 200:
                state = resp.json()
                # Extract room info from state
                name = None
                topic = None
                
                for event in state:
                    if event.get("type") == "m.room.name":
                        name = event.get("content", {}).get("name")
                    elif event.get("type") == "m.room.topic":
                        topic = event.get("content", {}).get("topic")
                
                return {
                    "room_id": room_id,
                    "name": name,
                    "topic": topic
                }
            else:
                raise HTTPException(status_code=resp.status_code, detail="Failed to get room info")
                
        except httpx.RequestError as e:
            logger.error(f"Matrix request error: {e}")
            raise HTTPException(status_code=503, detail="Matrix unavailable")


@app.post("/internal/matrix/users/token", response_model=UserTokenResponse)
async def get_user_token(request: UserTokenRequest):
    """
    Get or create Matrix access token for a DAARION user.
    
    This is used for chat bootstrap - allows frontend to connect to Matrix
    on behalf of the user.
    """
    # Generate Matrix username from DAARION user_id
    user_id_short = request.user_id[:8].replace('-', '')
    matrix_username = f"daarion_{user_id_short}"
    matrix_user_id = f"@{matrix_username}:{settings.matrix_server_name}"
    
    # Generate password (deterministic, based on user_id + secret)
    matrix_password = hashlib.sha256(
        f"{request.user_id}:{settings.synapse_registration_secret}".encode()
    ).hexdigest()[:32]
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Try to login first
            login_resp = await client.post(
                f"{settings.synapse_url}/_matrix/client/v3/login",
                json={
                    "type": "m.login.password",
                    "identifier": {
                        "type": "m.id.user",
                        "user": matrix_username
                    },
                    "password": matrix_password,
                    "device_id": f"DAARION_{user_id_short}",
                    "initial_device_display_name": "DAARION Web"
                }
            )
            
            if login_resp.status_code == 200:
                result = login_resp.json()
                logger.info(f"Matrix user logged in: {matrix_user_id}")
                return UserTokenResponse(
                    matrix_user_id=result["user_id"],
                    access_token=result["access_token"],
                    device_id=result.get("device_id", f"DAARION_{user_id_short}"),
                    home_server=settings.matrix_server_name
                )
            
            # User doesn't exist, create via admin API
            logger.info(f"Creating Matrix user: {matrix_username}")
            
            # Get nonce
            nonce_resp = await client.get(
                f"{settings.synapse_url}/_synapse/admin/v1/register"
            )
            nonce_resp.raise_for_status()
            nonce = nonce_resp.json()["nonce"]
            
            # Generate MAC
            mac = hmac.new(
                key=settings.synapse_registration_secret.encode('utf-8'),
                digestmod=hashlib.sha1
            )
            mac.update(nonce.encode('utf-8'))
            mac.update(b"\x00")
            mac.update(matrix_username.encode('utf-8'))
            mac.update(b"\x00")
            mac.update(matrix_password.encode('utf-8'))
            mac.update(b"\x00")
            mac.update(b"notadmin")
            
            # Register user
            register_resp = await client.post(
                f"{settings.synapse_url}/_synapse/admin/v1/register",
                json={
                    "nonce": nonce,
                    "username": matrix_username,
                    "password": matrix_password,
                    "admin": False,
                    "mac": mac.hexdigest()
                }
            )
            
            if register_resp.status_code == 200:
                result = register_resp.json()
                logger.info(f"Matrix user created: {result['user_id']}")
                return UserTokenResponse(
                    matrix_user_id=result["user_id"],
                    access_token=result["access_token"],
                    device_id=result.get("device_id", f"DAARION_{user_id_short}"),
                    home_server=settings.matrix_server_name
                )
            else:
                error = register_resp.json()
                logger.error(f"Failed to create Matrix user: {error}")
                raise HTTPException(status_code=500, detail=f"Failed to create Matrix user: {error.get('error', 'Unknown')}")
                
        except httpx.RequestError as e:
            logger.error(f"Matrix request error: {e}")
            raise HTTPException(status_code=503, detail="Matrix unavailable")


@app.post("/internal/matrix/presence/online", response_model=SetPresenceResponse)
async def set_presence_online(request: SetPresenceRequest):
    """
    Set Matrix presence status for a user.
    
    This endpoint is called by the frontend heartbeat to keep users "online".
    The user's own access token is used to set their presence.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # URL encode the user_id for the path
            encoded_user_id = request.matrix_user_id.replace("@", "%40").replace(":", "%3A")
            
            payload = {
                "presence": request.status,
            }
            if request.status_msg:
                payload["status_msg"] = request.status_msg
            
            resp = await client.put(
                f"{settings.synapse_url}/_matrix/client/v3/presence/{encoded_user_id}/status",
                headers={"Authorization": f"Bearer {request.access_token}"},
                json=payload
            )
            
            if resp.status_code in (200, 204):
                logger.info(f"Set presence for {request.matrix_user_id}: {request.status}")
                return SetPresenceResponse(
                    ok=True,
                    matrix_user_id=request.matrix_user_id,
                    status=request.status
                )
            else:
                error_text = resp.text
                logger.error(f"Failed to set presence: {resp.status_code} - {error_text}")
                raise HTTPException(
                    status_code=500,
                    detail={
                        "message": "Failed to set presence",
                        "matrix_status": resp.status_code,
                        "matrix_body": error_text
                    }
                )
                
        except httpx.RequestError as e:
            logger.error(f"Matrix request error: {e}")
            raise HTTPException(status_code=503, detail="Matrix unavailable")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.port)

