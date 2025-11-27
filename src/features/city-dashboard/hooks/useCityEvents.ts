/**
 * useCityEvents Hook
 *
 * Реальний/моковий стрім подій міста з fallback на poll
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CityEvent, UseCityEventsResult } from '../types/city';
import { ApiError } from '../../../api/client';
import { fetchCityEventsSnapshot, buildMockEvent } from '../../../api/city';

export function useCityEvents(): UseCityEventsResult {
  const [events, setEvents] = useState<CityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const pushEvent = useCallback((event: CityEvent) => {
    setEvents((prev) => {
      const next = [event, ...prev].slice(0, 50);
      return next;
    });
  }, []);

  const fetchEventsSnapshot = useCallback(async () => {
    try {
      const data = await fetchCityEventsSnapshot();
      if (data?.items?.length) {
        setEvents(data.items.slice(0, 50));
      } else {
        setEvents([buildMockEvent('Місто працює в офлайн-режимі')]);
      }
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 0)) {
        setError(err instanceof Error ? err.message : 'Не вдалося завантажити події');
      } else {
        setEvents([buildMockEvent('WS недоступний, показуємо останні дані')]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const connect = useCallback(() => {
    try {
      const wsUrl =
        import.meta.env.VITE_EVENTS_WS_URL || 'ws://localhost:3000/ws/city/events';
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;
      setIsConnected(true);

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as CityEvent;
          if (data?.id) {
            pushEvent(data);
          }
        } catch (parseErr) {
          console.error('Failed to parse WS event', parseErr);
        }
      };

      socket.onerror = () => {
        setError('WebSocket помилка, переключаємося на fallback');
      };

      socket.onclose = () => {
        setIsConnected(false);
      };
    } catch (err) {
      setError('Не вдалося підключитись до WebSocket');
      setIsConnected(false);
    }
  }, [pushEvent]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  useEffect(() => {
    fetchEventsSnapshot();

    connect();

    // Fallback polling якщо WS недоступний
    pollIntervalRef.current = setInterval(() => {
      if (!isConnected) {
        // Генеруємо псевдо-подію
        pushEvent(buildMockEvent('Fallback heartbeat'));
      }
    }, 15_000);

    return () => {
      disconnect();
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [connect, disconnect, fetchEventsSnapshot, isConnected, pushEvent]);

  return {
    events,
    loading,
    error,
    isConnected,
    connect,
    disconnect,
  };
}

