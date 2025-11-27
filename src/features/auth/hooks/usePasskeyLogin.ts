/**
 * usePasskeyLogin Hook
 * Handles WebAuthn passkey authentication flow
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  startPasskeyAuthentication,
  finishPasskeyAuthentication,
} from '@/api/auth/passkey';
import { useAuthStore } from '@/store/authStore';

interface UsePasskeyLoginResult {
  login: (email?: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  success: boolean;
}

export function usePasskeyLogin(): UsePasskeyLoginResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const setSession = useAuthStore((state) => state.setSession);
  const navigate = useNavigate();

  const login = async (email?: string) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      console.log('🔐 Starting passkey authentication', email ? `for: ${email}` : '(discoverable)');

      // Step 1: Start authentication (get challenge from server)
      const { options } = await startPasskeyAuthentication(email);
      console.log('✅ Received authentication options');

      // Step 2: Get assertion via WebAuthn API
      console.log('🔑 Getting assertion...');
      const credential = await navigator.credentials.get({
        publicKey: options as PublicKeyCredentialRequestOptions,
      });

      if (!credential) {
        throw new Error('Failed to get credential');
      }

      console.log('✅ Assertion received:', credential.id);

      // Step 3: Finish authentication (send assertion to server)
      const result = await finishPasskeyAuthentication(
        credential as PublicKeyCredential
      );

      console.log('✅ Authentication complete:', result.actor);

      // Store session
      setSession(result.session_token, result.actor);
      setSuccess(true);

      // Navigate to city dashboard
      setTimeout(() => {
        navigate('/city');
      }, 500);
    } catch (err: any) {
      console.error('❌ Authentication failed:', err);
      
      // User-friendly error messages
      let errorMessage = err.message;
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Authentication was cancelled';
      } else if (err.name === 'InvalidStateError') {
        errorMessage = 'No passkey found for this device';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'Passkeys are not supported on this device';
      }
      
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error, success };
}




