/**
 * AgentEventsPanel Component
 * Phase 6: Display agent events with live updates
 */
import { useEffect } from 'react';
import { useAgentEventsLive } from './hooks/useAgentEventsLive';
import { getAgentEvents, type AgentEvent } from '@/api/agents';
import { useState } from 'react';

interface AgentEventsPanelProps {
  agentId: string;
}

const EVENT_ICONS: Record<string, string> = {
  created: '🎉',
  updated: '✏️',
  deleted: '🗑️',
  activated: '✅',
  deactivated: '❌',
  invocation: '📥',
  reply_sent: '💬',
  tool_call: '🔧',
  model_changed: '🤖',
  tools_changed: '⚙️',
  prompt_changed: '📝',
  error: '❌',
  llm_error: '🚨',
  tool_error: '⚠️',
};

const EVENT_LABELS: Record<string, string> = {
  created: 'Створено',
  updated: 'Оновлено',
  deleted: 'Видалено',
  activated: 'Активовано',
  deactivated: 'Деактивовано',
  invocation: 'Виклик',
  reply_sent: 'Відповідь',
  tool_call: 'Інструмент',
  model_changed: 'Модель змінено',
  tools_changed: 'Інструменти змінено',
  prompt_changed: 'Prompt змінено',
  error: 'Помилка',
  llm_error: 'LLM помилка',
  tool_error: 'Помилка інструменту',
};

const EVENT_COLORS: Record<string, string> = {
  created: 'bg-green-100 text-green-800',
  updated: 'bg-blue-100 text-blue-800',
  deleted: 'bg-red-100 text-red-800',
  activated: 'bg-green-100 text-green-800',
  deactivated: 'bg-gray-100 text-gray-800',
  invocation: 'bg-purple-100 text-purple-800',
  reply_sent: 'bg-blue-100 text-blue-800',
  tool_call: 'bg-orange-100 text-orange-800',
  model_changed: 'bg-blue-100 text-blue-800',
  tools_changed: 'bg-orange-100 text-orange-800',
  prompt_changed: 'bg-blue-100 text-blue-800',
  error: 'bg-red-100 text-red-800',
  llm_error: 'bg-red-100 text-red-800',
  tool_error: 'bg-yellow-100 text-yellow-800',
};

export function AgentEventsPanel({ agentId }: AgentEventsPanelProps) {
  const [historicalEvents, setHistoricalEvents] = useState<AgentEvent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  // Live WebSocket events
  const { events: liveEvents, connected, error: wsError } = useAgentEventsLive(agentId);

  // Load historical events on mount
  useEffect(() => {
    loadHistory();
  }, [agentId]);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const events = await getAgentEvents(agentId, 50);
      setHistoricalEvents(events);
    } catch (err) {
      console.error('Failed to load event history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Combine live and historical events (deduplicate by id)
  const allEvents = [...liveEvents, ...historicalEvents].reduce((acc, event) => {
    if (!acc.find(e => e.id === event.id)) {
      acc.push(event);
    }
    return acc;
  }, [] as AgentEvent[]);

  // Sort by timestamp (newest first)
  allEvents.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">📜 Події агента</h3>
        
        <div className="flex items-center gap-4">
          {/* Live indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm text-gray-600">
              {connected ? 'LIVE' : 'Offline'}
            </span>
          </div>
          
          {/* Refresh button */}
          <button
            onClick={loadHistory}
            disabled={loadingHistory}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            🔄 {loadingHistory ? 'Завантаження...' : 'Оновити'}
          </button>
        </div>
      </div>

      {/* WebSocket error */}
      {wsError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700 text-sm">
          ⚠️ WebSocket: {wsError}
        </div>
      )}

      {/* Loading state */}
      {loadingHistory && historicalEvents.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <div className="text-gray-600">Завантаження подій...</div>
        </div>
      )}

      {/* Empty state */}
      {!loadingHistory && allEvents.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">📜</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Немає подій
          </h3>
          <p className="text-gray-600">
            Події агента з'являться тут після активності
          </p>
        </div>
      )}

      {/* Events list */}
      {allEvents.length > 0 && (
        <div className="space-y-3">
          {allEvents.map((event, index) => (
            <div
              key={event.id || index}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="text-2xl">
                  {EVENT_ICONS[event.kind] || '📌'}
                </div>
                
                {/* Content */}
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`
                      inline-block px-2 py-1 rounded-full text-xs font-medium
                      ${EVENT_COLORS[event.kind] || 'bg-gray-100 text-gray-800'}
                    `}>
                      {EVENT_LABELS[event.kind] || event.kind}
                    </span>
                    
                    <span className="text-sm text-gray-500">
                      {new Date(event.ts).toLocaleString('uk-UA')}
                    </span>
                    
                    {/* NEW badge for live events */}
                    {liveEvents.some(e => e.id === event.id) && (
                      <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">
                        NEW
                      </span>
                    )}
                  </div>
                  
                  {/* Payload details */}
                  {event.payload && Object.keys(event.payload).length > 0 && (
                    <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                      {/* Channel */}
                      {event.channel_id && (
                        <div className="mb-1">
                          <span className="text-gray-600">Канал:</span>{' '}
                          <span className="font-mono text-gray-900">{event.channel_id}</span>
                        </div>
                      )}
                      
                      {/* Tool */}
                      {event.payload.tool_id && (
                        <div className="mb-1">
                          <span className="text-gray-600">Інструмент:</span>{' '}
                          <span className="font-mono text-gray-900">{event.payload.tool_id}</span>
                        </div>
                      )}
                      
                      {/* Message preview */}
                      {event.payload.message_preview && (
                        <div className="mb-1">
                          <span className="text-gray-600">Повідомлення:</span>{' '}
                          <span className="text-gray-900">{event.payload.message_preview}</span>
                        </div>
                      )}
                      
                      {/* Error message */}
                      {event.payload.error_message && (
                        <div className="mb-1 text-red-600">
                          <span className="font-semibold">Помилка:</span>{' '}
                          {event.payload.error_message}
                        </div>
                      )}
                      
                      {/* Generic payload */}
                      {!event.channel_id && !event.payload.tool_id && !event.payload.message_preview && !event.payload.error_message && (
                        <pre className="text-xs text-gray-700 overflow-x-auto">
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

