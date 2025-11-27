/**
 * CityPage Component
 * 
 * Головна сторінка City Dashboard з real-time оновленнями
 */

import { useState, useCallback } from 'react';
import { useCityData } from './hooks/useCityData';
import { useCityWebSocket } from './hooks/useCityWebSocket';
import { CityLayout } from './components/CityLayout';
import type { CitySnapshot } from './types/city';

export function CityPage() {
  const { data: initialData, loading, error } = useCityData();
  const [data, setData] = useState<CitySnapshot | null>(initialData);

  // WebSocket для live оновлень
  const { isConnected: cityConnected } = useCityWebSocket({
    channel: 'city',
    onMessage: useCallback((message) => {
      if (message.type === 'city_update' && message.data && data) {
        // Merge live updates з існуючими даними
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            metrics: {
              ...prev.metrics,
              ...message.data.metrics,
            },
          };
        });
      }
    }, [data]),
  });

  const { isConnected: eventsConnected } = useCityWebSocket({
    channel: 'events',
    onMessage: useCallback((message) => {
      if (message.type === 'city_event' && message.event && data) {
        // Додати нову подію до списку
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            events: [message.event, ...prev.events].slice(0, 10), // Тримати останні 10
          };
        });
      }
    }, [data]),
  });

  // Sync initialData з data при завантаженні
  useState(() => {
    if (initialData) {
      setData(initialData);
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-cyan-100">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🏙️</div>
          <div className="text-xl font-semibold">Loading DAARION City...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-red-300">
        <div className="text-6xl mb-4">⚠️</div>
        <p className="text-xl font-semibold mb-2">Failed to load DAARION City</p>
        <pre className="text-sm opacity-70 bg-slate-900/50 p-4 rounded-lg max-w-md">
          {error?.message || 'Unknown error'}
        </pre>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Live indicator */}
      {(cityConnected || eventsConnected) && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/30 backdrop-blur">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-medium text-green-300">Live</span>
        </div>
      )}
      
      <CityLayout snapshot={data} />
    </div>
  );
}

