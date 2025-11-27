/**
 * Living Map Full Hook
 * Phase 9A: Connects to living-map-service
 */
import { useState, useEffect, useRef } from 'react';

const API_URL = 'http://localhost:7017/living-map';
const WS_URL = 'ws://localhost:7017/living-map/stream';

export interface LivingMapSnapshot {
  generated_at: string;
  layers: {
    city: any;
    space: any;
    nodes: any;
    agents: any;
  };
  meta: {
    source_services: string[];
    generated_at: string;
    version: string;
  };
}

export interface UseLivingMapFullResult {
  snapshot: LivingMapSnapshot | null;
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'connecting' | 'open' | 'closed' | 'error';
  refetch: () => Promise<void>;
}

export function useLivingMapFull(): UseLivingMapFullResult {
  const [snapshot, setSnapshot] = useState<LivingMapSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'open' | 'closed' | 'error'>('connecting');
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch initial snapshot
  const fetchSnapshot = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/snapshot`);
      if (!response.ok) {
        throw new Error(`Failed to fetch snapshot: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSnapshot(data);
    } catch (err) {
      setError((err as Error).message);
      console.error('Failed to fetch Living Map snapshot:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Connect to WebSocket
  const connectWebSocket = () => {
    try {
      setConnectionStatus('connecting');
      const ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        console.log('✅ Living Map WebSocket connected');
        setConnectionStatus('open');
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.kind === 'snapshot') {
            setSnapshot(message.data);
          } else if (message.kind === 'event') {
            // Update snapshot based on event
            // For MVP, just refetch
            console.log('📥 Event received:', message.event_type);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('error');
      };
      
      ws.onclose = () => {
        console.log('🔌 WebSocket closed');
        setConnectionStatus('closed');
        
        // Attempt reconnect after 5 seconds
        setTimeout(() => {
          if (wsRef.current === ws) {
            connectWebSocket();
          }
        }, 5000);
      };
      
      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
      setConnectionStatus('error');
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchSnapshot();
    
    // Connect WebSocket
    connectWebSocket();
    
    // Cleanup
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return {
    snapshot,
    isLoading,
    error,
    connectionStatus,
    refetch: fetchSnapshot
  };
}

