/**
 * Auth Store (Zustand + Persist)
 * Global authentication state for DAARION
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

export interface ActorIdentity {
  actor_id: string;
  actor_type: 'human' | 'agent' | 'service';
  microdao_ids: string[];
  roles: string[];
}

interface AuthState {
  // State
  sessionToken: string | null;
  actor: ActorIdentity | null;
  isAuthenticated: boolean;
  
  // Actions
  setSession: (token: string, actor: ActorIdentity) => void;
  clearSession: () => void;
  updateActor: (actor: ActorIdentity) => void;
}

// ============================================================================
// Store
// ============================================================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      sessionToken: null,
      actor: null,
      isAuthenticated: false,
      
      // Actions
      setSession: (token: string, actor: ActorIdentity) => {
        localStorage.setItem('daarion_session_token', token);
        set({
          sessionToken: token,
          actor,
          isAuthenticated: true,
        });
        console.log('✅ Session set:', actor.actor_id);
      },
      
      clearSession: () => {
        localStorage.removeItem('daarion_session_token');
        set({
          sessionToken: null,
          actor: null,
          isAuthenticated: false,
        });
        console.log('✅ Session cleared');
      },
      
      updateActor: (actor: ActorIdentity) => {
        set({ actor });
        console.log('✅ Actor updated:', actor.actor_id);
      },
    }),
    {
      name: 'daarion-auth', // localStorage key
      partialize: (state) => ({
        sessionToken: state.sessionToken,
        actor: state.actor,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ============================================================================
// Helper Hooks
// ============================================================================

export function useAuth() {
  const { isAuthenticated, actor, sessionToken } = useAuthStore();
  return { isAuthenticated, actor, sessionToken };
}

export function useIsAuthenticated() {
  return useAuthStore((state) => state.isAuthenticated);
}

export function useActor() {
  return useAuthStore((state) => state.actor);
}




