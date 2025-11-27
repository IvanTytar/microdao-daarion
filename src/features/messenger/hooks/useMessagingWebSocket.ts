import { useEffect, useState, useCallback, useRef } from 'react';
import type { Message, WebSocketMessage } from '../types/messenger';

interface UseMessagingWebSocketReturn {
  messages: Message[];
  isConnected: boolean;
  error: Error | null;
}

export function useMessagingWebSocket(channelId: string): UseMessagingWebSocketReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // already connected
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/messaging/${channelId}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`[Messenger WS] Connected to channel ${channelId}`);
        setIsConnected(true);
        setError(null);

        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          if (event.data === 'pong') {
            return; // ignore pong
          }

          const data: WebSocketMessage = JSON.parse(event.data);

          if (data.type === 'message.created' && data.message) {
            setMessages((prev) => [data.message!, ...prev]);
          }
        } catch (err) {
          console.error('[Messenger WS] Failed to parse message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('[Messenger WS] Error:', event);
        setError(new Error('WebSocket error'));
      };

      ws.onclose = () => {
        console.log('[Messenger WS] Disconnected');
        setIsConnected(false);

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Attempt reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[Messenger WS] Reconnecting...');
          connect();
        }, 3000);
      };
    } catch (err) {
      console.error('[Messenger WS] Failed to connect:', err);
      setError(err as Error);
    }
  }, [channelId]);

  useEffect(() => {
    connect();

    return () => {
      // Cleanup on unmount
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };
  }, [connect]);

  return { messages, isConnected, error };
}





