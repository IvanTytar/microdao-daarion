/**
 * Network Page - Відображення всіх нод у мережі DAGI
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface RegisteredNode {
  id: string;
  node_id: string;
  node_name: string;
  node_role: string;
  node_type: string;
  ip_address?: string;
  local_ip?: string;
  hostname?: string;
  status: 'online' | 'offline' | 'maintenance' | 'degraded';
  last_heartbeat?: string;
  registered_at: string;
  updated_at: string;
  metadata: {
    capabilities?: any;
    first_registration?: string;
    last_registration?: string;
  };
}

interface NetworkStats {
  service: string;
  uptime_seconds: number;
  total_nodes: number;
  online_nodes: number;
  offline_nodes: number;
  uptime_percentage: number;
  timestamp: string;
}

export default function NetworkPage() {
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [nodes, setNodes] = useState<RegisteredNode[]>([]);
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch nodes and stats
  const fetchData = async () => {
    console.log('[NetworkPage] Fetching data...');
    try {
      setIsLoading(true);
      setError(null);

      // Fetch nodes
      console.log('[NetworkPage] Fetching nodes from /node-registry/api/v1/nodes');
      const nodesResponse = await fetch('/node-registry/api/v1/nodes');
      console.log('[NetworkPage] Nodes response status:', nodesResponse.status);
      
      if (!nodesResponse.ok) {
        throw new Error(`Failed to fetch nodes: ${nodesResponse.status} ${nodesResponse.statusText}`);
      }
      
      const nodesData = await nodesResponse.json();
      console.log('[NetworkPage] Nodes data:', nodesData);
      setNodes(nodesData.nodes || []);

      // Fetch stats
      console.log('[NetworkPage] Fetching stats from /node-registry/metrics');
      const statsResponse = await fetch('/node-registry/metrics');
      console.log('[NetworkPage] Stats response status:', statsResponse.status);
      
      if (!statsResponse.ok) {
        throw new Error(`Failed to fetch stats: ${statsResponse.status} ${statsResponse.statusText}`);
      }
      
      const statsData = await statsResponse.json();
      console.log('[NetworkPage] Stats data:', statsData);
      setStats(statsData);
      
      console.log('[NetworkPage] Data fetched successfully');
    } catch (err) {
      console.error('[NetworkPage] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('[NetworkPage] Component mounted');
    fetchData();
    const interval = setInterval(fetchData, 10000); // Оновлювати кожні 10 секунд
    return () => {
      console.log('[NetworkPage] Component unmounting');
      clearInterval(interval);
    };
  }, []);

  const nodesLoading = isLoading;
  const statsLoading = isLoading;
  const nodesError = error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            🌐 DAGI Network
          </h1>
          <p className="text-slate-400">
            Децентралізована мережа AI нод
          </p>
        </div>

        {/* Network Stats */}
        {!statsLoading && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6">
              <div className="text-slate-400 text-sm mb-1">Всього нод</div>
              <div className="text-3xl font-bold text-white">{stats.total_nodes}</div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur border border-green-800 rounded-xl p-6">
              <div className="text-slate-400 text-sm mb-1">Online</div>
              <div className="text-3xl font-bold text-green-400">{stats.online_nodes}</div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur border border-red-800 rounded-xl p-6">
              <div className="text-slate-400 text-sm mb-1">Offline</div>
              <div className="text-3xl font-bold text-red-400">{stats.offline_nodes}</div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur border border-purple-800 rounded-xl p-6">
              <div className="text-slate-400 text-sm mb-1">Uptime</div>
              <div className="text-3xl font-bold text-purple-400">{stats.uptime_percentage}%</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-slate-400 text-sm mb-2 block">Роль</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
              >
                <option value="all">Всі</option>
                <option value="production">Production</option>
                <option value="development">Development</option>
                <option value="backup">Backup</option>
                <option value="worker">Worker</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-sm mb-2 block">Статус</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
              >
                <option value="all">Всі</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="maintenance">Maintenance</option>
                <option value="degraded">Degraded</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={fetchData}
                className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg transition-colors"
              >
                🔄 Оновити
              </button>
              <Link
                to="/connect-node"
                className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                ➕ Підключити ноду
              </Link>
            </div>
          </div>
        </div>

        {/* Nodes List */}
        {nodesLoading && (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-4">⚙️</div>
            <div className="text-slate-400">Завантаження нод...</div>
          </div>
        )}

        {nodesError && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 text-center">
            <div className="text-red-400 text-lg mb-2">❌ Помилка завантаження</div>
            <div className="text-slate-400 text-sm mb-4">{nodesError}</div>
            <div className="text-slate-500 text-xs">
              Переконайтесь що Node Registry запущено на порту 9205
            </div>
          </div>
        )}

        {!nodesLoading && !nodesError && nodes.length === 0 && (
          <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-12 text-center">
            <div className="text-4xl mb-4">🌐</div>
            <div className="text-slate-400 text-lg mb-2">Ноди не знайдено</div>
            <div className="text-slate-500 text-sm">
              Запустіть Bootstrap Agent на нодах для реєстрації
            </div>
          </div>
        )}

        {!nodesLoading && !nodesError && nodes.length > 0 && (
          <div className="space-y-4">
            {nodes.map((node) => (
              <NodeCard key={node.node_id} node={node} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Node Card Component
function NodeCard({ node }: { node: RegisteredNode }) {
  const [expanded, setExpanded] = useState(false);
  
  const statusColors = {
    online: 'border-green-600 bg-green-900/20',
    offline: 'border-red-600 bg-red-900/20',
    maintenance: 'border-yellow-600 bg-yellow-900/20',
    degraded: 'border-orange-600 bg-orange-900/20',
  };

  const statusIcons = {
    online: '🟢',
    offline: '🔴',
    maintenance: '🟡',
    degraded: '🟠',
  };

  const roleIcons = {
    production: '🏭',
    development: '🔬',
    backup: '💾',
    worker: '⚙️',
    router: '🌐',
  };

  const capabilities = node.metadata?.capabilities;
  const systemInfo = capabilities?.system;
  const ollamaInfo = capabilities?.ollama;

  return (
    <div className={`border rounded-xl p-6 ${statusColors[node.status] || 'border-slate-800 bg-slate-900/50'} backdrop-blur`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{roleIcons[node.node_role as keyof typeof roleIcons] || '📡'}</span>
            <h3 className="text-xl font-bold">{node.node_name}</h3>
            <span className="text-2xl">{statusIcons[node.status]}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              node.status === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {node.status.toUpperCase()}
            </span>
          </div>
          <div className="text-slate-400 text-sm space-y-1">
            <div>🆔 {node.node_id}</div>
            {node.hostname && <div>🖥️ {node.hostname}</div>}
            {node.ip_address && <div>🌍 Public IP: {node.ip_address}</div>}
            {node.local_ip && <div>🏠 Local IP: {node.local_ip}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500 mb-1">Last heartbeat</div>
          <div className="text-sm text-slate-400">
            {node.last_heartbeat 
              ? new Date(node.last_heartbeat).toLocaleString('uk-UA')
              : 'Never'}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {systemInfo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-slate-400 text-xs mb-1">CPU</div>
            <div className="text-white font-medium">{systemInfo.cpu_count} cores</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-slate-400 text-xs mb-1">RAM</div>
            <div className="text-white font-medium">{systemInfo.memory_total_gb} GB</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-slate-400 text-xs mb-1">Disk</div>
            <div className="text-white font-medium">{systemInfo.disk_total_gb} GB</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-slate-400 text-xs mb-1">Platform</div>
            <div className="text-white font-medium">{systemInfo.platform}</div>
          </div>
        </div>
      )}

      {/* Services & Features */}
      {capabilities && (
        <div className="flex flex-wrap gap-2 mb-4">
          {capabilities.services?.map((service) => (
            <span key={service} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
              🔧 {service}
            </span>
          ))}
          {capabilities.features?.map((feature) => (
            <span key={feature} className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs">
              ⚡ {feature}
            </span>
          ))}
          {capabilities.gpu?.available && (
            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
              🎮 GPU ({capabilities.gpu.count})
            </span>
          )}
        </div>
      )}

      {/* Ollama Models */}
      {ollamaInfo?.available && ollamaInfo.models && ollamaInfo.models.length > 0 && (
        <div className="mb-4">
          <div className="text-sm text-slate-400 mb-2">
            🤖 Ollama Models ({ollamaInfo.models.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {ollamaInfo.models.slice(0, expanded ? undefined : 5).map((model) => (
              <span key={model} className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs">
                {model}
              </span>
            ))}
            {!expanded && ollamaInfo.models.length > 5 && (
              <button
                onClick={() => setExpanded(true)}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs"
              >
                +{ollamaInfo.models.length - 5} більше
              </button>
            )}
          </div>
        </div>
      )}

      {/* Expand button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
      >
        {expanded ? '▲ Згорнути' : '▼ Детальніше'}
      </button>

      {/* Expanded Details */}
      {expanded && systemInfo && (
        <div className="mt-4 pt-4 border-t border-slate-700 space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-400">Architecture:</span>
              <span className="text-white ml-2">{systemInfo.architecture}</span>
            </div>
            <div>
              <span className="text-slate-400">Python:</span>
              <span className="text-white ml-2">{systemInfo.python_version}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400">Platform Version:</span>
              <div className="text-white text-xs mt-1">{systemInfo.platform_version}</div>
            </div>
          </div>
          <div className="text-slate-500 text-xs mt-4">
            Registered: {new Date(node.registered_at).toLocaleString('uk-UA')}
          </div>
        </div>
      )}
    </div>
  );
}

