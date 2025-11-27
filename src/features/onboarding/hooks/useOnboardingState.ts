/**
 * useOnboardingState Hook
 * 
 * State machine для онбордингу DAARION.city
 */

import { useReducer, useCallback, useEffect } from 'react';
import type {
  OnboardingState,
  OnboardingScene,
  OnboardingMessage,
  OnboardingAction_StateMachine,
  OnboardingUserData,
  OnboardingAuthData,
  OnboardingMatrixData,
  OnboardingWalletData,
  OnboardingAvatarData,
} from '../types/onboarding';

// ============================================================================
// Initial State
// ============================================================================

const SCENES_ORDER: OnboardingScene[] = [
  'arrival',
  'passkey',
  'matrix',
  'wallet',
  'avatar',
  'portal',
];

const initialState: OnboardingState = {
  currentScene: 'arrival',
  progress: 0,
  completedScenes: [],
  
  user: {
    name: '',
    locale: 'uk',
  },
  
  auth: {
    method: null,
  },
  
  matrix: {
    enabled: false,
  },
  
  wallet: {
    connected: false,
  },
  
  avatar: {
    created: false,
  },
  
  chatHistory: [],
  
  errors: {
    arrival: null,
    passkey: null,
    matrix: null,
    wallet: null,
    avatar: null,
    portal: null,
  },
  
  loading: {
    arrival: false,
    passkey: false,
    matrix: false,
    wallet: false,
    avatar: false,
    portal: false,
  },
};

// ============================================================================
// Reducer
// ============================================================================

function onboardingReducer(
  state: OnboardingState,
  action: OnboardingAction_StateMachine
): OnboardingState {
  switch (action.type) {
    case 'SET_SCENE':
      return {
        ...state,
        currentScene: action.scene,
      };
      
    case 'NEXT_SCENE': {
      const currentIndex = SCENES_ORDER.indexOf(state.currentScene);
      const nextIndex = Math.min(currentIndex + 1, SCENES_ORDER.length - 1);
      const nextScene = SCENES_ORDER[nextIndex];
      const progress = ((nextIndex + 1) / SCENES_ORDER.length) * 100;
      
      return {
        ...state,
        currentScene: nextScene,
        progress,
      };
    }
      
    case 'PREV_SCENE': {
      const currentIndex = SCENES_ORDER.indexOf(state.currentScene);
      const prevIndex = Math.max(currentIndex - 1, 0);
      const prevScene = SCENES_ORDER[prevIndex];
      const progress = ((prevIndex + 1) / SCENES_ORDER.length) * 100;
      
      return {
        ...state,
        currentScene: prevScene,
        progress,
      };
    }
      
    case 'SET_USER_DATA':
      return {
        ...state,
        user: {
          ...state.user,
          ...action.data,
        },
      };
      
    case 'SET_AUTH_DATA':
      return {
        ...state,
        auth: {
          ...state.auth,
          ...action.data,
        },
      };
      
    case 'SET_MATRIX_DATA':
      return {
        ...state,
        matrix: {
          ...state.matrix,
          ...action.data,
        },
      };
      
    case 'SET_WALLET_DATA':
      return {
        ...state,
        wallet: {
          ...state.wallet,
          ...action.data,
        },
      };
      
    case 'SET_AVATAR_DATA':
      return {
        ...state,
        avatar: {
          ...state.avatar,
          ...action.data,
        },
      };
      
    case 'ADD_MESSAGE':
      return {
        ...state,
        chatHistory: [...state.chatHistory, action.message],
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.scene]: action.error,
        },
      };
      
    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.scene]: action.loading,
        },
      };
      
    case 'COMPLETE_SCENE': {
      const completedScenes = state.completedScenes.includes(action.scene)
        ? state.completedScenes
        : [...state.completedScenes, action.scene];
      
      return {
        ...state,
        completedScenes,
      };
    }
      
    case 'RESET':
      return initialState;
      
    default:
      return state;
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useOnboardingState() {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);
  
  // Завантаження стану з localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('daarion_onboarding_state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        // Відновлюємо стан
        dispatch({ type: 'SET_SCENE', scene: parsed.currentScene });
        dispatch({ type: 'SET_USER_DATA', data: parsed.user });
        dispatch({ type: 'SET_AUTH_DATA', data: parsed.auth });
        dispatch({ type: 'SET_MATRIX_DATA', data: parsed.matrix });
        dispatch({ type: 'SET_WALLET_DATA', data: parsed.wallet });
        dispatch({ type: 'SET_AVATAR_DATA', data: parsed.avatar });
      } catch (error) {
        console.error('Failed to restore onboarding state:', error);
      }
    }
  }, []);
  
  // Збереження стану в localStorage
  useEffect(() => {
    localStorage.setItem('daarion_onboarding_state', JSON.stringify(state));
  }, [state]);
  
  // ============================================================================
  // Actions
  // ============================================================================
  
  const setScene = useCallback((scene: OnboardingScene) => {
    dispatch({ type: 'SET_SCENE', scene });
  }, []);
  
  const nextScene = useCallback(() => {
    dispatch({ type: 'NEXT_SCENE' });
  }, []);
  
  const prevScene = useCallback(() => {
    dispatch({ type: 'PREV_SCENE' });
  }, []);
  
  const setUserData = useCallback((data: Partial<OnboardingUserData>) => {
    dispatch({ type: 'SET_USER_DATA', data });
  }, []);
  
  const setAuthData = useCallback((data: Partial<OnboardingAuthData>) => {
    dispatch({ type: 'SET_AUTH_DATA', data });
  }, []);
  
  const setMatrixData = useCallback((data: Partial<OnboardingMatrixData>) => {
    dispatch({ type: 'SET_MATRIX_DATA', data });
  }, []);
  
  const setWalletData = useCallback((data: Partial<OnboardingWalletData>) => {
    dispatch({ type: 'SET_WALLET_DATA', data });
  }, []);
  
  const setAvatarData = useCallback((data: Partial<OnboardingAvatarData>) => {
    dispatch({ type: 'SET_AVATAR_DATA', data });
  }, []);
  
  const addMessage = useCallback((message: Omit<OnboardingMessage, 'id' | 'timestamp'>) => {
    const fullMessage: OnboardingMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    dispatch({ type: 'ADD_MESSAGE', message: fullMessage });
  }, []);
  
  const setError = useCallback((scene: OnboardingScene, error: string | null) => {
    dispatch({ type: 'SET_ERROR', scene, error });
  }, []);
  
  const setLoading = useCallback((scene: OnboardingScene, loading: boolean) => {
    dispatch({ type: 'SET_LOADING', scene, loading });
  }, []);
  
  const completeScene = useCallback((scene: OnboardingScene) => {
    dispatch({ type: 'COMPLETE_SCENE', scene });
  }, []);
  
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
    localStorage.removeItem('daarion_onboarding_state');
  }, []);
  
  // ============================================================================
  // Computed Values
  // ============================================================================
  
  const currentSceneIndex = SCENES_ORDER.indexOf(state.currentScene);
  const isFirstScene = currentSceneIndex === 0;
  const isLastScene = currentSceneIndex === SCENES_ORDER.length - 1;
  const canGoBack = !isFirstScene;
  const canGoForward = !isLastScene;
  
  const isSceneCompleted = useCallback((scene: OnboardingScene) => {
    return state.completedScenes.includes(scene);
  }, [state.completedScenes]);
  
  const allScenesCompleted = state.completedScenes.length === SCENES_ORDER.length;
  
  return {
    // State
    state,
    
    // Actions
    setScene,
    nextScene,
    prevScene,
    setUserData,
    setAuthData,
    setMatrixData,
    setWalletData,
    setAvatarData,
    addMessage,
    setError,
    setLoading,
    completeScene,
    reset,
    
    // Computed
    currentSceneIndex,
    isFirstScene,
    isLastScene,
    canGoBack,
    canGoForward,
    isSceneCompleted,
    allScenesCompleted,
    SCENES_ORDER,
  };
}

