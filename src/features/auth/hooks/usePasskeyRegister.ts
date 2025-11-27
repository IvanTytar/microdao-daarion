/**
 * usePasskeyRegister Hook
 * Handles WebAuthn passkey registration flow
 */
import { useState } from 'react';
import {
  startPasskeyRegistration,
  finishPasskeyRegistration,
} from '@/api/auth/passkey';

interface UsePasskeyRegisterResult {
  register: (email: string, username?: string, displayName?: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  success: boolean;
}

export function usePasskeyRegister(): UsePasskeyRegisterResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const register = async (
    email: string,
    username?: string,
    displayName?: string
  ) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      console.log('🔐 Starting passkey registration for:', email);

      // Step 1: Start registration (get challenge from server)
      const { options } = await startPasskeyRegistration(email);
      console.log('✅ Received registration options');

      // Step 2: Create credential via WebAuthn API
      console.log('🔑 Creating credential...');
      const credential = await navigator.credentials.create({
        publicKey: options as PublicKeyCredentialCreationOptions,
      });

      if (!credential) {
        throw new Error('Failed to create credential');
      }

      console.log('✅ Credential created:', credential.id);

      // Step 3: Finish registration (send credential to server)
      const result = await finishPasskeyRegistration(
        email,
        credential as PublicKeyCredential
      );

      console.log('✅ Registration complete:', result);
      setSuccess(true);
    } catch (err: any) {
      console.error('❌ Registration failed:', err);
      
      // User-friendly error messages
      let errorMessage = err.message;
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Passkey creation was cancelled or not allowed';
      } else if (err.name === 'InvalidStateError') {
        errorMessage = 'A passkey already exists for this device';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'Passkeys are not supported on this device';
      }
      
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { register, loading, error, success };
}





