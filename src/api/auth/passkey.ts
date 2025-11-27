/**
 * Passkey API Client (WebAuthn)
 * Handles registration and authentication with auth-service
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7011';

// ============================================================================
// Types
// ============================================================================

export interface RegistrationStartResponse {
  options: PublicKeyCredentialCreationOptions;
  challenge: string;
}

export interface RegistrationFinishResponse {
  success: boolean;
  user_id: string;
  message: string;
}

export interface AuthenticationStartResponse {
  options: PublicKeyCredentialRequestOptions;
  challenge: string;
}

export interface AuthenticationFinishResponse {
  session_token: string;
  actor: {
    actor_id: string;
    actor_type: string;
    microdao_ids: string[];
    roles: string[];
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function bufferToBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64URLToBuffer(base64URL: string): ArrayBuffer {
  const base64 = base64URL.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ============================================================================
// API Functions
// ============================================================================

export async function startPasskeyRegistration(email: string): Promise<RegistrationStartResponse> {
  const response = await fetch(`${API_URL}/auth/passkey/register/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to start registration');
  }

  const data = await response.json();

  // Convert base64url strings to ArrayBuffers for WebAuthn API
  const options = {
    ...data.options,
    challenge: base64URLToBuffer(data.options.challenge),
    user: {
      ...data.options.user,
      id: base64URLToBuffer(data.options.user.id),
    },
  };

  return { options, challenge: data.challenge };
}

export async function finishPasskeyRegistration(
  email: string,
  credential: PublicKeyCredential
): Promise<RegistrationFinishResponse> {
  const response = credential.response as AuthenticatorAttestationResponse;

  // Convert ArrayBuffers to base64url strings
  const credentialForServer = {
    id: credential.id,
    rawId: bufferToBase64URL(credential.rawId),
    type: credential.type,
    response: {
      attestationObject: bufferToBase64URL(response.attestationObject),
      clientDataJSON: bufferToBase64URL(response.clientDataJSON),
    },
  };

  const apiResponse = await fetch(`${API_URL}/auth/passkey/register/finish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      credential: credentialForServer,
    }),
  });

  if (!apiResponse.ok) {
    const error = await apiResponse.json();
    throw new Error(error.detail || 'Failed to finish registration');
  }

  return await apiResponse.json();
}

export async function startPasskeyAuthentication(
  email?: string
): Promise<AuthenticationStartResponse> {
  const response = await fetch(`${API_URL}/auth/passkey/authenticate/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to start authentication');
  }

  const data = await response.json();

  // Convert base64url strings to ArrayBuffers
  const options = {
    ...data.options,
    challenge: base64URLToBuffer(data.options.challenge),
    allowCredentials: data.options.allowCredentials?.map((cred: any) => ({
      ...cred,
      id: base64URLToBuffer(cred.id),
    })),
  };

  return { options, challenge: data.challenge };
}

export async function finishPasskeyAuthentication(
  credential: PublicKeyCredential
): Promise<AuthenticationFinishResponse> {
  const response = credential.response as AuthenticatorAssertionResponse;

  // Convert ArrayBuffers to base64url strings
  const credentialForServer = {
    id: credential.id,
    rawId: bufferToBase64URL(credential.rawId),
    type: credential.type,
    response: {
      authenticatorData: bufferToBase64URL(response.authenticatorData),
      clientDataJSON: bufferToBase64URL(response.clientDataJSON),
      signature: bufferToBase64URL(response.signature),
      userHandle: response.userHandle ? bufferToBase64URL(response.userHandle) : null,
    },
  };

  const apiResponse = await fetch(`${API_URL}/auth/passkey/authenticate/finish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: credentialForServer }),
  });

  if (!apiResponse.ok) {
    const error = await apiResponse.json();
    throw new Error(error.detail || 'Failed to finish authentication');
  }

  return await apiResponse.json();
}





