/**
 * useCityWebSocket Hook
 * 
 * WebSocket підключення для real-time оновлень City Dashboard
 */

import { useEffect, useState, useCallback, useRef } from 'react';

export type CityWebSocketChannel = 'city' | 'events' | 'metrics' | 'agents';

interface WebSocketMessage {
  type: string;
  timestamp: string;
  data?: any;
  event?: any;
  metrics?: any;
  agents?: any;
}

interface UseCityWebSocketOptions {
  channel: CityWebSocketChannel;
  url?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  onMessage?: (message: WebSocketMessage) => void;
}

export function useCityWebSocket(options: UseCityWebSocketOptions) {
  const {
    channel,
    url = `ws://localhost:7001/ws/${channel}`,
    autoReconnect = true,
    reconnectInterval = 5000,
    onMessage,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log(`[WS] Connected to ${channel}`);
        setIsConnected(true);
        setError(null);

        // Send ping every 30 seconds to keep connection alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 30000);

        ws.addEventListener('close', () => {
          clearInterval(pingInterval);
        });
      };

      ws.onmessage = (event) => {
        try {
          if (event.data === 'pong') return;

          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          onMessage?.(message);
        } catch (err) {
          console.error('[WS] Failed to parse message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('[WS] Error:', event);
        setError('WebSocket connection error');
      };

      ws.onclose = () => {
        console.log(`[WS] Disconnected from ${channel}`);
        setIsConnected(false);

        if (autoReconnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[WS] Reconnecting...');
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WS] Connection failed:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  }, [url, channel, autoReconnect, reconnectInterval, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    error,
    connect,
    disconnect,
  };
}




