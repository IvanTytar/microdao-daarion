"""
Passkey Routes (WebAuthn)
4 endpoints: register/start, register/finish, authenticate/start, authenticate/finish
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import base64
import json

from passkey_store import PasskeyStore
from webauthn_utils import webauthn_manager, generate_session_token
from models import ActorIdentity, ActorType

router = APIRouter(prefix="/auth/passkey", tags=["passkey"])

# Global store (injected at startup)
passkey_store: Optional[PasskeyStore] = None

def get_store() -> PasskeyStore:
    if not passkey_store:
        raise HTTPException(500, "Passkey store not initialized")
    return passkey_store

# ============================================================================
# Request/Response Models
# ============================================================================

class RegistrationStartRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    username: Optional[str] = None
    display_name: Optional[str] = None

class RegistrationStartResponse(BaseModel):
    options: Dict[str, Any]
    challenge: str

class RegistrationFinishRequest(BaseModel):
    email: str
    credential: Dict[str, Any]  # WebAuthn credential response

class RegistrationFinishResponse(BaseModel):
    success: bool
    user_id: str
    message: str

class AuthenticationStartRequest(BaseModel):
    email: Optional[str] = None  # Optional for resident key

class AuthenticationStartResponse(BaseModel):
    options: Dict[str, Any]
    challenge: str

class AuthenticationFinishRequest(BaseModel):
    credential: Dict[str, Any]  # WebAuthn assertion response

class AuthenticationFinishResponse(BaseModel):
    session_token: str
    actor: ActorIdentity

# ============================================================================
# REGISTRATION FLOW
# ============================================================================

@router.post("/register/start", response_model=RegistrationStartResponse)
async def register_start(
    request: RegistrationStartRequest,
    store: PasskeyStore = Depends(get_store)
):
    """
    Step 1 of registration: Generate WebAuthn challenge
    
    Creates or finds user, generates registration options
    """
    
    # Check if user already exists
    user = await store.get_user_by_email(request.email)
    
    if not user:
        # Create new user
        username = request.username or request.email.split('@')[0]
        display_name = request.display_name or username
        
        user = await store.create_user(
            email=request.email,
            username=username,
            display_name=display_name
        )
        print(f"✅ Created new user: {user['id']}")
    else:
        print(f"✅ Found existing user: {user['id']}")
    
    # Generate registration options
    result = webauthn_manager.generate_registration_challenge(
        user_id=str(user['id']),
        username=user['username'],
        display_name=user['display_name']
    )
    
    # Store challenge
    await store.store_challenge(
        challenge=result['challenge'],
        challenge_type='register',
        user_id=str(user['id']),
        email=request.email
    )
    
    print(f"✅ Generated registration challenge for {request.email}")
    
    return RegistrationStartResponse(
        options=result['options'],
        challenge=result['challenge']
    )

@router.post("/register/finish", response_model=RegistrationFinishResponse)
async def register_finish(
    request: RegistrationFinishRequest,
    store: PasskeyStore = Depends(get_store)
):
    """
    Step 2 of registration: Verify attestation and store credential
    
    Validates WebAuthn response, stores public key
    """
    
    # Get user
    user = await store.get_user_by_email(request.email)
    if not user:
        raise HTTPException(404, "User not found")
    
    # Extract challenge from credential
    client_data_json = base64.urlsafe_b64decode(
        request.credential['response']['clientDataJSON'] + "=="
    )
    client_data = json.loads(client_data_json)
    challenge_b64 = client_data['challenge']
    
    # Verify challenge
    challenge_record = await store.verify_challenge(
        challenge=challenge_b64,
        challenge_type='register'
    )
    
    if not challenge_record:
        raise HTTPException(400, "Invalid or expired challenge")
    
    # Verify registration
    expected_challenge = base64.urlsafe_b64decode(challenge_b64 + "==")
    
    verification = webauthn_manager.verify_registration(
        credential=request.credential,
        expected_challenge=expected_challenge,
        expected_origin=webauthn_manager.origin,
        expected_rp_id=webauthn_manager.rp_id
    )
    
    if not verification['verified']:
        raise HTTPException(400, f"Registration verification failed: {verification.get('error')}")
    
    # Store passkey
    await store.create_passkey(
        user_id=str(user['id']),
        credential_id=verification['credential_id'],
        public_key=verification['public_key'],
        sign_count=verification['sign_count'],
        aaguid=verification['aaguid'],
        attestation_format=verification['attestation_format']
    )
    
    print(f"✅ Registered passkey for user {user['id']}")
    
    return RegistrationFinishResponse(
        success=True,
        user_id=str(user['id']),
        message="Passkey registered successfully"
    )

# ============================================================================
# AUTHENTICATION FLOW
# ============================================================================

@router.post("/authenticate/start", response_model=AuthenticationStartResponse)
async def authenticate_start(
    request: AuthenticationStartRequest,
    store: PasskeyStore = Depends(get_store)
):
    """
    Step 1 of authentication: Generate WebAuthn challenge
    
    Finds user's passkeys, generates authentication options
    """
    
    credentials = []
    user_id = None
    
    if request.email:
        # Email-based authentication
        user = await store.get_user_by_email(request.email)
        if not user:
            raise HTTPException(404, "User not found")
        
        user_id = str(user['id'])
        
        # Get user's passkeys
        passkeys = await store.get_passkeys_by_user_id(user_id)
        credentials = [
            {
                "credential_id": pk['credential_id'],
                "transports": pk.get('transports', [])
            }
            for pk in passkeys
        ]
        
        if not credentials:
            raise HTTPException(404, "No passkeys found for this user")
    else:
        # Resident key authentication (discoverable credential)
        # Allow any passkey
        pass
    
    # Generate authentication options
    result = webauthn_manager.generate_authentication_challenge(credentials)
    
    # Store challenge
    await store.store_challenge(
        challenge=result['challenge'],
        challenge_type='authenticate',
        user_id=user_id,
        email=request.email
    )
    
    print(f"✅ Generated authentication challenge")
    
    return AuthenticationStartResponse(
        options=result['options'],
        challenge=result['challenge']
    )

@router.post("/authenticate/finish", response_model=AuthenticationFinishResponse)
async def authenticate_finish(
    request: AuthenticationFinishRequest,
    store: PasskeyStore = Depends(get_store)
):
    """
    Step 2 of authentication: Verify assertion and create session
    
    Validates WebAuthn response, returns session token
    """
    
    # Extract credential ID and challenge
    credential_id_b64 = request.credential['id']
    
    client_data_json = base64.urlsafe_b64decode(
        request.credential['response']['clientDataJSON'] + "=="
    )
    client_data = json.loads(client_data_json)
    challenge_b64 = client_data['challenge']
    
    # Verify challenge
    challenge_record = await store.verify_challenge(
        challenge=challenge_b64,
        challenge_type='authenticate'
    )
    
    if not challenge_record:
        raise HTTPException(400, "Invalid or expired challenge")
    
    # Get passkey
    passkey = await store.get_passkey_by_credential_id(credential_id_b64)
    if not passkey:
        raise HTTPException(404, "Passkey not found")
    
    # Verify authentication
    expected_challenge = base64.urlsafe_b64decode(challenge_b64 + "==")
    public_key_bytes = base64.urlsafe_b64decode(passkey['public_key'] + "==")
    
    verification = webauthn_manager.verify_authentication(
        credential=request.credential,
        expected_challenge=expected_challenge,
        credential_public_key=public_key_bytes,
        credential_current_sign_count=passkey['sign_count'],
        expected_origin=webauthn_manager.origin,
        expected_rp_id=webauthn_manager.rp_id
    )
    
    if not verification['verified']:
        raise HTTPException(400, f"Authentication verification failed: {verification.get('error')}")
    
    # Update sign count
    await store.update_sign_count(
        credential_id=credential_id_b64,
        new_sign_count=verification['new_sign_count']
    )
    
    # Get user
    user = await store.get_user_by_id(str(passkey['user_id']))
    if not user:
        raise HTTPException(404, "User not found")
    
    # Update last login
    await store.update_last_login(str(user['id']))
    
    # Create session
    session_token = generate_session_token()
    await store.create_session(
        token=session_token,
        user_id=str(user['id'])
    )
    
    # Build ActorIdentity
    memberships = await store.get_user_microdao_memberships(str(user['id']))
    
    actor = ActorIdentity(
        actor_id=f"user:{user['id']}",
        actor_type=ActorType.HUMAN,
        microdao_ids=[m['microdao_id'] for m in memberships],
        roles=[m['role'] for m in memberships]
    )
    
    print(f"✅ Authenticated user {user['id']}")
    
    return AuthenticationFinishResponse(
        session_token=session_token,
        actor=actor
    )




