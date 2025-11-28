'use client';

import { MatrixStatus } from '@/lib/node-dashboard';
import { StatusBadge } from './StatusBadge';

interface MatrixCardProps {
  matrix: MatrixStatus;
}

export function MatrixCard({ matrix }: MatrixCardProps) {
  if (!matrix.enabled) {
    return (
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>💬</span> Matrix
        </h3>
        <p className="text-white/50">Matrix not enabled on this node</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>💬</span> Matrix
      </h3>
      
      <div className="space-y-3">
        {/* Synapse */}
        {matrix.synapse && (
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <div>
              <p className="text-white font-medium">Synapse</p>
              <p className="text-white/50 text-sm">Homeserver</p>
            </div>
            <div className="text-right">
              <StatusBadge status={matrix.synapse.status} size="sm" />
              {matrix.synapse.latency_ms > 0 && (
                <p className="text-white/50 text-xs mt-1">{matrix.synapse.latency_ms}ms</p>
              )}
            </div>
          </div>
        )}
        
        {/* Presence Bridge */}
        {matrix.presence_bridge && (
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <div>
              <p className="text-white font-medium">Presence Bridge</p>
              <p className="text-white/50 text-sm">Real-time status</p>
            </div>
            <div className="text-right">
              <StatusBadge status={matrix.presence_bridge.status} size="sm" />
              {matrix.presence_bridge.latency_ms > 0 && (
                <p className="text-white/50 text-xs mt-1">{matrix.presence_bridge.latency_ms}ms</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

