/**
 * Onboarding Pipeline Types
 * 
 * Типи для агентського онбордингу DAARION.city (6 сцен)
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Сцени онбордингу
 */
export type OnboardingScene = 
  | 'arrival'      // Прибуття
  | 'passkey'      // Налаштування доступу
  | 'matrix'       // Зв'язок з Matrix
  | 'wallet'       // Підключення гаманця
  | 'avatar'       // Створення аватара
  | 'portal';      // Вхід до міста

/**
 * Методи аутентифікації
 */
export type AuthMethod = 
  | 'passkey'      // WebAuthn (біометрія)
  | 'email'        // Magic link
  | 'wallet';      // Web3 (TON, Ethereum)

/**
 * Типи гаманців
 */
export type WalletType = 
  | 'ton'          // TON Connect
  | 'ethereum'     // MetaMask, WalletConnect
  | 'solana';      // Phantom

/**
 * Типи мереж
 */
export type ChainId = 
  | 'ton-mainnet'
  | 'ton-testnet'
  | 'ethereum-mainnet'
  | 'ethereum-sepolia'
  | 'solana-mainnet'
  | 'solana-devnet';

/**
 * Способи створення аватара
 */
export type AvatarCreationMethod = 
  | 'gallery'      // Вибрати з готових
  | 'ai'           // Згенерувати з фото
  | 'custom';      // Налаштувати вручну

// ============================================================================
// State Interfaces
// ============================================================================

/**
 * Стан онбордингу
 */
export interface OnboardingState {
  // Поточна сцена
  currentScene: OnboardingScene;
  
  // Прогрес (0-100%)
  progress: number;
  
  // Завершені сцени
  completedScenes: OnboardingScene[];
  
  // Дані користувача
  user: OnboardingUserData;
  
  // Дані аутентифікації
  auth: OnboardingAuthData;
  
  // Дані Matrix
  matrix: OnboardingMatrixData;
  
  // Дані гаманця
  wallet: OnboardingWalletData;
  
  // Дані аватара
  avatar: OnboardingAvatarData;
  
  // Історія діалогу з агентом
  chatHistory: OnboardingMessage[];
  
  // Помилки
  errors: Record<OnboardingScene, string | null>;
  
  // Завантаження
  loading: Record<OnboardingScene, boolean>;
}

/**
 * Дані користувача
 */
export interface OnboardingUserData {
  id?: string;
  name: string;
  displayName?: string;
  locale: 'uk' | 'en';
  timezone?: string;
}

/**
 * Дані аутентифікації
 */
export interface OnboardingAuthData {
  method: AuthMethod | null;
  
  // Passkey
  passkeyId?: string;
  passkeyCredential?: PublicKeyCredential;
  
  // Email
  email?: string;
  emailVerified?: boolean;
  
  // Wallet (буде заповнено в wallet сцені)
  walletAddress?: string;
}

/**
 * Дані Matrix
 */
export interface OnboardingMatrixData {
  enabled: boolean;
  userId?: string;
  accessToken?: string;
  homeserver?: string;
  rooms?: string[];
}

/**
 * Дані гаманця
 */
export interface OnboardingWalletData {
  connected: boolean;
  type?: WalletType;
  address?: string;
  chainId?: ChainId;
  balance?: {
    daar?: string;
    util?: string;
    ringk?: string;
  };
}

/**
 * Дані аватара
 */
export interface OnboardingAvatarData {
  created: boolean;
  method?: AvatarCreationMethod;
  url?: string;
  config?: AvatarConfig;
  uploadedPhoto?: File;
}

/**
 * Конфігурація аватара
 */
export interface AvatarConfig {
  // 3D модель
  model?: string;
  
  // Кольори
  skinColor?: string;
  hairColor?: string;
  eyeColor?: string;
  
  // Аксесуари
  accessories?: string[];
  
  // Одяг
  outfit?: string;
}

// ============================================================================
// Message Types
// ============================================================================

/**
 * Повідомлення в чаті онбордингу
 */
export interface OnboardingMessage {
  id: string;
  author: 'agent' | 'user';
  text: string;
  timestamp: Date;
  scene: OnboardingScene;
  
  // Опціональні елементи UI
  actions?: OnboardingAction[];
  metadata?: Record<string, any>;
}

/**
 * Дія в повідомленні (кнопка, вибір тощо)
 */
export interface OnboardingAction {
  id: string;
  type: 'button' | 'input' | 'select' | 'file';
  label: string;
  value?: string;
  options?: { label: string; value: string }[];
  onClick?: () => void;
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Запит на реєстрацію Passkey
 */
export interface PasskeyRegistrationRequest {
  userId: string;
  credential: PublicKeyCredential;
}

/**
 * Відповідь на реєстрацію Passkey
 */
export interface PasskeyRegistrationResponse {
  success: boolean;
  passkeyId: string;
  userId: string;
}

/**
 * Запит на підключення Matrix
 */
export interface MatrixConnectionRequest {
  userId: string;
  homeserver?: string;
}

/**
 * Відповідь на підключення Matrix
 */
export interface MatrixConnectionResponse {
  success: boolean;
  matrixUserId: string;
  accessToken: string;
  homeserver: string;
}

/**
 * Запит на підключення гаманця
 */
export interface WalletConnectionRequest {
  userId: string;
  walletType: WalletType;
  address: string;
  chainId: ChainId;
  signature?: string;
}

/**
 * Відповідь на підключення гаманця
 */
export interface WalletConnectionResponse {
  success: boolean;
  walletId: string;
  address: string;
  balance: {
    daar: string;
    util: string;
    ringk: string;
  };
}

/**
 * Запит на збереження аватара
 */
export interface AvatarSaveRequest {
  userId: string;
  method: AvatarCreationMethod;
  url?: string;
  config?: AvatarConfig;
  photo?: File;
}

/**
 * Відповідь на збереження аватара
 */
export interface AvatarSaveResponse {
  success: boolean;
  avatarUrl: string;
}

/**
 * Запит на генерацію аватара з фото
 */
export interface AvatarGenerateRequest {
  userId: string;
  photo: File;
}

/**
 * Відповідь на генерацію аватара
 */
export interface AvatarGenerateResponse {
  success: boolean;
  avatarUrl: string;
  config: AvatarConfig;
}

/**
 * Запит на вхід до міста
 */
export interface CityEnterRequest {
  userId: string;
  completedOnboarding: boolean;
}

/**
 * Відповідь на вхід до міста
 */
export interface CityEnterResponse {
  success: boolean;
  cityId: string;
  citizenship: {
    status: 'active' | 'pending';
    joinedAt: string;
  };
  redirectUrl: string;
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Дії state machine
 */
export type OnboardingAction_StateMachine = 
  | { type: 'SET_SCENE'; scene: OnboardingScene }
  | { type: 'NEXT_SCENE' }
  | { type: 'PREV_SCENE' }
  | { type: 'SET_USER_DATA'; data: Partial<OnboardingUserData> }
  | { type: 'SET_AUTH_DATA'; data: Partial<OnboardingAuthData> }
  | { type: 'SET_MATRIX_DATA'; data: Partial<OnboardingMatrixData> }
  | { type: 'SET_WALLET_DATA'; data: Partial<OnboardingWalletData> }
  | { type: 'SET_AVATAR_DATA'; data: Partial<OnboardingAvatarData> }
  | { type: 'ADD_MESSAGE'; message: OnboardingMessage }
  | { type: 'SET_ERROR'; scene: OnboardingScene; error: string | null }
  | { type: 'SET_LOADING'; scene: OnboardingScene; loading: boolean }
  | { type: 'COMPLETE_SCENE'; scene: OnboardingScene }
  | { type: 'RESET' };

/**
 * Скрипт агента для сцени
 */
export interface SceneScript {
  scene: OnboardingScene;
  greeting: string;
  questions: string[];
  hints: string[];
  successMessage: string;
  errorMessage: string;
}

/**
 * Конфігурація сцени
 */
export interface SceneConfig {
  scene: OnboardingScene;
  title: string;
  description: string;
  required: boolean;
  canSkip: boolean;
  estimatedTime: number; // в секундах
}

