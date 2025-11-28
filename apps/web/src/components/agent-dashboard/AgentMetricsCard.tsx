'use client';

import { AgentMetrics } from '@/lib/agent-dashboard';

interface AgentMetricsCardProps {
  metrics?: AgentMetrics;
}

export function AgentMetricsCard({ metrics }: AgentMetricsCardProps) {
  if (!metrics) {
    return (
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>📊</span> Metrics
        </h3>
        <p className="text-white/50">No metrics available</p>
      </div>
    );
  }
  
  const successRate = metrics.success_rate_24h ?? 1;
  const successPercent = (successRate * 100).toFixed(1);
  
  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>📊</span> Metrics
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Tasks 1h */}
        <div className="p-3 bg-white/5 rounded-xl text-center">
          <p className="text-2xl font-bold text-white">{metrics.tasks_1h ?? 0}</p>
          <p className="text-white/50 text-xs">Tasks (1h)</p>
        </div>
        
        {/* Tasks 24h */}
        <div className="p-3 bg-white/5 rounded-xl text-center">
          <p className="text-2xl font-bold text-white">{metrics.tasks_24h ?? 0}</p>
          <p className="text-white/50 text-xs">Tasks (24h)</p>
        </div>
        
        {/* Success Rate */}
        <div className="p-3 bg-green-500/10 rounded-xl text-center">
          <p className="text-2xl font-bold text-green-400">{successPercent}%</p>
          <p className="text-white/50 text-xs">Success Rate</p>
        </div>
        
        {/* Latency */}
        <div className="p-3 bg-blue-500/10 rounded-xl text-center">
          <p className="text-2xl font-bold text-blue-400">{metrics.avg_latency_ms_1h ?? 0}</p>
          <p className="text-white/50 text-xs">Latency (ms)</p>
        </div>
        
        {/* Errors */}
        {(metrics.errors_24h ?? 0) > 0 && (
          <div className="col-span-2 p-3 bg-red-500/10 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-sm">Errors (24h)</span>
              <span className="text-red-400 font-bold">{metrics.errors_24h}</span>
            </div>
          </div>
        )}
        
        {/* Tokens */}
        {(metrics.tokens_24h ?? 0) > 0 && (
          <div className="col-span-2 p-3 bg-purple-500/10 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-sm">Tokens (24h)</span>
              <span className="text-purple-400 font-bold">
                {(metrics.tokens_24h ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

