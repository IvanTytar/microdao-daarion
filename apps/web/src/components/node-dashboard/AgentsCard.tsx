'use client';

import { AgentSummary } from '@/lib/node-dashboard';
import { StatusBadge } from './StatusBadge';

interface AgentsCardProps {
  agents: AgentSummary;
}

export function AgentsCard({ agents }: AgentsCardProps) {
  const sortedKinds = Object.entries(agents.by_kind)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  
  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>👥</span> Agents
      </h3>
      
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-white/5 rounded-xl text-center">
          <p className="text-3xl font-bold text-white">{agents.total}</p>
          <p className="text-white/50 text-sm">Total</p>
        </div>
        <div className="p-3 bg-green-500/10 rounded-xl text-center">
          <p className="text-3xl font-bold text-green-400">{agents.running}</p>
          <p className="text-white/50 text-sm">Running</p>
        </div>
      </div>
      
      {/* By Kind */}
      {sortedKinds.length > 0 && (
        <div className="mb-4">
          <p className="text-white/50 text-xs uppercase tracking-wider mb-2">By Type</p>
          <div className="flex flex-wrap gap-2">
            {sortedKinds.map(([kind, count]) => (
              <span 
                key={kind}
                className="px-2 py-1 bg-white/10 text-white rounded-md text-sm"
              >
                {kind}: <span className="font-medium">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Top Agents */}
      {agents.top.length > 0 && (
        <div>
          <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Top Agents</p>
          <div className="space-y-2">
            {agents.top.map(agent => (
              <div 
                key={agent.agent_id}
                className="flex items-center justify-between p-2 bg-white/5 rounded-lg"
              >
                <div>
                  <p className="text-white font-medium">{agent.display_name}</p>
                  <p className="text-white/50 text-xs">{agent.kind}</p>
                </div>
                <StatusBadge status={agent.status} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

