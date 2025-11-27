/**
 * AgentsGrid Component
 *
 * Сітка агентів із фільтрами та статистикою
 */

import React from 'react';
import type { AgentInfo, AgentFilters } from '../types/city';

interface AgentsGridProps {
  agents: AgentInfo[];
  loading?: boolean;
  error?: string | null;
  filters: AgentFilters;
  onFiltersChange: (filters: Partial<AgentFilters>) => void;
  onAgentClick: (agentId: string) => void;
}

const TYPE_OPTIONS = [
  { value: undefined, label: 'Всі типи' },
  { value: 'core-agent', label: 'Core' },
  { value: 'platform-agent', label: 'Платформні' },
  { value: 'dao-agent', label: 'MicroDAO' },
  { value: 'service-agent', label: 'Сервісні' },
];

const STATUS_OPTIONS = [
  { value: undefined, label: 'Будь-який' },
  { value: 'active', label: 'Активні' },
  { value: 'idle', label: 'Простої' },
  { value: 'offline', label: 'Офлайн' },
  { value: 'error', label: 'Помилки' },
];

export function AgentsGrid({
  agents,
  loading = false,
  error,
  filters,
  onFiltersChange,
  onAgentClick,
}: AgentsGridProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex flex-1 gap-2">
          <select
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.type || ''}
            onChange={(e) => onFiltersChange({ type: e.target.value || undefined })}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.label} value={option.value || ''}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.status || ''}
            onChange={(e) => onFiltersChange({ status: e.target.value || undefined })}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.label} value={option.value || ''}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 flex gap-2">
          <input
            type="text"
            placeholder="🔎 Пошук"
            value={filters.search || ''}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white rounded-xl p-4 shadow animate-pulse space-y-4">
              <div className="h-5 w-1/3 bg-gray-200 rounded" />
              <div className="h-4 w-2/3 bg-gray-200 rounded" />
              <div className="h-4 w-full bg-gray-200 rounded" />
              <div className="h-3 w-full bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Немає агентів за поточними фільтрами
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => onAgentClick(agent.id)}
              className="text-left bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-500">{agent.type}</div>
                  <h4 className="text-lg font-semibold text-gray-900">{agent.name}</h4>
                  <p className="text-sm text-gray-500">{agent.role}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    agent.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : agent.status === 'idle'
                      ? 'bg-yellow-100 text-yellow-800'
                      : agent.status === 'offline'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {agent.status === 'active'
                    ? 'Активний'
                    : agent.status === 'idle'
                    ? 'Простій'
                    : agent.status === 'offline'
                    ? 'Офлайн'
                    : 'Помилки'}
                </span>
              </div>

              <div className="text-sm text-gray-500">
                {agent.department ? `${agent.department} · ` : ''}
                {agent.node}
              </div>

              {agent.metrics && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Metric label="Запити (24h)" value={agent.metrics.requests.toLocaleString()} />
                  <Metric label="Успіх" value={`${agent.metrics.successRate}%`} />
                  <Metric label="Lat." value={`${agent.metrics.avgResponseTime} мс`} />
                  <Metric label="Помилки" value={agent.metrics.errors24h.toString()} />
                </div>
              )}

              <div className="text-xs text-gray-400">
                Остання активність:{' '}
                {agent.lastActivity
                  ? new Date(agent.lastActivity).toLocaleString('uk-UA')
                  : 'Н/д'}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-900">{value}</div>
    </div>
  );
}





