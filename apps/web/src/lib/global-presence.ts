/**
 * Global Presence SSE Client
 * 
 * Connects to /api/presence/stream for real-time room presence updates via SSE
 */

export interface AgentPresence {
  agent_id: string;
  display_name: string;
  kind: string;
  status: string;
  room_id?: string;
  room_name?: string;
  color?: string;
  node_id?: string;
  district?: string;
  model?: string;
  role?: string;
  avatar_url?: string;
  primary_room_slug?: string;
}

export interface RoomPresence {
  room_id: string;
  matrix_room_id?: string;
  online: number;
  typing: number;
  agents?: AgentPresence[];
}

export interface CityPresence {
  online_total: number;
  rooms_online: number;
  agents_online?: number;
}

export interface PresenceEvent {
  type: "presence_update";
  timestamp: string;
  city: CityPresence;
  rooms: RoomPresence[];
  agents?: AgentPresence[];
}

export type PresenceCallback = (
  cityOnline: number,
  roomsPresence: Record<string, RoomPresence>,
  agents: AgentPresence[]
) => void;

class GlobalPresenceClient {
  private eventSource: EventSource | null = null;
  private cityOnline: number = 0;
  private agentsOnline: number = 0;
  private roomsPresence: Record<string, RoomPresence> = {};
  private agents: AgentPresence[] = [];
  private listeners: Set<PresenceCallback> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;

  connect(): void {
    if (this.eventSource || this.isConnecting) {
      return;
    }

    if (typeof window === 'undefined') {
      return; // SSR - don't connect
    }

    this.isConnecting = true;

    const sseUrl = "/api/presence/stream";
    console.log('[GlobalPresence] Connecting to SSE:', sseUrl);

    try {
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        console.log('[GlobalPresence] SSE Connected');
        this.isConnecting = false;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data: PresenceEvent = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          // Ignore keep-alive comments
          if (!event.data.startsWith(':')) {
            console.error('[GlobalPresence] Failed to parse message:', e);
          }
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('[GlobalPresence] SSE error:', error);
        this.isConnecting = false;
        this.disconnect();
        this.scheduleReconnect();
      };
    } catch (e) {
      console.error('[GlobalPresence] Failed to create EventSource:', e);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  subscribe(callback: PresenceCallback): () => void {
    this.listeners.add(callback);
    
    // Send current state immediately
    if (this.cityOnline > 0 || Object.keys(this.roomsPresence).length > 0) {
      callback(this.cityOnline, this.roomsPresence, this.agents);
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

  getAgentsOnline(): number {
    return this.agentsOnline;
  }

  getAllAgents(): AgentPresence[] {
    return [...this.agents];
  }

  getAgentsInRoom(roomId: string): AgentPresence[] {
    return this.agents.filter(a => a.room_id === roomId);
  }

  getCityOnline(): number {
    return this.cityOnline;
  }

  getRoomPresence(roomId: string): RoomPresence | null {
    return this.roomsPresence[roomId] || null;
  }

  getAllRoomsPresence(): Record<string, RoomPresence> {
    return { ...this.roomsPresence };
  }

  private handleMessage(data: PresenceEvent): void {
    if (data.type !== 'presence_update') return;

    // Update city stats
    this.cityOnline = data.city?.online_total || 0;
    this.agentsOnline = data.city?.agents_online || 0;

    // Update rooms
    const newRoomsPresence: Record<string, RoomPresence> = {};
    for (const room of data.rooms || []) {
      newRoomsPresence[room.room_id] = room;
    }
    this.roomsPresence = newRoomsPresence;

    // Update agents
    this.agents = data.agents || [];

    this.notifyListeners();
  }

  private notifyListeners(): void {
    for (const callback of this.listeners) {
      try {
        callback(this.cityOnline, this.roomsPresence, this.agents);
      } catch (e) {
        console.error('[GlobalPresence] Listener error:', e);
      }
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

