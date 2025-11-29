'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Server, ArrowLeft, Cpu, Users, Activity, ExternalLink } from 'lucide-react';
import { useNodeProfile } from '@/hooks/useNodes';
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
import { NodeGuardianCard } from '@/components/nodes/NodeGuardianCard';

function getNodeLabel(nodeId: string): string {
  if (nodeId.includes('node-1')) return 'НОДА1';
  if (nodeId.includes('node-2')) return 'НОДА2';
  return 'НОДА';
}

export default function NodeCabinetPage() {
  const params = useParams();
  const nodeId = params.nodeId as string;
  const nodeLabel = getNodeLabel(nodeId);
  
  // Basic node profile from node_cache
  const { node: nodeProfile, isLoading: profileLoading, error: profileError } = useNodeProfile(nodeId);
  
  // Full dashboard (if available - currently only for NODE1)
  const { dashboard, isLoading: dashboardLoading, error: dashboardError, refresh, lastUpdated } = useNodeDashboard({
    refreshInterval: 30000,
    enabled: nodeId === 'node-1-hetzner-gex44' // Only enable for NODE1
  });

  const isLoading = profileLoading || dashboardLoading;
  const error = profileError || (dashboardError && nodeId === 'node-1-hetzner-gex44');
  const isProduction = nodeProfile?.environment === 'production';

  if (isLoading && !nodeProfile && !dashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-white/70">Loading node cabinet...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || (!nodeProfile && !dashboard)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
            <p className="text-red-400 text-lg mb-2">Failed to load node</p>
            <p className="text-white/50 mb-4">{(error as Error)?.message || 'Node not found'}</p>
            <Link
              href="/nodes"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors inline-block"
            >
              Back to Nodes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If we have full dashboard (NODE1), show it
  if (dashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link
                href="/nodes"
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">{nodeLabel}</h1>
                <p className="text-white/50 text-sm">{dashboard.node.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {lastUpdated && (
                <p className="text-white/30 text-sm">
                  Updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
              <button
                onClick={refresh}
                disabled={dashboardLoading}
                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors disabled:opacity-50"
              >
                {dashboardLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
          
          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <NodeSummaryCard node={dashboard.node} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfraCard infra={dashboard.infra} />
                <AgentsCard agents={dashboard.agents} />
              </div>
              
              <AIServicesCard ai={dashboard.ai} />
            </div>
            
            <div className="space-y-6">
              {/* Node Guardian & Steward Agents */}
              <NodeGuardianCard
                guardian={nodeProfile?.guardian_agent}
                steward={nodeProfile?.steward_agent}
              />

              {/* MicroDAO Presence */}
              {nodeProfile?.microdaos && nodeProfile.microdaos.length > 0 && (
                <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
                  <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    MicroDAO Presence
                  </h2>
                  <ul className="space-y-2">
                    {nodeProfile.microdaos.map((dao) => (
                      <li key={dao.id} className="flex items-center justify-between bg-slate-900/30 rounded-lg p-3">
                        <Link 
                          href={`/microdao/${dao.slug}`} 
                          className="text-sm font-medium text-slate-200 hover:text-cyan-400 transition-colors"
                        >
                          {dao.name}
                        </Link>
                        <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded">
                          {dao.rooms_count} rooms
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <NodeStandardComplianceCard node={dashboard.node} />
              <MatrixCard matrix={dashboard.matrix} />
              <ModulesCard modules={dashboard.node.modules} />
            </div>
          </div>
          
          {/* Link to agents */}
          <div className="mt-8">
            <Link
              href={`/agents?node_id=${nodeId}`}
              className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 rounded-lg text-violet-400 transition-colors w-fit"
            >
              <Users className="w-4 h-4" />
              Агенти цієї ноди
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Basic profile view (for NODE2 and others)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/nodes"
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{nodeLabel}</h1>
            <p className="text-white/50 text-sm">{nodeProfile?.name}</p>
          </div>
        </div>

        {/* Node Card */}
        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-8 mb-6">
          <div className="flex items-start gap-6 mb-6">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
              isProduction ? 'bg-emerald-500/20' : 'bg-amber-500/20'
            }`}>
              <Server className={`w-8 h-8 ${
                isProduction ? 'text-emerald-400' : 'text-amber-400'
              }`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-white">{nodeProfile?.name}</h2>
                <span className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                  nodeProfile?.status === 'online' 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    nodeProfile?.status === 'online' ? 'bg-emerald-500' : 'bg-red-500'
                  }`} />
                  {nodeProfile?.status}
                </span>
              </div>
              <p className="text-white/50 font-mono">{nodeProfile?.hostname}</p>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase text-white/40 mb-1">Environment</p>
                <p className={`text-lg ${
                  isProduction ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {nodeProfile?.environment}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-white/40 mb-1">Node ID</p>
                <p className="text-white font-mono text-sm">{nodeProfile?.node_id}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase text-white/40 mb-1">Agents</p>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <span className="text-2xl font-bold text-white">{nodeProfile?.agents_total}</span>
                  <span className="text-white/40">total</span>
                  <span className="text-emerald-400 ml-2">{nodeProfile?.agents_online} online</span>
                </div>
              </div>
              {nodeProfile?.last_heartbeat && (
                <div>
                  <p className="text-xs uppercase text-white/40 mb-1">Last Heartbeat</p>
                  <p className="text-white/60 text-sm">
                    {new Date(nodeProfile.last_heartbeat).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Roles */}
          {nodeProfile?.roles && nodeProfile.roles.length > 0 && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-xs uppercase text-white/40 mb-3">Roles</p>
              <div className="flex flex-wrap gap-2">
                {nodeProfile.roles.map((role) => (
                  <span
                    key={role}
                    className="px-3 py-1 bg-purple-500/10 text-purple-300 rounded-lg text-sm"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Node Guardian & Steward Agents */}
        <div className="mb-6">
          <NodeGuardianCard
            guardian={nodeProfile?.guardian_agent}
            steward={nodeProfile?.steward_agent}
          />
        </div>

        {/* MicroDAO Presence */}
        {nodeProfile?.microdaos && nodeProfile.microdaos.length > 0 && (
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              MicroDAO Presence
            </h2>
            <ul className="space-y-2">
              {nodeProfile.microdaos.map((dao) => (
                <li key={dao.id} className="flex items-center justify-between bg-slate-900/30 rounded-lg p-3">
                  <Link 
                    href={`/microdao/${dao.slug}`} 
                    className="text-sm font-medium text-slate-200 hover:text-cyan-400 transition-colors"
                  >
                    {dao.name}
                  </Link>
                  <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded">
                    {dao.rooms_count} rooms
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Notice for non-NODE1 */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
          <p className="text-amber-400 text-sm">
            ⚠️ Детальний моніторинг доступний тільки для НОДА1 (Production). 
            Для цієї ноди показано базову інформацію з node_cache.
          </p>
        </div>

        {/* Link to agents */}
        <Link
          href={`/agents?node_id=${nodeId}`}
          className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 rounded-lg text-violet-400 transition-colors w-fit"
        >
          <Users className="w-4 h-4" />
          Агенти цієї ноди
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
