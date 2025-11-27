/**
 * CityNodesSummary Component
 * 
 * Список/грід нод міста
 */

import type { CityNode } from '../types/city';

interface CityNodesSummaryProps {
  nodes: CityNode[];
}

function NodeCard({ node }: { node: CityNode }) {
  const statusColors = {
    healthy: 'bg-green-500/20 text-green-300 border-green-500/30',
    warn: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    critical: 'bg-red-500/20 text-red-300 border-red-500/30',
  };

  return (
    <div className="rounded-lg border border-white/10 bg-slate-800/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-white text-sm">{node.label}</div>
        <div className={`px-2 py-0.5 rounded text-xs font-medium border ${statusColors[node.status]}`}>
          {node.status}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-gray-400">GPU</div>
          <div className="text-white font-semibold">{(node.gpuLoad * 100).toFixed(0)}%</div>
        </div>
        <div>
          <div className="text-gray-400">Latency</div>
          <div className="text-white font-semibold">{node.latencyMs}ms</div>
        </div>
        <div>
          <div className="text-gray-400">Agents</div>
          <div className="text-white font-semibold">{node.agents}</div>
        </div>
      </div>
    </div>
  );
}

export function CityNodesSummary({ nodes }: CityNodesSummaryProps) {
  const healthyCount = nodes.filter(n => n.status === 'healthy').length;
  const warnCount = nodes.filter(n => n.status === 'warn').length;
  const criticalCount = nodes.filter(n => n.status === 'critical').length;

  return (
    <div className="h-full rounded-2xl border border-white/10 bg-slate-900/40 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-white/90">
          Nodes Summary
        </h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-green-400">● {healthyCount}</span>
          <span className="text-yellow-400">● {warnCount}</span>
          <span className="text-red-400">● {criticalCount}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-2">
        {nodes.map((node) => (
          <NodeCard key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}





