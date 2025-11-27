import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, ExternalLink, Wifi, WifiOff } from 'lucide-react';

export default function NodesPage() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const res = await fetch('/api/v1/nodes');
        const data = await res.json();
        
        // Додаємо NODE1 якщо його немає в API
        const registeredNodes = data.nodes || [];
        const hasNode1 = registeredNodes.some((n: any) => n.node_id.includes('node-1') || n.node_id.includes('hetzner'));
        
        let allNodes = [...registeredNodes];
        
        // Додаємо NODE1 (Hetzner) якщо не зареєстрована
        if (!hasNode1) {
          allNodes.unshift({
            id: 'node-1-static',
            node_id: 'node-1-hetzner-gex44',
            node_name: 'Hetzner GEX44 Production (NODE1)',
            node_role: 'production',
            node_type: 'router',
            ip_address: '144.76.224.179',
            local_ip: null,
            hostname: 'gateway.daarion.city',
            status: 'online', // NODE1 працює на 144.76.224.179:8899
            last_heartbeat: null,
            registered_at: '2025-01-17T00:00:00Z',
            updated_at: '2025-01-17T00:00:00Z',
            metadata: {
              capabilities: {
                system: {
                  hostname: 'gateway.daarion.city',
                  platform: 'Linux',
                  architecture: 'x86_64',
                  cpu_count: 8,
                  memory_total_gb: 32,
                  disk_total_gb: 512,
                },
                services: ['nginx', 'docker'],
                features: ['production', 'gateway'],
              },
              note: 'Static node - not registered via Bootstrap Agent',
            },
          });
        }
        
        setNodes(allNodes);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNodes();
    const interval = setInterval(fetchNodes, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredNodes = nodes.filter(node => {
    const matchesSearch = node.node_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         node.node_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (node.hostname || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || node.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Завантаження нод...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Ноди мережі DAGI</h1>
          <p className="text-slate-400">
            Всього нод: {nodes.length} • Online: {nodes.filter(n => n.status === 'online').length}
          </p>
        </div>
        <Link
          to="/connect"
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
        >
          + Підключити ноду
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Пошук по назві, ID або hostname..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
          >
            <option value="all">Всі статуси</option>
            <option value="online">🟢 Online</option>
            <option value="offline">🔴 Offline</option>
            <option value="maintenance">🟡 Maintenance</option>
          </select>
        </div>
      </div>

      {/* Nodes Table */}
      {filteredNodes.length === 0 ? (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-slate-400 text-lg mb-4">Ноди не знайдено</p>
          <Link
            to="/connect"
            className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Підключити першу ноду
          </Link>
        </div>
      ) : (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="border-b border-slate-800">
            <div className="grid grid-cols-12 gap-4 p-4 text-sm font-medium text-slate-400">
              <div className="col-span-1 text-center">Статус</div>
              <div className="col-span-3">Назва / ID</div>
              <div className="col-span-2">Роль / Тип</div>
              <div className="col-span-2">IP Address</div>
              <div className="col-span-2">Ресурси</div>
              <div className="col-span-2 text-right">Дії</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-800">
            {filteredNodes.map((node) => {
              const system = node.metadata?.capabilities?.system;
              const isNode2 = node.node_id.includes('macbook') || node.hostname?.includes('MacBook');
              
              return (
                <div
                  key={node.node_id}
                  className="grid grid-cols-12 gap-4 p-4 hover:bg-slate-800/30 transition-colors"
                >
                  {/* Status */}
                  <div className="col-span-1 flex items-center justify-center">
                    {node.status === 'online' ? (
                      <Wifi className="w-5 h-5 text-green-400" title="Online" />
                    ) : (
                      <WifiOff className="w-5 h-5 text-red-400" title="Offline" />
                    )}
                  </div>

                  {/* Name / ID */}
                  <div className="col-span-3">
                    <div className="font-medium text-white mb-1">
                      {node.node_name}
                      {isNode2 && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                          Цей ноут
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-400 font-mono">{node.node_id}</div>
                    {node.hostname && (
                      <div className="text-xs text-slate-500 mt-1">{node.hostname}</div>
                    )}
                  </div>

                  {/* Role / Type */}
                  <div className="col-span-2 flex flex-col justify-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium w-fit mb-1 ${
                      node.node_role === 'production'
                        ? 'bg-red-500/20 text-red-400'
                        : node.node_role === 'development'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {node.node_role}
                    </span>
                    <span className="text-xs text-slate-400 capitalize">{node.node_type}</span>
                  </div>

                  {/* IP Address */}
                  <div className="col-span-2 flex flex-col justify-center text-sm">
                    {node.ip_address && (
                      <div className="text-white font-mono mb-1">
                        🌍 {node.ip_address}
                      </div>
                    )}
                    {node.local_ip && (
                      <div className="text-slate-400 font-mono text-xs">
                        🏠 {node.local_ip}
                      </div>
                    )}
                  </div>

                  {/* Resources */}
                  <div className="col-span-2 flex flex-col justify-center text-sm">
                    {system && (
                      <>
                        <div className="text-white">
                          💻 {system.cpu_count} cores • {system.memory_total_gb}GB RAM
                        </div>
                        <div className="text-slate-400 text-xs mt-1">
                          💾 {Math.round(system.disk_total_gb)}GB • {system.platform}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <Link
                      to={`/nodes/${node.node_id}`}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Кабінет
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info Cards with Hardware Specs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* NODE1 Card */}
        <div className="bg-gradient-to-br from-purple-900/20 to-purple-950/20 border border-purple-800/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-white">NODE1 (Hetzner GEX44)</h3>
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></span>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Production сервер у датацентрі Hetzner, Німеччина
          </p>
          
          {/* Hardware */}
          <div className="bg-slate-800/40 rounded-lg p-3 mb-3 space-y-2 text-xs">
            <div className="font-semibold text-slate-300 mb-2">🖥️ Апаратне забезпечення:</div>
            <div className="flex justify-between">
              <span className="text-slate-400">CPU:</span>
              <span className="text-white">Intel i5-13500 (14 cores)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">GPU:</span>
              <span className="text-green-400 font-medium">RTX 4000 Ada (20GB)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">RAM:</span>
              <span className="text-white">62 GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Storage:</span>
              <span className="text-white">1.7 TB</span>
            </div>
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">IP:</span>
              <span className="text-white font-mono text-xs">144.76.224.179</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Роль:</span>
              <span className="text-red-400 font-medium">Production Router</span>
            </div>
          </div>
        </div>

        {/* NODE2 Card */}
        <div className="bg-gradient-to-br from-blue-900/20 to-blue-950/20 border border-blue-800/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-white">NODE2 (MacBook M4 Max)</h3>
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></span>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Development ноут для розробки та тестування
          </p>

          {/* Hardware */}
          <div className="bg-slate-800/40 rounded-lg p-3 mb-3 space-y-2 text-xs">
            <div className="font-semibold text-slate-300 mb-2">🖥️ Апаратне забезпечення:</div>
            <div className="flex justify-between">
              <span className="text-slate-400">CPU:</span>
              <span className="text-white">Apple M4 Max (16 cores)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">GPU:</span>
              <span className="text-green-400 font-medium">M4 Max GPU (40 cores)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">RAM:</span>
              <span className="text-white">64 GB Unified</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Storage:</span>
              <span className="text-white">2 TB NVMe</span>
            </div>
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">IP:</span>
              <span className="text-white font-mono text-xs">192.168.1.33</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Роль:</span>
              <span className="text-blue-400 font-medium">Development Router</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
