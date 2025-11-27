"""
WebAuthn Utilities for DAARION
Handles challenge generation, credential validation, and attestation
"""
import os
import secrets
import base64
import json
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import hashlib

# WebAuthn library
from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
)
from webauthn.helpers.structs import (
    PublicKeyCredentialDescriptor,
    UserVerificationRequirement,
    AuthenticatorSelectionCriteria,
    ResidentKeyRequirement,
    AuthenticatorAttachment,
)
from webauthn.helpers.cose import COSEAlgorithmIdentifier

# Configuration
RP_ID = os.getenv("RP_ID", "localhost")
RP_NAME = os.getenv("RP_NAME", "DAARION")
ORIGIN = os.getenv("ORIGIN", "http://localhost:3000")

class WebAuthnManager:
    """Manages WebAuthn operations"""
    
    def __init__(self):
        self.rp_id = RP_ID
        self.rp_name = RP_NAME
        self.origin = ORIGIN
    
    def generate_registration_challenge(
        self,
        user_id: str,
        username: str,
        display_name: str
    ) -> Dict[str, Any]:
        """
        Generate WebAuthn registration options
        
        Returns PublicKeyCredentialCreationOptions
        """
        
        # Generate options using py_webauthn
        options = generate_registration_options(
            rp_id=self.rp_id,
            rp_name=self.rp_name,
            user_id=user_id.encode('utf-8'),
            user_name=username,
            user_display_name=display_name,
            authenticator_selection=AuthenticatorSelectionCriteria(
                authenticator_attachment=AuthenticatorAttachment.PLATFORM,
                resident_key=ResidentKeyRequirement.PREFERRED,
                user_verification=UserVerificationRequirement.PREFERRED,
            ),
            supported_pub_key_algs=[
                COSEAlgorithmIdentifier.ECDSA_SHA_256,  # -7
                COSEAlgorithmIdentifier.RSASSA_PKCS1_v1_5_SHA_256,  # -257
            ],
            timeout=60000,  # 60 seconds
        )
        
        # Convert to JSON-serializable dict
        options_json = options_to_json(options)
        options_dict = json.loads(options_json)
        
        return {
            "options": options_dict,
            "challenge": base64.urlsafe_b64encode(options.challenge).decode('utf-8').rstrip('=')
        }
    
    def verify_registration(
        self,
        credential: Dict[str, Any],
        expected_challenge: bytes,
        expected_origin: str,
        expected_rp_id: str
    ) -> Dict[str, Any]:
        """
        Verify WebAuthn registration response
        
        Returns verified credential data
        """
        
        try:
            verification = verify_registration_response(
                credential=credential,
                expected_challenge=expected_challenge,
                expected_origin=expected_origin,
                expected_rp_id=expected_rp_id,
            )
            
            return {
                "verified": True,
                "credential_id": base64.urlsafe_b64encode(verification.credential_id).decode('utf-8').rstrip('='),
                "public_key": base64.urlsafe_b64encode(verification.credential_public_key).decode('utf-8').rstrip('='),
                "sign_count": verification.sign_count,
                "aaguid": verification.aaguid.hex() if verification.aaguid else None,
                "attestation_format": verification.fmt,
            }
        except Exception as e:
            return {
                "verified": False,
                "error": str(e)
            }
    
    def generate_authentication_challenge(
        self,
        credentials: list[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate WebAuthn authentication options
        
        credentials: list of user's passkeys with credential_id
        """
        
        # Convert stored credentials to PublicKeyCredentialDescriptor
        allow_credentials = [
            PublicKeyCredentialDescriptor(
                id=base64.urlsafe_b64decode(cred["credential_id"] + "=="),
                transports=cred.get("transports", [])
            )
            for cred in credentials
        ]
        
        options = generate_authentication_options(
            rp_id=self.rp_id,
            allow_credentials=allow_credentials if allow_credentials else None,
            user_verification=UserVerificationRequirement.PREFERRED,
            timeout=60000,
        )
        
        # Convert to JSON-serializable dict
        options_json = options_to_json(options)
        options_dict = json.loads(options_json)
        
        return {
            "options": options_dict,
            "challenge": base64.urlsafe_b64encode(options.challenge).decode('utf-8').rstrip('=')
        }
    
    def verify_authentication(
        self,
        credential: Dict[str, Any],
        expected_challenge: bytes,
        credential_public_key: bytes,
        credential_current_sign_count: int,
        expected_origin: str,
        expected_rp_id: str
    ) -> Dict[str, Any]:
        """
        Verify WebAuthn authentication response
        
        Returns verification result with new sign count
        """
        
        try:
            verification = verify_authentication_response(
                credential=credential,
                expected_challenge=expected_challenge,
                expected_rp_id=expected_rp_id,
                expected_origin=expected_origin,
                credential_public_key=credential_public_key,
                credential_current_sign_count=credential_current_sign_count,
            )
            
            return {
                "verified": True,
                "new_sign_count": verification.new_sign_count
            }
        except Exception as e:
            return {
                "verified": False,
                "error": str(e)
            }

# Global instance
webauthn_manager = WebAuthnManager()

# ============================================================================
# Helper Functions
# ============================================================================

def generate_challenge() -> str:
    """Generate a cryptographically secure random challenge"""
    return base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')

def generate_session_token() -> str:
    """Generate a secure session token"""
    return secrets.token_urlsafe(32)

def hash_credential_id(credential_id: str) -> str:
    """Hash credential ID for storage"""
    return hashlib.sha256(credential_id.encode()).hexdigest()





