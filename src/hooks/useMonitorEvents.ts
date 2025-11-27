import { useEffect, useState, useRef } from 'react';
import { addMonitorEventToBatch } from '../api/monitorMemory';

export interface MonitorEvent {
  timestamp: string;
  type: 'agent' | 'node' | 'system' | 'project';
  action: string;
  message: string;
  details?: Record<string, unknown>;
  node_id?: string; // Додаємо node_id для збереження в пам'ять
}

export function useMonitorEvents() {
  const [events, setEvents] = useState<MonitorEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const connect = () => {
      try {
        // Використовуємо ws:// для localhost
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/events`;
        
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('Monitor WebSocket connected');
          setIsConnected(true);
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        };

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            const monitorEvent: MonitorEvent = {
              timestamp: data.timestamp || new Date().toISOString(),
              type: data.type || 'system',
              action: data.action || 'unknown',
              message: data.message || 'No message',
              details: data.details,
              node_id: data.node_id || data.details?.node_id || 'unknown',
            };
            
            setEvents((prev) => {
              // Додаємо нову подію на початок (останні події зверху)
              const newEvents = [monitorEvent, ...prev];
              // Зберігаємо максимум 100 подій
              return newEvents.slice(0, 100);
            });

            // Автоматичне збереження в Memory Service (батчинг)
            try {
              const nodeId = monitorEvent.node_id || 'unknown';
              const eventKind = monitorEvent.type === 'node' ? 'node_event' :
                               monitorEvent.type === 'agent' ? 'agent_event' :
                               monitorEvent.type === 'project' ? 'project_event' :
                               'system_event';

              await addMonitorEventToBatch(nodeId, {
                team_id: 'system',
                scope: 'long_term',
                kind: eventKind,
                body_text: monitorEvent.message,
                body_json: {
                  action: monitorEvent.action,
                  type: monitorEvent.type,
                  timestamp: monitorEvent.timestamp,
                  ...monitorEvent.details,
                },
              });
            } catch (memoryError) {
              console.warn('Failed to save event to memory:', memoryError);
              // Продовжуємо роботу навіть якщо збереження не вдалося
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('Monitor WebSocket error:', error);
          setIsConnected(false);
        };

        ws.onclose = () => {
          console.log('Monitor WebSocket disconnected');
          setIsConnected(false);
          
          // Автоматичне переподключення через 3 секунди
          if (!reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = null;
              connect();
            }, 3000);
          }
        };

        wsRef.current = ws;
        // Зберігаємо WebSocket в window для projectLogger
        if (typeof window !== 'undefined') {
          window.monitorWebSocket = ws;
        }
      } catch (error) {
        console.error('Error connecting to Monitor WebSocket:', error);
        setIsConnected(false);
        
        // Fallback: спроба переподключення через 5 секунд
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, 5000);
        }
      }
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, []);

  return { events, isConnected };
}

