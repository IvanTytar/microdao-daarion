/**
 * AgentMetricsPanel Component
 * Display agent usage metrics and stats
 */
import { useState } from 'react';
import { useAgentMetrics } from './hooks/useAgentMetrics';

interface AgentMetricsPanelProps {
  agentId: string;
}

export function AgentMetricsPanel({ agentId }: AgentMetricsPanelProps) {
  const [periodHours, setPeriodHours] = useState(24);
  const { metrics, series, loading, error } = useAgentMetrics(agentId, periodHours);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-gray-200 rounded-lg" />
        <div className="h-64 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-red-600">❌ Помилка завантаження метрик</div>
        <div className="text-sm text-red-500 mt-1">{error.message}</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <div className="text-gray-500">Немає даних про метрики</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">📊 Метрики</h3>
        <div className="flex gap-2">
          {[24, 168, 720].map((hours) => (
            <button
              key={hours}
              onClick={() => setPeriodHours(hours)}
              className={`
                px-3 py-1 rounded-lg text-sm font-medium transition-colors
                ${periodHours === hours
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {hours === 24 ? '24 год' : hours === 168 ? '7 днів' : '30 днів'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* LLM Calls */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-xs text-blue-600 font-medium mb-1">
            LLM Виклики
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {metrics.llm_calls_total.toLocaleString()}
          </div>
        </div>

        {/* Tokens */}
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-xs text-purple-600 font-medium mb-1">
            Токени
          </div>
          <div className="text-2xl font-bold text-purple-900">
            {(metrics.llm_tokens_total / 1000).toFixed(1)}K
          </div>
        </div>

        {/* Tool Calls */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-xs text-green-600 font-medium mb-1">
            Виклики інструментів
          </div>
          <div className="text-2xl font-bold text-green-900">
            {metrics.tool_calls_total}
          </div>
        </div>

        {/* Messages */}
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-xs text-orange-600 font-medium mb-1">
            Повідомлення
          </div>
          <div className="text-2xl font-bold text-orange-900">
            {metrics.messages_sent}
          </div>
        </div>
      </div>

      {/* Performance stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Latency */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Середня затримка</span>
            <span className="text-xs text-gray-500">⚡</span>
          </div>
          <div className="text-xl font-bold text-gray-900">
            {metrics.llm_latency_avg_ms.toFixed(0)} мс
          </div>
        </div>

        {/* Success rate */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Успішність інструментів</span>
            <span className="text-xs text-gray-500">✓</span>
          </div>
          <div className="text-xl font-bold text-gray-900">
            {(metrics.tool_success_rate * 100).toFixed(1)}%
          </div>
        </div>

        {/* Errors */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Помилки</span>
            <span className="text-xs text-gray-500">⚠️</span>
          </div>
          <div className="text-xl font-bold text-gray-900">
            {metrics.errors_count}
          </div>
        </div>
      </div>

      {/* Time series chart (simplified) */}
      {series && series.timestamps.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">
            Активність в часі
          </h4>
          
          <div className="space-y-4">
            {/* Tokens chart */}
            <div>
              <div className="text-xs text-gray-600 mb-2">Токени</div>
              <div className="flex items-end gap-1 h-16">
                {series.tokens.map((value, i) => {
                  const max = Math.max(...series.tokens);
                  const height = max > 0 ? (value / max) * 100 : 0;
                  
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-purple-500 rounded-t"
                      style={{ height: `${height}%` }}
                      title={`${value} tokens`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Tool calls chart */}
            <div>
              <div className="text-xs text-gray-600 mb-2">Виклики інструментів</div>
              <div className="flex items-end gap-1 h-16">
                {series.tool_calls.map((value, i) => {
                  const max = Math.max(...series.tool_calls);
                  const height = max > 0 ? (value / max) * 100 : 0;
                  
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-green-500 rounded-t"
                      style={{ height: `${height}%` }}
                      title={`${value} calls`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

