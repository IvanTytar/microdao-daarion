/**
 * Network Page Simple - Спрощена версія для тестування
 */

import React from 'react';
import { Link } from 'react-router-dom';

export default function NetworkPageSimple() {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    console.log('NetworkPageSimple: Loading...');
    
    fetch('/node-registry/api/v1/nodes')
      .then(res => {
        console.log('Response status:', res.status);
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        console.log('Data received:', data);
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6 flex items-center justify-center">
        <div>
          <div className="text-4xl mb-4 animate-spin">⚙️</div>
          <div className="text-xl">Завантаження...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-4 text-red-400">❌ Помилка</h1>
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-6">
            <p className="text-lg mb-2">Не вдалося завантажити дані</p>
            <p className="text-sm text-slate-400">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
            >
              Спробувати знову
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          🌐 DAGI Network
        </h1>
        
        <div className="mb-6 flex gap-4">
          <Link
            to="/connect-node"
            className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            ➕ Підключити ноду
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            🔄 Оновити
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="text-slate-400 text-sm">Всього нод</div>
            <div className="text-3xl font-bold">{data?.total || 0}</div>
          </div>
          <div className="bg-green-900/20 border border-green-800 rounded-xl p-6">
            <div className="text-slate-400 text-sm">Online</div>
            <div className="text-3xl font-bold text-green-400">
              {data?.nodes?.filter((n: any) => n.status === 'online').length || 0}
            </div>
          </div>
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-6">
            <div className="text-slate-400 text-sm">Offline</div>
            <div className="text-3xl font-bold text-red-400">
              {data?.nodes?.filter((n: any) => n.status === 'offline').length || 0}
            </div>
          </div>
        </div>

        {/* Nodes List */}
        {data?.nodes && data.nodes.length > 0 ? (
          <div className="space-y-4">
            {data.nodes.map((node: any) => (
              <div
                key={node.node_id}
                className="bg-slate-900/50 border border-slate-800 rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{node.node_name}</h3>
                    <div className="text-sm text-slate-400">
                      {node.node_id} • {node.hostname}
                    </div>
                  </div>
                  <div>
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                      node.status === 'online'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {node.status === 'online' ? '🟢 ONLINE' : '🔴 OFFLINE'}
                    </span>
                  </div>
                </div>

                {node.metadata?.capabilities?.system && (
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-slate-400">CPU</div>
                      <div className="font-medium">
                        {node.metadata.capabilities.system.cpu_count} cores
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">RAM</div>
                      <div className="font-medium">
                        {node.metadata.capabilities.system.memory_total_gb} GB
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Disk</div>
                      <div className="font-medium">
                        {Math.round(node.metadata.capabilities.system.disk_total_gb)} GB
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Platform</div>
                      <div className="font-medium">
                        {node.metadata.capabilities.system.platform}
                      </div>
                    </div>
                  </div>
                )}

                {node.metadata?.capabilities?.ollama?.available && (
                  <div className="mt-4">
                    <div className="text-sm text-slate-400 mb-2">
                      🤖 Ollama Models ({node.metadata.capabilities.ollama.models?.length || 0})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {node.metadata.capabilities.ollama.models?.slice(0, 6).map((model: string) => (
                        <span
                          key={model}
                          className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs"
                        >
                          {model}
                        </span>
                      ))}
                      {node.metadata.capabilities.ollama.models?.length > 6 && (
                        <span className="px-2 py-1 bg-slate-700 text-slate-400 rounded text-xs">
                          +{node.metadata.capabilities.ollama.models.length - 6} більше
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
            <div className="text-4xl mb-4">🌐</div>
            <div className="text-xl mb-2">Ноди не знайдено</div>
            <div className="text-slate-400 mb-6">
              Запустіть Bootstrap Agent на нодах для реєстрації
            </div>
            <Link
              to="/connect-node"
              className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              Як підключити ноду?
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

