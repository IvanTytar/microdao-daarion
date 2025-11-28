/**
 * Presence System — Система відстеження онлайн-статусу користувачів
 */

import { WebSocketClient } from './ws';

export type PresenceStatus = 'online' | 'offline' | 'away';

export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  lastSeen: string;
}

export type PresenceUpdateCallback = (presence: Map<string, UserPresence>) => void;

export class PresenceManager {
  private ws: WebSocketClient | null = null;
  private presenceMap: Map<string, UserPresence> = new Map();
  private heartbeatInterval: number | null = null;
  private callbacks: Set<PresenceUpdateCallback> = new Set();
  private userId: string | null = null;

  constructor(private wsUrl: string, private heartbeatIntervalMs: number = 20000) {}

  /**
   * Підключитися до Presence System
   */
  connect(userId: string): void {
    this.userId = userId;
    
    this.ws = new WebSocketClient({ url: this.wsUrl });

    this.ws.onOpen(() => {
      console.log('[Presence] Connected');
      this.startHeartbeat();
    });

    this.ws.onMessage((data: any) => {
      if (data.event === 'presence.update') {
        this.handlePresenceUpdate(data.user_id, data.status, data.last_seen);
      } else if (data.event === 'presence.bulk_update') {
        this.handleBulkUpdate(data.users);
      }
    });

    this.ws.onClose(() => {
      console.log('[Presence] Disconnected');
      this.stopHeartbeat();
    });

    this.ws.connect();
  }

  /**
   * Від'єднатися від Presence System
   */
  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.disconnect();
      this.ws = null;
    }

    this.presenceMap.clear();
    this.userId = null;
  }

  /**
   * Підписатися на оновлення presence
   */
  subscribe(callback: PresenceUpdateCallback): () => void {
    this.callbacks.add(callback);
    
    // Відразу відправити поточний стан
    callback(new Map(this.presenceMap));
    
    return () => this.callbacks.delete(callback);
  }

  /**
   * Отримати presence конкретного користувача
   */
  getPresence(userId: string): UserPresence | undefined {
    return this.presenceMap.get(userId);
  }

  /**
   * Отримати всі онлайн користувачів
   */
  getOnlineUsers(): UserPresence[] {
    return Array.from(this.presenceMap.values()).filter(p => p.status === 'online');
  }

  /**
   * Отримати кількість онлайн користувачів
   */
  getOnlineCount(): number {
    return this.getOnlineUsers().length;
  }

  /**
   * Запустити heartbeat
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    // Відправити перший heartbeat одразу
    this.sendHeartbeat();

    // Потім кожні N секунд
    this.heartbeatInterval = window.setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatIntervalMs);
  }

  /**
   * Зупинити heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Відправити heartbeat
   */
  private sendHeartbeat(): void {
    if (!this.ws || !this.userId) return;

    this.ws.send({
      event: 'presence.heartbeat',
      user_id: this.userId,
    });
  }

  /**
   * Обробити оновлення presence
   */
  private handlePresenceUpdate(userId: string, status: PresenceStatus, lastSeen?: string): void {
    const presence: UserPresence = {
      userId,
      status,
      lastSeen: lastSeen || new Date().toISOString(),
    };

    this.presenceMap.set(userId, presence);
    this.notifyCallbacks();
  }

  /**
   * Обробити bulk update
   */
  private handleBulkUpdate(users: Array<{ user_id: string; status: PresenceStatus; last_seen?: string }>): void {
    users.forEach(user => {
      this.handlePresenceUpdate(user.user_id, user.status, user.last_seen);
    });
  }

  /**
   * Сповістити всіх підписників
   */
  private notifyCallbacks(): void {
    const presenceCopy = new Map(this.presenceMap);
    this.callbacks.forEach(callback => callback(presenceCopy));
  }
}

// Global singleton instance
let globalPresenceManager: PresenceManager | null = null;

/**
 * Отримати глобальний екземпляр PresenceManager
 */
export function getPresenceManager(): PresenceManager {
  if (!globalPresenceManager) {
    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/city/presence`;
    globalPresenceManager = new PresenceManager(wsUrl);
  }
  return globalPresenceManager;
}

