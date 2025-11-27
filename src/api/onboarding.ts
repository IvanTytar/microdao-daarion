import { apiPost, ApiError } from './client';
import type {
  AvatarCreationMethod,
  AvatarConfig,
  ChainId,
  WalletType,
} from '../features/onboarding/types/onboarding';

const FALLBACK_USER_ID = 'temp-user';

interface RegisterPasskeyPayload {
  userId?: string;
  name: string;
  locale: 'uk' | 'en';
  deviceInfo?: string;
}

interface RegisterPasskeyResponse {
  success: boolean;
  userId: string;
  passkeyId?: string;
}

interface MatrixConnectionPayload {
  userId: string;
  homeserver?: string;
  displayName?: string;
}

interface MatrixConnectionResponse {
  success: boolean;
  matrixUserId: string;
  accessToken: string;
  homeserver: string;
}

interface WalletConnectionPayload {
  userId: string;
  walletType: WalletType;
  address: string;
  chainId: ChainId;
}

interface WalletConnectionResponse {
  success: boolean;
  walletId: string;
  address: string;
  balance: {
    daar: string;
    util: string;
    ringk: string;
  };
}

interface SaveAvatarPayload {
  userId: string;
  method: AvatarCreationMethod;
  url?: string;
  config?: AvatarConfig;
}

interface SaveAvatarResponse {
  success: boolean;
  avatarUrl: string;
}

interface CityEnterPayload {
  userId: string;
  completedOnboarding: boolean;
}

interface CityEnterResponse {
  success: boolean;
  cityId: string;
  redirectUrl: string;
  citizenship: {
    status: 'active' | 'pending';
    joinedAt: string;
  };
}

function isOfflineError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 0;
}

export async function registerPasskey(
  payload: RegisterPasskeyPayload
): Promise<RegisterPasskeyResponse> {
  try {
    return await apiPost<RegisterPasskeyResponse>('/auth/passkey/register', payload);
  } catch (error) {
    if (isOfflineError(error)) {
      return {
        success: true,
        userId: payload.userId || `${FALLBACK_USER_ID}-${Date.now()}`,
        passkeyId: 'mock-passkey',
      };
    }
    throw error;
  }
}

export async function connectMatrix(
  payload: MatrixConnectionPayload
): Promise<MatrixConnectionResponse> {
  try {
    return await apiPost<MatrixConnectionResponse>('/integrations/matrix/connect', payload);
  } catch (error) {
    if (isOfflineError(error)) {
      return {
        success: true,
        matrixUserId: `@${payload.userId}:daarion.city`,
        accessToken: 'mock-matrix-token',
        homeserver: payload.homeserver || 'https://matrix.daarion.city',
      };
    }
    throw error;
  }
}

export async function connectWalletApi(
  payload: WalletConnectionPayload
): Promise<WalletConnectionResponse> {
  try {
    return await apiPost<WalletConnectionResponse>('/wallet/connect', payload);
  } catch (error) {
    if (isOfflineError(error)) {
      return {
        success: true,
        walletId: `wallet-${payload.walletType}-${Date.now()}`,
        address: payload.address,
        balance: {
          daar: '0.00',
          util: '0.00',
          ringk: '0.00',
        },
      };
    }
    throw error;
  }
}

export async function saveAvatar(
  payload: SaveAvatarPayload
): Promise<SaveAvatarResponse> {
  try {
    return await apiPost<SaveAvatarResponse>('/users/avatar', payload);
  } catch (error) {
    if (isOfflineError(error)) {
      return {
        success: true,
        avatarUrl: payload.url || '/avatars/default.png',
      };
    }
    throw error;
  }
}

export async function enterCity(
  payload: CityEnterPayload
): Promise<CityEnterResponse> {
  try {
    return await apiPost<CityEnterResponse>('/city/enter', payload);
  } catch (error) {
    if (isOfflineError(error)) {
      return {
        success: true,
        cityId: 'daarion-city',
        redirectUrl: '/city',
        citizenship: {
          status: 'active',
          joinedAt: new Date().toISOString(),
        },
      };
    }
    throw error;
  }
}

