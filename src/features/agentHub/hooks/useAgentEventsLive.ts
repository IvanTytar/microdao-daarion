/**
 * useAgentEventsLive Hook
 * Phase 6: WebSocket live events
 */
import { useState, useEffect, useRef } from 'react';
import { connectAgentEventsWebSocket, type AgentEvent } from '@/api/agents';

interface UseAgentEventsLiveResult {
  events: AgentEvent[];
  connected: boolean;
  error: string | null;
}

export function useAgentEventsLive(
  agentId: string | null,
  maxEvents: number = 50
): UseAgentEventsLiveResult {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    try {
      const ws = connectAgentEventsWebSocket(
        agentId,
        (event) => {
          // Add new event to the top of the list
          setEvents((prev) => {
            const newEvents = [event, ...prev];
            // Keep only maxEvents
            return newEvents.slice(0, maxEvents);
          });
        },
        (err) => {
          console.error('WebSocket error:', err);
          setError('WebSocket connection failed');
          setConnected(false);
        }
      );
      
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setConnected(true);
        setError(null);
      };
      
      ws.onclose = () => {
        console.log('❌ WebSocket disconnected');
        setConnected(false);
      };
    } catch (err) {
      console.error('Failed to connect to WebSocket:', err);
      setError('Failed to connect');
    }

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [agentId, maxEvents]);

  return {
    events,
    connected,
    error,
  };
}

