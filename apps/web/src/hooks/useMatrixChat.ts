import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MatrixRestClient, createMatrixClient, ChatMessage as MatrixChatMessage, PresenceEvent } from '@/lib/matrix-client';
import { useAuth } from '@/context/AuthContext';
import { getAccessToken } from '@/lib/auth';
import { usePresenceHeartbeat } from '@/hooks/usePresenceHeartbeat';

export type ConnectionStatus = 'loading' | 'connecting' | 'online' | 'error' | 'unauthenticated';

interface BootstrapData {
  matrix_hs_url: string;
  matrix_user_id: string;
  matrix_access_token: string;
  matrix_device_id: string;
  matrix_room_id: string;
  matrix_room_alias: string;
  room: {
    id: string;
    slug: string;
    name: string;
    description?: string;
  };
}

export function useMatrixChat(roomSlug: string) {
  const { user } = useAuth();
  const token = getAccessToken();
  const [messages, setMessages] = useState<MatrixChatMessage[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const matrixClient = useRef<MatrixRestClient | null>(null);
  
  // Presence & Typing state
  const [onlineUsers, setOnlineUsers] = useState<Map<string, 'online' | 'offline' | 'unavailable'>>(new Map());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Presence heartbeat
  usePresenceHeartbeat({
    matrixUserId: bootstrap?.matrix_user_id ?? null,
    accessToken: bootstrap?.matrix_access_token ?? null,
    intervalMs: 30000,
    awayAfterMs: 5 * 60 * 1000,
    enabled: status === 'online',
  });

  const initializeMatrix = useCallback(async () => {
    if (!token) {
      setStatus('unauthenticated');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      // 1. Get bootstrap data
      const res = await fetch(`/api/city/chat/bootstrap?room_slug=${roomSlug}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to get chat bootstrap');
      }

      const data: BootstrapData = await res.json();
      setBootstrap(data);

      // 2. Create Matrix client
      setStatus('connecting');
      const client = createMatrixClient(data);
      matrixClient.current = client;

      // 3. Join room
      try {
        await client.joinRoom(data.matrix_room_id);
      } catch (e) {
        console.log('Join room result:', e);
      }

      // 4. Get initial messages
      const messagesRes = await client.getMessages(data.matrix_room_id, { limit: 50 });
      const initialMessages = messagesRes.chunk
        .filter((e: any) => e.type === 'm.room.message' && e.content?.body)
        .map((e: any) => client.mapToChatMessage(e))
        .reverse();

      setMessages(initialMessages);

      // 5. Set up handlers
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
        const others = userIds.filter(id => id !== data.matrix_user_id);
        setTypingUsers(new Set(others));
      };

      // 6. Start sync
      await client.initialSync();
      client.startSync((newMessage: MatrixChatMessage) => {
        setMessages(prev => {
          if (prev.some(m => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
      });

      setStatus('online');
    } catch (err) {
      console.error('Matrix initialization error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  }, [token, roomSlug]);

  useEffect(() => {
    initializeMatrix();

    return () => {
      if (matrixClient.current) {
        matrixClient.current.onPresence = undefined;
        matrixClient.current.onTyping = undefined;
        matrixClient.current.stopSync();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [initializeMatrix]);

  const onlineCount = useMemo(() => {
    let count = 0;
    onlineUsers.forEach((status, userId) => {
      if (status === 'online' || status === 'unavailable') {
        if (userId !== bootstrap?.matrix_user_id) {
          count++;
        }
      }
    });
    return count;
  }, [onlineUsers, bootstrap]);

  const handleTyping = useCallback(() => {
    if (!matrixClient.current || !bootstrap) return;
    
    matrixClient.current.sendTyping(bootstrap.matrix_room_id, true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      if (matrixClient.current && bootstrap) {
        matrixClient.current.sendTyping(bootstrap.matrix_room_id, false);
      }
    }, 3000);
  }, [bootstrap]);

  const sendMessage = async (body: string) => {
    if (!matrixClient.current || !bootstrap) return;

    try {
      matrixClient.current.sendTyping(bootstrap.matrix_room_id, false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      const tempId = `temp_${Date.now()}`;
      const tempMessage: MatrixChatMessage = {
        id: tempId,
        senderId: bootstrap.matrix_user_id,
        senderName: 'You',
        text: body,
        timestamp: new Date(),
        isUser: true
      };
      setMessages(prev => [...prev, tempMessage]);

      const result = await matrixClient.current.sendMessage(bootstrap.matrix_room_id, body);
      
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, id: result.event_id } : m
      ));
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp_')));
      throw err;
    }
  };

  return {
    messages,
    status,
    error,
    roomName: bootstrap?.room.name,
    onlineCount,
    typingUsers,
    sendMessage,
    handleTyping,
    retry: initializeMatrix
  };
}

