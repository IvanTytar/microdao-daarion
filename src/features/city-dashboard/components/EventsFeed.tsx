/**
 * EventsFeed Component
 *
 * Живий стрім подій міста з WebSocket/fallback
 */

import type { CityEvent } from '../types/city';

interface EventsFeedProps {
  events: CityEvent[];
  loading?: boolean;
  error?: string | null;
  isConnected?: boolean;
  onReconnect?: () => void;
}

const ICON_MAP: Record<CityEvent['type'], string> = {
  'microdao_created': '🏛️',
  'agent_deployed': '🤖',
  'node_joined': '🖥️',
  'node_left': '⚠️',
  'transaction_completed': '💸',
  'quest_completed': '🧭',
  'alert_triggered': '🚨',
  'metrics.raw.*': '📊',
  'metrics.node.*': '📈',
  'metrics.microdao.*': '🏘️',
  'metrics.global.*': '🌐',
  'alerts.*': '🚨',
  'metrics.reconciled.*': '🧮',
  'alerts.reconciler.*': '🕵🏻',
};

const PRIORITY_COLOR: Record<CityEvent['priority'], string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-yellow-100 text-yellow-800',
  critical: 'bg-red-100 text-red-800',
};

export function EventsFeed({
  events,
  loading = false,
  error,
  isConnected = false,
  onReconnect,
}: EventsFeedProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">📡 Події міста</h2>
          <p className="text-gray-600 text-sm">
            Останні події з DAARION.city (WebSocket {isConnected ? 'online' : 'offline'})
          </p>
        </div>
        {!isConnected && onReconnect && (
          <button
            onClick={onReconnect}
            className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Підключити WS ↻
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          {error}
        </div>
      )}

      {loading && events.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
          {events.map((event) => (
            <div
              key={event.id}
              className="border border-gray-100 rounded-lg p-4 hover:border-blue-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">
                    {ICON_MAP[event.type] || '✨'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{event.title}</h4>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          PRIORITY_COLOR[event.priority]
                        }`}
                      >
                        {event.priority === 'critical'
                          ? 'Критично'
                          : event.priority === 'high'
                          ? 'Високий'
                          : event.priority === 'medium'
                          ? 'Середній'
                          : 'Низький'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {event.description}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(event.timestamp).toLocaleTimeString('uk-UA', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              {event.data && Object.keys(event.data).length > 0 && (
                <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg p-2 grid grid-cols-2 gap-2">
                  {Object.entries(event.data).map(([key, value]) => (
                    <div key={key}>
                      <span className="uppercase text-gray-400 mr-1">{key}:</span>
                      <span className="text-gray-700">
                        {typeof value === 'string' ? value : JSON.stringify(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

