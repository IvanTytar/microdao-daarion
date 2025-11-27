/**
 * CityEventsFeed Component
 * 
 * Фід останніх подій міста
 */

import type { CityEvent } from '../types/city';

interface CityEventsFeedProps {
  events: CityEvent[];
}

function EventItem({ event }: { event: CityEvent }) {
  const typeIcons = {
    dao: '🏛️',
    node: '🖥️',
    matrix: '💬',
    quest: '🎯',
    system: '⚙️',
  };

  const severityColors = {
    info: 'text-cyan-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
  };

  return (
    <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors">
      <div className="text-lg">{typeIcons[event.type]}</div>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-medium ${severityColors[event.severity]}`}>
          [{event.type}]
        </div>
        <div className="text-sm text-white truncate">{event.label}</div>
        <div className="text-xs text-gray-500">
          {new Date(event.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

export function CityEventsFeed({ events }: CityEventsFeedProps) {
  const recentEvents = events.slice(0, 8);

  return (
    <div className="h-full rounded-2xl border border-white/10 bg-slate-900/40 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-white/90">
          City Event Feed
        </h3>
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      </div>

      {recentEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32">
          <div className="text-3xl mb-2">📡</div>
          <p className="text-sm text-gray-400 text-center">No recent events</p>
        </div>
      ) : (
        <div className="space-y-1 max-h-[160px] overflow-y-auto pr-2">
          {recentEvents.map((event) => (
            <EventItem key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}





