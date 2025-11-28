'use client';

import { useNodeDashboard } from '@/hooks/useNodeDashboard';
import {
  NodeSummaryCard,
  InfraCard,
  AIServicesCard,
  AgentsCard,
  MatrixCard,
  ModulesCard,
  NodeStandardComplianceCard
} from '@/components/node-dashboard';

export default function NodeDashboardPage() {
  const { dashboard, isLoading, error, refresh, lastUpdated } = useNodeDashboard({
    refreshInterval: 30000 // 30 seconds
  });
  
  if (isLoading && !dashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-white/70">Loading node dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
            <p className="text-red-400 text-lg mb-2">Failed to load dashboard</p>
            <p className="text-white/50 mb-4">{error.message}</p>
            <button
              onClick={refresh}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!dashboard) return null;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Node Dashboard</h1>
            <p className="text-white/50 text-sm">
              Real-time monitoring and status
            </p>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <p className="text-white/30 text-sm">
                Updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
            <button
              onClick={refresh}
              disabled={isLoading}
              className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Node Summary */}
          <div className="lg:col-span-2 space-y-6">
            <NodeSummaryCard node={dashboard.node} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfraCard infra={dashboard.infra} />
              <AgentsCard agents={dashboard.agents} />
            </div>
            
            <AIServicesCard ai={dashboard.ai} />
          </div>
          
          {/* Right Column */}
          <div className="space-y-6">
            <NodeStandardComplianceCard node={dashboard.node} />
            <MatrixCard matrix={dashboard.matrix} />
            <ModulesCard modules={dashboard.node.modules} />
          </div>
        </div>
      </div>
    </div>
  );
}

