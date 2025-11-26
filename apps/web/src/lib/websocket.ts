'use client'

/**
 * WebSocket client for DAARION City Rooms chat
 */

export interface ChatMessage {
  id: string
  room_id: string
  author_user_id: string | null
  author_agent_id: string | null
  body: string
  created_at: string
}

export interface WSEvent {
  event: string
  room_id?: string
  user_id?: string
  message?: ChatMessage
  status?: string
  data?: unknown
}

type MessageHandler = (message: ChatMessage) => void
type EventHandler = (event: WSEvent) => void

class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private roomId: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private messageHandlers: Set<MessageHandler> = new Set()
  private eventHandlers: Set<EventHandler> = new Set()
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor() {
    // Use wss:// for production, ws:// for development
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000'
    this.url = `${protocol}//${host}/ws/city/rooms`
  }

  connect(roomId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN && this.roomId === roomId) {
      return // Already connected to this room
    }

    this.roomId = roomId
    this.disconnect() // Close existing connection

    try {
      this.ws = new WebSocket(`${this.url}/${roomId}`)
      
      this.ws.onopen = () => {
        console.log(`[WS] Connected to room: ${roomId}`)
        this.reconnectAttempts = 0
        this.startHeartbeat()
        
        // Join room
        this.send({
          event: 'room.join',
          room_id: roomId
        })
      }

      this.ws.onmessage = (event) => {
        try {
          const data: WSEvent = JSON.parse(event.data)
          this.handleEvent(data)
        } catch (err) {
          console.error('[WS] Failed to parse message:', err)
        }
      }

      this.ws.onclose = (event) => {
        console.log(`[WS] Disconnected: ${event.code} ${event.reason}`)
        this.stopHeartbeat()
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = (error) => {
        console.error('[WS] Error:', error)
      }
    } catch (err) {
      console.error('[WS] Failed to connect:', err)
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.stopHeartbeat()
      
      if (this.roomId) {
        this.send({
          event: 'room.leave',
          room_id: this.roomId
        })
      }
      
      this.ws.close()
      this.ws = null
    }
  }

  send(data: WSEvent): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  sendMessage(body: string): void {
    if (!this.roomId) return
    
    this.send({
      event: 'room.message.send',
      room_id: this.roomId,
      data: { body }
    })
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  onEvent(handler: EventHandler): () => void {
    this.eventHandlers.add(handler)
    return () => this.eventHandlers.delete(handler)
  }

  private handleEvent(event: WSEvent): void {
    // Notify all event handlers
    this.eventHandlers.forEach(handler => handler(event))

    // Handle specific events
    switch (event.event) {
      case 'room.message':
        if (event.message) {
          this.messageHandlers.forEach(handler => handler(event.message!))
        }
        break
      case 'room.join':
        console.log(`[WS] User joined: ${event.user_id}`)
        break
      case 'room.leave':
        console.log(`[WS] User left: ${event.user_id}`)
        break
      case 'presence.update':
        console.log(`[WS] Presence update: ${event.user_id} is ${event.status}`)
        break
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send({ event: 'ping' })
    }, 30000)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
    
    setTimeout(() => {
      if (this.roomId) {
        this.connect(this.roomId)
      }
    }, delay)
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  get currentRoom(): string | null {
    return this.roomId
  }
}

// Singleton instance
let wsClient: WebSocketClient | null = null

export function getWSClient(): WebSocketClient {
  if (!wsClient) {
    wsClient = new WebSocketClient()
  }
  return wsClient
}

