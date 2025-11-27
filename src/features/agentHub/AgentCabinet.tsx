/**
 * AgentCabinet Component
 * Full agent view with tabs: Metrics, Context, Settings
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAgent } from './hooks/useAgent';
import { useAgentContext } from './hooks/useAgentContext';
import { AgentMetricsPanel } from './AgentMetricsPanel';
import { AgentSettingsPanel } from './AgentSettingsPanel';
import { AgentEventsPanel } from './AgentEventsPanel';

type TabType = 'metrics' | 'context' | 'settings' | 'events';

const STATUS_COLORS = {
  active: 'bg-green-500',
  idle: 'bg-yellow-500',
  offline: 'bg-gray-400',
  error: 'bg-red-500',
};

const STATUS_LABELS = {
  active: 'Активний',
  idle: 'Очікує',
  offline: 'Офлайн',
  error: 'Помилка',
};

export function AgentCabinet() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('metrics');

  const { agent, loading, error, refetch } = useAgent(agentId!);
  const { context, loading: contextLoading } = useAgentContext(agentId!);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <div className="text-gray-600">Завантаження агента...</div>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-red-900 mb-2">
            Агент не знайдено
          </h2>
          <p className="text-red-600 mb-4">
            {error?.message || 'Агент не існує або недоступний'}
          </p>
          <button
            onClick={() => navigate('/agent-hub')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ← Повернутись до Agent Hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Back button */}
          <button
            onClick={() => navigate('/agent-hub')}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
          >
            ← Назад до Agent Hub
          </button>

          {/* Agent header */}
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-4xl font-bold">
              {agent.name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {agent.name}
                </h1>
                
                {/* Status */}
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[agent.status]}`} />
                  <span className="text-sm text-gray-600">
                    {STATUS_LABELS[agent.status]}
                  </span>
                </div>
              </div>

              {/* Description */}
              {agent.description && (
                <p className="text-gray-600 mb-3">{agent.description}</p>
              )}

              {/* Meta */}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <span>🤖</span>
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                    {agent.model}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🏢</span>
                  <span className="font-mono">{agent.microdao_id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🔧</span>
                  <span>{agent.tools.length} інструментів</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                onClick={refetch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                🔄 Оновити
              </button>
              <button
                onClick={() => navigate(`/messenger?agent=${agent.id}`)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                💬 Чат
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('metrics')}
              className={`
                px-6 py-3 font-medium transition-colors
                ${activeTab === 'metrics'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              📊 Метрики
            </button>
            <button
              onClick={() => setActiveTab('context')}
              className={`
                px-6 py-3 font-medium transition-colors
                ${activeTab === 'context'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              🧠 Контекст
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`
                px-6 py-3 font-medium transition-colors
                ${activeTab === 'settings'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              ⚙️ Налаштування
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`
                px-6 py-3 font-medium transition-colors
                ${activeTab === 'events'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              📜 Події
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'metrics' && <AgentMetricsPanel agentId={agent.id} />}
        
        {activeTab === 'context' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">🧠 Контекст агента</h3>
            
            {contextLoading ? (
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
                <div className="text-gray-600">Завантаження контексту...</div>
              </div>
            ) : context ? (
              <div className="space-y-4">
                {/* Short-term memory */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Короткострокова пам'ять ({context.short_term.length})
                  </h4>
                  {context.short_term.length > 0 ? (
                    <div className="space-y-2">
                      {context.short_term.map((item) => (
                        <div key={item.id} className="p-3 bg-blue-50 rounded text-sm">
                          <div className="text-gray-900">{item.content}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(item.timestamp).toLocaleString('uk-UA')}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">Немає записів</div>
                  )}
                </div>

                {/* Mid-term memory */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Середньострокова пам'ять ({context.mid_term.length})
                  </h4>
                  {context.mid_term.length > 0 ? (
                    <div className="space-y-2">
                      {context.mid_term.map((item) => (
                        <div key={item.id} className="p-3 bg-purple-50 rounded text-sm">
                          <div className="text-gray-900">{item.content}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(item.timestamp).toLocaleString('uk-UA')}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">Немає записів</div>
                  )}
                </div>

                {/* Knowledge items */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    База знань ({context.knowledge_items.length})
                  </h4>
                  {context.knowledge_items.length > 0 ? (
                    <div className="space-y-2">
                      {context.knowledge_items.map((item) => (
                        <div key={item.id} className="p-3 bg-green-50 rounded text-sm">
                          <div className="text-gray-900">{item.content}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(item.timestamp).toLocaleString('uk-UA')}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">Немає записів</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <div className="text-gray-500">Контекст недоступний</div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'settings' && (
          <AgentSettingsPanel agent={agent} onUpdate={refetch} />
        )}
        
        {activeTab === 'events' && (
          <AgentEventsPanel agentId={agent.id} />
        )}
      </div>
    </div>
  );
}

