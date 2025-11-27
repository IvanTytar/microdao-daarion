import { useNavigate } from 'react-router-dom';
import { Server, Activity, Cpu, HardDrive, Network, ArrowRight, RefreshCw, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface GPUInfo {
  name?: string;
  usage_percent: number;
  memory_used_mb?: number;
  memory_total_mb?: number;
  temperature?: number;
  power_watts?: number;
}

interface NodeInfo {
  node_id: string;
  node_name: string;
  ip_address: string;
  role: 'production' | 'development';
  status: 'online' | 'offline' | 'degraded';
  swapper_url: string;
  swapper_status?: {
    service: string;
    status: string;
    active_model: {
      name: string;
      uptime_hours: number;
    } | null;
    total_models: number;
  };
  gpu?: GPUInfo | GPUInfo[]; // Може бути одна GPU або масив GPU
}

const NODES: NodeInfo[] = [
  {
    node_id: 'node-1-hetzner-gex44',
    node_name: 'НОДА1',
    ip_address: '144.76.224.179',
    role: 'production',
    status: 'online',
    swapper_url: 'http://144.76.224.179:8890',
    // НОДА1 (Hetzner GEX44) - NVIDIA RTX 4000 SFF Ada (20GB VRAM)
    gpu: {
      name: 'NVIDIA RTX 4000 SFF Ada Generation',
      usage_percent: 0, // Буде оновлено через fetchGPUInfo
      memory_used_mb: 0,
      memory_total_mb: 20475, // 20GB VRAM
    },
  },
  {
    node_id: 'node-2-macbook-m4max',
    node_name: 'НОДА2',
    ip_address: '192.168.1.244',
    role: 'development',
    status: 'online',
    swapper_url: 'http://192.168.1.244:8890', // Виправлено: використовуємо IP замість localhost
  },
];

async function checkNodeHealth(node: NodeInfo): Promise<'online' | 'offline' | 'degraded'> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  
  try {
    const response = await fetch(`${node.swapper_url}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      return data.status === 'healthy' ? 'online' : 'degraded';
    }
    return 'degraded';
  } catch {
    clearTimeout(timeoutId);
    return 'offline';
  }
}

async function fetchSwapperStatus(swapperUrl: string): Promise<NodeInfo['swapper_status'] | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    const response = await fetch(`${swapperUrl}/api/cabinet/swapper/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`Error fetching Swapper status from ${swapperUrl}:`, error);
    return null;
  }
}

async function fetchGPUInfo(nodeId: string, ipAddress: string): Promise<GPUInfo | GPUInfo[] | null> {
  // Для НОДА1 (Hetzner) - NVIDIA RTX 4000 SFF Ada
  if (nodeId.includes('node-1')) {
    try {
      // Спробувати отримати реальні метрики через nvidia-smi або API
      // Поки що повертаємо технічні характеристики
      return {
        name: 'NVIDIA RTX 4000 SFF Ada Generation',
        usage_percent: 0, // Буде оновлено через API
        memory_used_mb: 1922, // Поточне використання з документації
        memory_total_mb: 20475, // 20GB VRAM
        temperature: 46, // З документації
        power_watts: 11, // Поточне споживання / 70W max
      };
    } catch (error) {
      console.warn('Error fetching GPU info for NODE1:', error);
      // Повертаємо технічні характеристики якщо API недоступний
      return {
        name: 'NVIDIA RTX 4000 SFF Ada Generation',
        usage_percent: 0,
        memory_used_mb: 1922,
        memory_total_mb: 20475,
        temperature: 46,
        power_watts: 11,
      };
    }
  }
  
  // Для НОДА2 (MacBook M4 Max) - є GPU
  if (nodeId.includes('node-2')) {
    // M4 Max має 40-core GPU
    return {
      name: 'Apple M4 Max GPU',
      usage_percent: 15, // Mock data - замінити на реальний API
      memory_used_mb: 2048,
      memory_total_mb: 12288, // 12GB unified memory
      temperature: 45,
      power_watts: 25,
    };
  }
  
  return null;
}

export function NodesPage() {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<NodeInfo[]>(NODES);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchAllNodesStatus = async () => {
    setLoading(true);
    const updatedNodes = await Promise.all(
      NODES.map(async (node) => {
        const status = await checkNodeHealth(node);
        const swapperStatus = status === 'online' ? await fetchSwapperStatus(node.swapper_url) : null;
        const gpuInfo = await fetchGPUInfo(node.node_id, node.ip_address);
        
        return {
          ...node,
          status,
          swapper_status: swapperStatus || undefined,
          gpu: gpuInfo || undefined,
        };
      })
    );
    
    setNodes(updatedNodes);
    setLastUpdate(new Date());
    setLoading(false);
  };

  useEffect(() => {
    fetchAllNodesStatus();
    const interval = setInterval(fetchAllNodesStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'online':
        return 'Онлайн';
      case 'degraded':
        return 'Деградовано';
      case 'offline':
        return 'Офлайн';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Network className="w-8 h-8 text-blue-600" />
                НОДИ
              </h1>
              <p className="text-gray-600 mt-2">Управління нодами та моніторинг системи</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={fetchAllNodesStatus}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Оновити
              </button>
              <span className="text-sm text-gray-500">
                Оновлено: {lastUpdate.toLocaleTimeString('uk-UA')}
              </span>
            </div>
          </div>
        </div>

        {/* Node Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {nodes.map((node) => (
            <div
              key={node.node_id}
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Server className="w-8 h-8" />
                    <div>
                      <h2 className="text-2xl font-bold">{node.node_name}</h2>
                      <p className="text-blue-100 text-sm">{node.node_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${getStatusColor(node.status)}`} />
                    <span className="font-semibold">{getStatusLabel(node.status)}</span>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6">
                {/* Node Info */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Network className="w-4 h-4" />
                      IP адреса
                    </span>
                    <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      {node.ip_address}
                    </code>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Роль
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      node.role === 'production'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {node.role === 'production' ? 'Production' : 'Development'}
                    </span>
                  </div>
                  {node.swapper_status && (
                    <>
                      <div className="flex items-center justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600 flex items-center gap-2">
                          <Cpu className="w-4 h-4" />
                          Активна модель
                        </span>
                        <span className="text-sm font-semibold">
                          {node.swapper_status.active_model?.name || 'Немає'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600 flex items-center gap-2">
                          <HardDrive className="w-4 h-4" />
                          Всього моделей
                        </span>
                        <span className="text-sm font-semibold">
                          {node.swapper_status.total_models}
                        </span>
                      </div>
                    </>
                  )}

                  {/* GPU метрики */}
                  {node.gpu && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-5 h-5 text-orange-600" />
                        <span className="font-semibold text-gray-900">GPU метрики</span>
                      </div>
                      {Array.isArray(node.gpu) ? (
                        // Множинні GPU
                        <div className="space-y-3">
                          {node.gpu.map((gpu, index) => (
                            <div key={index} className="bg-orange-50 rounded-lg p-3">
                              {gpu.name && (
                                <div className="text-sm font-semibold text-gray-900 mb-2">{gpu.name}</div>
                              )}
                              <div className="space-y-2">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-gray-600">Використання</span>
                                    <span className={`text-sm font-semibold ${
                                      gpu.usage_percent > 80 ? 'text-red-600' :
                                      gpu.usage_percent > 50 ? 'text-yellow-600' : 'text-green-600'
                                    }`}>
                                      {gpu.usage_percent}%
                                    </span>
                                  </div>
                                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full transition-all ${
                                        gpu.usage_percent > 80 ? 'bg-red-500' :
                                        gpu.usage_percent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                                      }`}
                                      style={{ width: `${gpu.usage_percent}%` }}
                                    />
                                  </div>
                                </div>
                                {gpu.memory_used_mb && gpu.memory_total_mb && (
                                  <div className="text-xs text-gray-600">
                                    Пам'ять: {(gpu.memory_used_mb / 1024).toFixed(1)} / {(gpu.memory_total_mb / 1024).toFixed(1)} GB
                                  </div>
                                )}
                                {gpu.temperature && (
                                  <div className="text-xs text-gray-600">
                                    Температура: {gpu.temperature}°C
                                  </div>
                                )}
                                {gpu.power_watts && (
                                  <div className="text-xs text-gray-600">
                                    Потужність: {gpu.power_watts}W
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        // Одна GPU
                        <div className="bg-orange-50 rounded-lg p-3">
                          {node.gpu.name && (
                            <div className="text-sm font-semibold text-gray-900 mb-2">{node.gpu.name}</div>
                          )}
                          <div className="space-y-2">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-600">Використання</span>
                                <span className={`text-sm font-semibold ${
                                  node.gpu.usage_percent > 80 ? 'text-red-600' :
                                  node.gpu.usage_percent > 50 ? 'text-yellow-600' : 'text-green-600'
                                }`}>
                                  {node.gpu.usage_percent}%
                                </span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${
                                    node.gpu.usage_percent > 80 ? 'bg-red-500' :
                                    node.gpu.usage_percent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${node.gpu.usage_percent}%` }}
                                />
                              </div>
                            </div>
                            {node.gpu.memory_used_mb && node.gpu.memory_total_mb && (
                              <div className="text-xs text-gray-600">
                                Пам'ять: {(node.gpu.memory_used_mb / 1024).toFixed(1)} / {(node.gpu.memory_total_mb / 1024).toFixed(1)} GB
                              </div>
                            )}
                            {node.gpu.temperature && (
                              <div className="text-xs text-gray-600">
                                Температура: {node.gpu.temperature}°C
                              </div>
                            )}
                            {node.gpu.power_watts && (
                              <div className="text-xs text-gray-600">
                                Потужність: {node.gpu.power_watts}W
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <button
                  onClick={() => navigate(`/nodes/${node.node_id}`)}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-semibold"
                >
                  Відкрити кабінет
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
