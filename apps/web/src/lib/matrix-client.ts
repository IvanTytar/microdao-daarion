/**
 * Lightweight Matrix REST Client for DAARION
 * 
 * Uses Matrix Client-Server API directly without heavy SDK
 */

export interface MatrixClientConfig {
  baseUrl: string;
  accessToken: string;
  userId: string;
  roomId?: string;
}

export interface MatrixMessage {
  event_id: string;
  sender: string;
  origin_server_ts: number;
  content: {
    msgtype: string;
    body: string;
    format?: string;
    formatted_body?: string;
  };
  type: string;
}

export interface MatrixMessagesResponse {
  chunk: MatrixMessage[];
  start: string;
  end: string;
}

export interface MatrixSyncResponse {
  next_batch: string;
  rooms?: {
    join?: {
      [roomId: string]: {
        timeline?: {
          events: MatrixMessage[];
          prev_batch?: string;
        };
        state?: {
          events: any[];
        };
      };
    };
  };
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
  isUser: boolean;
}

export class MatrixRestClient {
  private baseUrl: string;
  private accessToken: string;
  private userId: string;
  private roomId: string | null = null;
  private syncToken: string | null = null;
  private syncAbortController: AbortController | null = null;
  private onMessageCallback: ((message: ChatMessage) => void) | null = null;
  private isSyncing: boolean = false;

  constructor(config: MatrixClientConfig) {
    this.baseUrl = config.baseUrl;
    this.accessToken = config.accessToken;
    this.userId = config.userId;
    this.roomId = config.roomId || null;
  }

  private authHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Join a Matrix room
   */
  async joinRoom(roomId: string): Promise<{ room_id: string }> {
    const res = await fetch(
      `${this.baseUrl}/_matrix/client/v3/join/${encodeURIComponent(roomId)}`,
      {
        method: 'POST',
        headers: this.authHeaders()
      }
    );
    
    if (!res.ok) {
      const error = await res.json();
      // M_FORBIDDEN means already joined or not allowed
      if (error.errcode !== 'M_FORBIDDEN') {
        throw new Error(error.error || 'Failed to join room');
      }
    }
    
    this.roomId = roomId;
    return res.json();
  }

  /**
   * Get messages from a room
   */
  async getMessages(roomId: string, options?: { limit?: number; from?: string; dir?: 'b' | 'f' }): Promise<MatrixMessagesResponse> {
    const params = new URLSearchParams({
      dir: options?.dir || 'b',
      limit: String(options?.limit || 50),
      filter: JSON.stringify({ types: ['m.room.message'] })
    });
    
    if (options?.from) {
      params.set('from', options.from);
    }

    const res = await fetch(
      `${this.baseUrl}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/messages?${params}`,
      { headers: this.authHeaders() }
    );

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to get messages');
    }

    return res.json();
  }

  /**
   * Send a text message to a room
   */
  async sendMessage(roomId: string, body: string): Promise<{ event_id: string }> {
    const txnId = `m${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;
    
    const res = await fetch(
      `${this.baseUrl}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`,
      {
        method: 'PUT',
        headers: this.authHeaders(),
        body: JSON.stringify({
          msgtype: 'm.text',
          body: body
        })
      }
    );

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to send message');
    }

    return res.json();
  }

  /**
   * Perform initial sync to get sync token
   */
  async initialSync(): Promise<MatrixSyncResponse> {
    const params = new URLSearchParams({
      timeout: '0',
      filter: JSON.stringify({
        room: {
          timeline: { limit: 1 },
          state: { lazy_load_members: true }
        }
      })
    });

    const res = await fetch(
      `${this.baseUrl}/_matrix/client/v3/sync?${params}`,
      { headers: this.authHeaders() }
    );

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to sync');
    }

    const data = await res.json();
    this.syncToken = data.next_batch;
    return data;
  }

  /**
   * Start long-polling for new messages
   */
  startSync(onMessage: (message: ChatMessage) => void): void {
    this.onMessageCallback = onMessage;
    this.isSyncing = true;
    this.syncLoop();
  }

  /**
   * Stop syncing
   */
  stopSync(): void {
    this.isSyncing = false;
    if (this.syncAbortController) {
      this.syncAbortController.abort();
      this.syncAbortController = null;
    }
  }

  private async syncLoop(): Promise<void> {
    while (this.isSyncing) {
      try {
        this.syncAbortController = new AbortController();
        
        const params = new URLSearchParams({
          timeout: '30000',
          filter: JSON.stringify({
            room: {
              timeline: { limit: 50 },
              state: { lazy_load_members: true }
            }
          })
        });
        
        if (this.syncToken) {
          params.set('since', this.syncToken);
        }

        const res = await fetch(
          `${this.baseUrl}/_matrix/client/v3/sync?${params}`,
          { 
            headers: this.authHeaders(),
            signal: this.syncAbortController.signal
          }
        );

        if (!res.ok) {
          console.error('Sync failed:', await res.text());
          // Wait before retry
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }

        const data: MatrixSyncResponse = await res.json();
        this.syncToken = data.next_batch;

        // Process new messages
        if (data.rooms?.join && this.roomId) {
          const roomData = data.rooms.join[this.roomId];
          if (roomData?.timeline?.events) {
            for (const event of roomData.timeline.events) {
              if (event.type === 'm.room.message' && event.content?.body) {
                const chatMessage = this.mapToChatMessage(event);
                this.onMessageCallback?.(chatMessage);
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Sync was stopped
          break;
        }
        console.error('Sync error:', error);
        // Wait before retry
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }

  /**
   * Map Matrix event to ChatMessage
   */
  mapToChatMessage(event: MatrixMessage): ChatMessage {
    // Extract display name from Matrix user ID
    // @daarion_abc123:daarion.space -> User abc123
    const senderName = event.sender
      .split(':')[0]
      .replace('@daarion_', 'User ')
      .replace('@', '');

    return {
      id: event.event_id,
      senderId: event.sender,
      senderName: senderName,
      text: event.content.body,
      timestamp: new Date(event.origin_server_ts),
      isUser: event.sender === this.userId
    };
  }

  /**
   * Get current user ID
   */
  getUserId(): string {
    return this.userId;
  }
}

/**
 * Create a Matrix client from bootstrap data
 */
export function createMatrixClient(bootstrap: {
  matrix_hs_url: string;
  matrix_user_id: string;
  matrix_access_token: string;
  matrix_room_id: string;
}): MatrixRestClient {
  return new MatrixRestClient({
    baseUrl: bootstrap.matrix_hs_url,
    accessToken: bootstrap.matrix_access_token,
    userId: bootstrap.matrix_user_id,
    roomId: bootstrap.matrix_room_id
  });
}

