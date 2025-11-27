/**
 * Presence Store — Zustand store для Presence System
 */

import { create } from 'zustand';
import { getPresenceManager, type UserPresence } from '../lib/presence';

interface PresenceState {
  presence: Map<string, UserPresence>;
  isConnected: boolean;
  connect: (userId: string) => void;
  disconnect: () => void;
  getOnlineUsers: () => UserPresence[];
  getOnlineCount: () => number;
  getUserStatus: (userId: string) => UserPresence | undefined;
}

export const usePresenceStore = create<PresenceState>((set, get) => {
  const presenceManager = getPresenceManager();
  let unsubscribe: (() => void) | null = null;

  return {
    presence: new Map(),
    isConnected: false,

    connect: (userId: string) => {
      // Підписатися на оновлення
      unsubscribe = presenceManager.subscribe((presence) => {
        set({ presence, isConnected: true });
      });

      // Підключитися
      presenceManager.connect(userId);
    },

    disconnect: () => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      presenceManager.disconnect();
      set({ isConnected: false, presence: new Map() });
    },

    getOnlineUsers: () => {
      return presenceManager.getOnlineUsers();
    },

    getOnlineCount: () => {
      return presenceManager.getOnlineCount();
    },

    getUserStatus: (userId: string) => {
      return presenceManager.getPresence(userId);
    },
  };
});

