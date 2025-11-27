/**
 * NodesOverview Component
 *
 * Список нод з ключовими метриками
 */

import React from 'react';
import type { NodeInfo } from '../types/city';

interface NodesOverviewProps {
  nodes: NodeInfo[];
  loading?: boolean;
  onNodeClick: (nodeId: string) => void;
}

export function NodesOverview({ nodes, loading = false, onNodeClick }: NodesOverviewProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/4 mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {nodes.map((node) => (
        <div
          key={node.id}
          onClick={() => onNodeClick(node.id)}
          className="bg-white rounded-xl p-4 shadow hover:shadow-lg transition-all cursor-pointer border border-gray-200 hover:border-blue-300"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-sm text-gray-500">{node.id}</div>
              <h3 className="text-xl font-semibold text-gray-900">{node.name}</h3>
              <div className="text-sm text-gray-500">{node.location}</div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              node.status === 'online'
                ? 'bg-green-100 text-green-800'
                : node.status === 'maintenance'
                ? 'bg-yellow-100 text-yellow-800'
                : node.status === 'degraded'
                ? 'bg-orange-100 text-orange-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {node.status === 'online'
                ? 'Онлайн'
                : node.status === 'maintenance'
                ? 'Обслуговування'
                : node.status === 'degraded'
                ? 'Проблеми'
                : 'Офлайн'}
            </span>
          </div>

          {/* Specs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs uppercase">CPU</div>
              <div className="text-gray-900 font-semibold">{node.specs.cpu} cores</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs uppercase">RAM</div>
              <div className="text-gray-900 font-semibold">{node.specs.ram} GB</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs uppercase">GPU</div>
              <div className="text-gray-900 font-semibold">{node.specs.gpu || '—'}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs uppercase">Storage</div>
              <div className="text-gray-900 font-semibold">{node.specs.storage} GB</div>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricBar label="CPU" value={node.metrics.cpuUsage} unit="%" />
            <MetricBar label="RAM" value={node.metrics.ramUsage} unit="%" />
            {node.metrics.gpuUsage !== undefined && (
              <MetricBar label="GPU" value={node.metrics.gpuUsage} unit="%" />
            )}
            <MetricBar label="Disk" value={node.metrics.diskUsage} unit="%" />
          </div>

          {/* Footer */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <div>
              <span className="font-semibold text-gray-900">{node.agents}</span> агентів
            </div>
            <div>
              <span className="font-semibold text-gray-900">{node.services}</span> сервісів
            </div>
            <div>Uptime: {node.uptime}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricBar({ label, value, unit }: { label: string; value: number; unit: string }) {
  const getColor = (value: number) => {
    if (value >= 80) return 'bg-red-500';
    if (value >= 60) return 'bg-orange-500';
    if (value >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-900">{value}{unit}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor(value)} transition-all duration-300`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

