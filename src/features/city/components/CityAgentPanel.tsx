/**
 * CityAgentPanel Component
 * 
 * Панель для відображення першого агента
 */

import type { CityAgentSummary } from '../types/city';

interface CityAgentPanelProps {
  agent: CityAgentSummary | null;
}

export function CityAgentPanel({ agent }: CityAgentPanelProps) {
  if (!agent) {
    return (
      <div className="h-full rounded-2xl border border-white/10 bg-slate-900/40 p-6 flex flex-col items-center justify-center">
        <div className="text-4xl mb-3">🤖</div>
        <h3 className="text-lg font-semibold text-white/90 mb-2">
          No Agent
        </h3>
        <p className="text-sm text-gray-400 text-center">
          Your personal agent is not yet assigned.
        </p>
      </div>
    );
  }

  const statusColors = {
    online: 'bg-green-500/20 text-green-300 border-green-500/30',
    offline: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    busy: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  };

  return (
    <div className="h-full rounded-2xl border border-white/10 bg-slate-900/40 p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-white/90 mb-4">
        Personal Agent
      </h3>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-2xl">
          🤖
        </div>
        <div className="flex-1">
          <div className="font-semibold text-white">{agent.name}</div>
          <div className="text-sm text-gray-400">{agent.role}</div>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[agent.status]}`}>
          {agent.status}
        </div>
      </div>

      {agent.lastAction && (
        <div className="mb-4">
          <div className="text-xs text-gray-400 mb-1">Last Action</div>
          <div className="text-sm text-white">{agent.lastAction}</div>
        </div>
      )}

      <button className="w-full px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-sm font-medium transition-colors border border-purple-500/30">
        Open Agent Room
      </button>
    </div>
  );
}




