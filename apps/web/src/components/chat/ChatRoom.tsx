'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageSquare, Wifi, WifiOff, Loader2 } from 'lucide-react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { getWSClient, type ChatMessage as ChatMessageType } from '@/lib/websocket'
import { cn } from '@/lib/utils'

interface ChatRoomProps {
  roomId: string
  roomSlug: string
  initialMessages?: ChatMessageType[]
}

export function ChatRoom({ roomId, roomSlug, initialMessages = [] }: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>(initialMessages)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsClient = useRef(getWSClient())

  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Connect to WebSocket
  useEffect(() => {
    const client = wsClient.current
    
    // Handle new messages
    const unsubMessage = client.onMessage((message) => {
      setMessages(prev => [...prev, message])
    })

    // Handle connection events
    const unsubEvent = client.onEvent((event) => {
      if (event.event === 'room.join' || event.event === 'connected') {
        setIsConnected(true)
        setIsConnecting(false)
      } else if (event.event === 'room.leave' || event.event === 'disconnected') {
        setIsConnected(false)
      }
    })

    // Connect to room
    client.connect(roomSlug)

    // Check connection status periodically
    const checkConnection = setInterval(() => {
      setIsConnected(client.isConnected)
      if (client.isConnected) {
        setIsConnecting(false)
      }
    }, 1000)

    // Timeout for initial connection
    const connectionTimeout = setTimeout(() => {
      setIsConnecting(false)
    }, 5000)

    return () => {
      unsubMessage()
      unsubEvent()
      clearInterval(checkConnection)
      clearTimeout(connectionTimeout)
      client.disconnect()
    }
  }, [roomSlug])

  const handleSendMessage = (body: string) => {
    wsClient.current.sendMessage(body)
    
    // Optimistically add message (will be replaced by server response)
    const tempMessage: ChatMessageType = {
      id: `temp_${Date.now()}`,
      room_id: roomId,
      author_user_id: 'u_current_user', // TODO: Get from auth
      author_agent_id: null,
      body,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempMessage])
  }

  return (
    <div className="flex flex-col h-full">
      {/* Connection status */}
      <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-white">Чат кімнати</span>
        </div>
        
        <div className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
          isConnecting && 'bg-amber-500/20 text-amber-400',
          isConnected && 'bg-emerald-500/20 text-emerald-400',
          !isConnected && !isConnecting && 'bg-red-500/20 text-red-400'
        )}>
          {isConnecting ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Підключення...</span>
            </>
          ) : isConnected ? (
            <>
              <Wifi className="w-3 h-3" />
              <span>Онлайн</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Офлайн</span>
            </>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              Поки що немає повідомлень
            </h3>
            <p className="text-sm text-slate-400 max-w-sm">
              Будьте першим, хто напише в цій кімнаті! Ваше повідомлення побачать всі учасники.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isOwn={message.author_user_id === 'u_current_user'} // TODO: Get from auth
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <ChatInput
        onSend={handleSendMessage}
        disabled={!isConnected}
        placeholder={isConnected ? 'Напишіть повідомлення...' : 'Очікування підключення...'}
      />
    </div>
  )
}

