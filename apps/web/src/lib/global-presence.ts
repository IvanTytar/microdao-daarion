/**
 * Global Presence WebSocket Client
 * 
 * Connects to /ws/city/global-presence for real-time room presence updates
 */

export interface RoomPresence {
  room_slug: string;
  online_count: number;
  typing_count: number;
}

export type PresenceCallback = (presence: Record<string, RoomPresence>) => void;

class GlobalPresenceClient {
  private ws: WebSocket | null = null;
  private presence: Record<string, RoomPresence> = {};
  private listeners: Set<PresenceCallback> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    // Determine WebSocket URL
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:7001';
    const wsUrl = `${protocol}//${host}/ws/city/global-presence`;

    console.log('[GlobalPresence] Connecting to', wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[GlobalPresence] Connected');
        this.isConnecting = false;
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.error('[GlobalPresence] Failed to parse message:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('[GlobalPresence] Disconnected');
        this.isConnecting = false;
        this.stopPing();
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[GlobalPresence] WebSocket error:', error);
        this.isConnecting = false;
      };
    } catch (e) {
      console.error('[GlobalPresence] Failed to create WebSocket:', e);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.stopPing();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  subscribe(callback: PresenceCallback): () => void {
    this.listeners.add(callback);
    
    // Send current state immediately
    if (Object.keys(this.presence).length > 0) {
      callback(this.presence);
    }
    
    // Connect if not connected
    this.connect();

    return () => {
      this.listeners.delete(callback);
      
      // Disconnect if no listeners
      if (this.listeners.size === 0) {
        this.disconnect();
      }
    };
  }

  getPresence(slug: string): RoomPresence | null {
    return this.presence[slug] || null;
  }

  getAllPresence(): Record<string, RoomPresence> {
    return { ...this.presence };
  }

  private handleMessage(data: any): void {
    if (data.type === 'snapshot') {
      // Initial snapshot
      this.presence = {};
      for (const room of data.rooms || []) {
        this.presence[room.room_slug] = {
          room_slug: room.room_slug,
          online_count: room.online_count || 0,
          typing_count: room.typing_count || 0
        };
      }
      this.notifyListeners();
    } else if (data.type === 'room.presence') {
      // Incremental update
      this.presence[data.room_slug] = {
        room_slug: data.room_slug,
        online_count: data.online_count || 0,
        typing_count: data.typing_count || 0
      };
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    for (const callback of this.listeners) {
      try {
        callback(this.presence);
      } catch (e) {
        console.error('[GlobalPresence] Listener error:', e);
      }
    }
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.listeners.size > 0) {
        console.log('[GlobalPresence] Reconnecting...');
        this.connect();
      }
    }, 5000);
  }
}

// Singleton instance
export const globalPresenceClient = new GlobalPresenceClient();

