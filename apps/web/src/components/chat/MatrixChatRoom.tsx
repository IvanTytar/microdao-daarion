'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { MessageSquare, Wifi, WifiOff, Loader2, RefreshCw, AlertCircle, Users } from 'lucide-react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { MatrixRestClient, createMatrixClient, ChatMessage as MatrixChatMessage, PresenceEvent } from '@/lib/matrix-client'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { getAccessToken } from '@/lib/auth'

interface MatrixChatRoomProps {
  roomSlug: string
}

type ConnectionStatus = 'loading' | 'connecting' | 'online' | 'error' | 'unauthenticated'

interface BootstrapData {
  matrix_hs_url: string
  matrix_user_id: string
  matrix_access_token: string
  matrix_device_id: string
  matrix_room_id: string
  matrix_room_alias: string
  room: {
    id: string
    slug: string
    name: string
    description?: string
  }
}

// Helper to format user name from Matrix ID
function formatUserName(userId: string): string {
  return userId
    .split(':')[0]
    .replace('@daarion_', 'User ')
    .replace('@', '');
}

export function MatrixChatRoom({ roomSlug }: MatrixChatRoomProps) {
  const { user } = useAuth()
  const token = getAccessToken()
  const [messages, setMessages] = useState<MatrixChatMessage[]>([])
  const [status, setStatus] = useState<ConnectionStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const matrixClient = useRef<MatrixRestClient | null>(null)
  
  // Presence & Typing state
  const [onlineUsers, setOnlineUsers] = useState<Map<string, 'online' | 'offline' | 'unavailable'>>(new Map())
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Initialize Matrix connection
  const initializeMatrix = useCallback(async () => {
    if (!token) {
      setStatus('unauthenticated')
      return
    }

    setStatus('loading')
    setError(null)

    try {
      // 1. Get bootstrap data
      const res = await fetch(`/api/city/chat/bootstrap?room_slug=${roomSlug}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to get chat bootstrap')
      }

      const data: BootstrapData = await res.json()
      setBootstrap(data)

      // 2. Create Matrix client
      setStatus('connecting')
      const client = createMatrixClient(data)
      matrixClient.current = client

      // 3. Join room
      try {
        await client.joinRoom(data.matrix_room_id)
      } catch (e) {
        // Ignore join errors (might already be in room)
        console.log('Join room result:', e)
      }

      // 4. Get initial messages
      const messagesRes = await client.getMessages(data.matrix_room_id, { limit: 50 })
      const initialMessages = messagesRes.chunk
        .filter(e => e.type === 'm.room.message' && e.content?.body)
        .map(e => client.mapToChatMessage(e))
        .reverse() // Oldest first

      setMessages(initialMessages)

      // 5. Set up presence and typing handlers
      client.onPresence = (event: PresenceEvent) => {
        if (!event.sender || !event.content?.presence) return;
        
        setOnlineUsers(prev => {
          const next = new Map(prev);
          next.set(event.sender, event.content.presence);
          return next;
        });
      };
      
      client.onTyping = (roomId: string, userIds: string[]) => {
        if (roomId !== data.matrix_room_id) return;
        
        // Filter out current user
        const others = userIds.filter(id => id !== data.matrix_user_id);
        setTypingUsers(new Set(others));
      };

      // 6. Start sync for real-time updates
      await client.initialSync()
      client.startSync((newMessage) => {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === newMessage.id)) {
            return prev
          }
          return [...prev, newMessage]
        })
      })

      setStatus('online')
    } catch (err) {
      console.error('Matrix initialization error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
    }
  }, [token, roomSlug])

  useEffect(() => {
    initializeMatrix()

    return () => {
      if (matrixClient.current) {
        matrixClient.current.onPresence = undefined;
        matrixClient.current.onTyping = undefined;
        matrixClient.current.stopSync();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, [initializeMatrix])
  
  // Calculate online count
  const onlineCount = useMemo(() => {
    let count = 0;
    onlineUsers.forEach((status, userId) => {
      if (status === 'online' || status === 'unavailable') {
        // Don't count current user
        if (userId !== bootstrap?.matrix_user_id) {
          count++;
        }
      }
    });
    return count;
  }, [onlineUsers, bootstrap]);
  
  // Handle typing notification
  const handleTyping = useCallback(() => {
    if (!matrixClient.current || !bootstrap) return;
    
    // Send typing notification
    matrixClient.current.sendTyping(bootstrap.matrix_room_id, true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (matrixClient.current && bootstrap) {
        matrixClient.current.sendTyping(bootstrap.matrix_room_id, false);
      }
    }, 3000);
  }, [bootstrap]);

  const handleSendMessage = async (body: string) => {
    if (!matrixClient.current || !bootstrap) return

    try {
      // Stop typing indicator
      matrixClient.current.sendTyping(bootstrap.matrix_room_id, false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Optimistically add message
      const tempId = `temp_${Date.now()}`
      const tempMessage: MatrixChatMessage = {
        id: tempId,
        senderId: bootstrap.matrix_user_id,
        senderName: 'You',
        text: body,
        timestamp: new Date(),
        isUser: true
      }
      setMessages(prev => [...prev, tempMessage])

      // Send to Matrix
      const result = await matrixClient.current.sendMessage(bootstrap.matrix_room_id, body)
      
      // Update temp message with real ID
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, id: result.event_id } : m
      ))
    } catch (err) {
      console.error('Failed to send message:', err)
      // Remove failed message
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp_')))
      setError('Не вдалося надіслати повідомлення')
    }
  }

  const handleRetry = () => {
    initializeMatrix()
  }

  // Map MatrixChatMessage to legacy format for ChatMessage component
  const mapToLegacyFormat = (msg: MatrixChatMessage) => ({
    id: msg.id,
    room_id: bootstrap?.room.id || '',
    author_user_id: msg.isUser ? 'current_user' : msg.senderId,
    author_agent_id: null,
    body: msg.text,
    created_at: msg.timestamp.toISOString()
  })

  return (
    <div className="flex flex-col h-full">
      {/* Connection status */}
      <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-white">
            {bootstrap?.room.name || 'Matrix Chat'}
          </span>
          {status === 'online' && (
            <>
              <span className="text-slate-500">·</span>
              <div className="flex items-center gap-1 text-emerald-400 text-xs">
                <Users className="w-3 h-3" />
                <span>{onlineCount} online</span>
              </div>
            </>
          )}
        </div>
        
        <div className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
          status === 'loading' && 'bg-slate-500/20 text-slate-400',
          status === 'connecting' && 'bg-amber-500/20 text-amber-400',
          status === 'online' && 'bg-emerald-500/20 text-emerald-400',
          status === 'error' && 'bg-red-500/20 text-red-400',
          status === 'unauthenticated' && 'bg-amber-500/20 text-amber-400'
        )}>
          {status === 'loading' && (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Завантаження...</span>
            </>
          )}
          {status === 'connecting' && (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Підключення до Matrix...</span>
            </>
          )}
          {status === 'online' && (
            <>
              <Wifi className="w-3 h-3" />
              <span>Онлайн</span>
            </>
          )}
          {status === 'error' && (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Помилка</span>
            </>
          )}
          {status === 'unauthenticated' && (
            <>
              <AlertCircle className="w-3 h-3" />
              <span>Потрібен вхід</span>
            </>
          )}
        </div>
      </div>

      {/* Error / Auth required message */}
      {(status === 'error' || status === 'unauthenticated') && (
        <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span>
                {status === 'unauthenticated' 
                  ? 'Увійдіть, щоб приєднатися до чату'
                  : error || 'Помилка підключення'
                }
              </span>
            </div>
            {status === 'error' && (
              <button
                onClick={handleRetry}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-full transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Повторити
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              {status === 'online' 
                ? 'Поки що немає повідомлень'
                : status === 'unauthenticated'
                  ? 'Увійдіть для доступу до чату'
                  : 'Підключення до Matrix...'
              }
            </h3>
            <p className="text-sm text-slate-400 max-w-sm">
              {status === 'online' 
                ? 'Будьте першим, хто напише в цій кімнаті! Ваше повідомлення синхронізується з Matrix.'
                : status === 'unauthenticated'
                  ? 'Для участі в чаті потрібна авторизація'
                  : 'Встановлюємо зʼєднання з Matrix сервером...'
              }
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={mapToLegacyFormat(message)}
                isOwn={message.isUser}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Typing indicator */}
      {typingUsers.size > 0 && (
        <div className="px-4 py-1.5 text-sm text-cyan-400/80 animate-pulse flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span>
            {typingUsers.size === 1 
              ? `${formatUserName(Array.from(typingUsers)[0])} друкує...`
              : 'Декілька учасників друкують...'}
          </span>
        </div>
      )}

      {/* Input area */}
      <ChatInput
        onSend={handleSendMessage}
        onTyping={handleTyping}
        disabled={status !== 'online'}
        placeholder={
          status === 'online' 
            ? 'Напишіть повідомлення...' 
            : status === 'unauthenticated'
              ? 'Увійдіть для надсилання повідомлень'
              : 'Очікування підключення...'
        }
      />
    </div>
  )
}

