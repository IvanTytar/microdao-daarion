'use client';

import { NodeInfo } from '@/lib/node-dashboard';
import { StatusBadge } from './StatusBadge';

interface NodeSummaryCardProps {
  node: NodeInfo;
}

export function NodeSummaryCard({ node }: NodeSummaryCardProps) {
  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">{node.name}</h2>
          <p className="text-white/50 text-sm">{node.node_id}</p>
        </div>
        <StatusBadge status={node.status} size="lg" />
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Environment</p>
          <p className="text-white font-medium">{node.environment}</p>
        </div>
        <div>
          <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Hostname</p>
          <p className="text-white font-medium text-sm truncate">{node.public_hostname}</p>
        </div>
        <div>
          <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Version</p>
          <p className="text-white font-medium">{node.version}</p>
        </div>
        <div>
          <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Modules</p>
          <p className="text-white font-medium">{node.modules.length}</p>
        </div>
      </div>
      
      {/* Roles */}
      <div className="mb-4">
        <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Roles</p>
        <div className="flex flex-wrap gap-2">
          {node.roles.map(role => (
            <span 
              key={role}
              className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-md text-sm"
            >
              {role}
            </span>
          ))}
        </div>
      </div>
      
      {/* GPU */}
      {node.gpu && (
        <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎮</span>
            <div>
              <p className="text-white font-medium">{node.gpu.name}</p>
              <p className="text-white/50 text-sm">
                {node.gpu.vram_gb ? `${node.gpu.vram_gb} GB VRAM` : ''}
                {node.gpu.unified_memory_gb ? `${node.gpu.unified_memory_gb} GB Unified Memory` : ''}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

