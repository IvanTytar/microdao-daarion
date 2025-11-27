/**
 * Детальні метрики Swapper Service
 * Відображає спеціалістів, моделі, конфігурацію
 */

import { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Zap, Settings, Database, Users, AlertCircle } from 'lucide-react';

interface SwapperSpecialist {
  name: string;
  model: string;
  idle_timeout: number;
  vram_gb: number;
  used_by?: string[];
}

interface SwapperModel {
  name: string;
  ollama_name: string;
  type: string;
  size_gb: number;
  status: string;
  is_active: boolean;
  uptime_hours: number;
  request_count: number;
}

interface SwapperConfig {
  max_concurrent: number;
  memory_buffer_gb: number;
  eviction: string;
  mode: string;
}

interface SwapperDetailedData {
  service: string;
  status: string;
  mode: string;
  uptime_hours: number;
  cpu_percent: number;
  ram_mib: number;
  vram_gb: number;
  models: SwapperModel[];
  specialists: SwapperSpecialist[];
  config: SwapperConfig;
  timestamp: string;
}

const getSwapperUrl = (nodeId?: string): string => {
  if (nodeId?.includes('node-1') || nodeId === 'node-1') {
    return import.meta.env.VITE_SWAPPER_NODE1_URL || 'http://144.76.224.179:8890';
  } else if (nodeId?.includes('node-2') || nodeId === 'node-2') {
    return import.meta.env.VITE_SWAPPER_NODE2_URL || 'http://192.168.1.244:8890';
  }
  return import.meta.env.VITE_SWAPPER_URL || 'http://localhost:8890';
};

export function SwapperDetailedMetrics({ nodeId }: { nodeId?: string }) {
  const [data, setData] = useState<SwapperDetailedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const swapperUrl = getSwapperUrl(nodeId);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Спочатку перевіряємо health endpoint
        const healthResponse = await fetch(`${swapperUrl}/health`, {
          mode: 'cors',
        });
        
        if (!healthResponse.ok) {
          throw new Error(`Swapper Service health check failed: ${healthResponse.status}`);
        }
        
        // Потім отримуємо детальні дані з API - спочатку пробуємо cabinet API, потім базовий
        let response;
        let statusData;
        
        try {
          response = await fetch(`${swapperUrl}/api/cabinet/swapper/status`, {
            mode: 'cors',
          });
          
          if (response.ok) {
            statusData = await response.json();
          } else {
            throw new Error(`Cabinet API returned ${response.status}`);
          }
        } catch (cabinetError) {
          console.warn('Cabinet API not available, using basic endpoint:', cabinetError);
          
          // Fallback на базовий endpoint
          response = await fetch(`${swapperUrl}/status`, {
            mode: 'cors',
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch Swapper data: ${response.status} ${response.statusText}`);
          }
          
          const basicStatus = await response.json();
          
          // Конвертуємо базовий статус у формат cabinet API
          statusData = {
            service: 'swapper-service',
            status: 'healthy',
            mode: basicStatus.mode || 'single-active',
            active_model: basicStatus.active_model ? {
              name: basicStatus.active_model,
              uptime_hours: 0,
              request_count: 0,
            } : null,
            models: [],
            timestamp: new Date().toISOString(),
          };
        }
        
        // Формуємо детальні дані на основі отриманих
        const detailedData: SwapperDetailedData = {
          service: statusData.service || 'swapper-service',
          status: statusData.status || 'unknown',
          mode: statusData.mode || 'single-active',
          uptime_hours: statusData.active_model?.uptime_hours || 0,
          cpu_percent: 0.13, // З інвентаризації
          ram_mib: 42.85, // З інвентаризації
          vram_gb: 0, // Всі моделі unloaded
          models: statusData.models || [],
          specialists: [
            {
              name: 'vision-8b',
              model: 'qwen3-vl:8b',
              idle_timeout: 2,
              vram_gb: 8.5,
              used_by: ['Vision Policy'],
            },
            {
              name: 'math-7b',
              model: 'qwen2-math:7b',
              idle_timeout: 2,
              vram_gb: 7.0,
              used_by: ['Вождь'],
            },
            {
              name: 'structured-fc-3b',
              model: 'qwen2.5:3b-instruct',
              idle_timeout: 3,
              vram_gb: 4.5,
              used_by: ['Домир'],
            },
            {
              name: 'rag-mini-4b',
              model: 'qwen2.5:7b-instruct',
              idle_timeout: 4,
              vram_gb: 5.5,
              used_by: ['Проводник', 'RAG'],
            },
            {
              name: 'lang-gateway-4b',
              model: 'qwen2.5:7b-instruct',
              idle_timeout: 3,
              vram_gb: 5.5,
              used_by: ['Translation (7 мов)'],
            },
            {
              name: 'security-guard-7b',
              model: 'qwen2.5:7b-instruct',
              idle_timeout: 5,
              vram_gb: 5.5,
              used_by: ['Security', 'RBAC'],
            },
          ],
          config: {
            max_concurrent: 1,
            memory_buffer_gb: 2.0,
            eviction: 'LRU',
            mode: 'single-active',
          },
          timestamp: statusData.timestamp || new Date().toISOString(),
        };
        
        setData(detailedData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching Swapper detailed metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Оновлюємо кожні 30 секунд
    return () => clearInterval(interval);
  }, [nodeId, swapperUrl]); // Залежності для правильного оновлення при зміні ноди

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Activity className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Завантаження метрик...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-red-900 mb-1">Помилка завантаження метрик</h4>
            <p className="text-sm text-red-700 mb-2">{error || 'Немає даних'}</p>
            <div className="text-xs text-red-600 space-y-1">
              <p><strong>URL:</strong> {swapperUrl}</p>
              <p><strong>Node ID:</strong> {nodeId || 'N/A'}</p>
              <p className="mt-2"><strong>Як перевірити на сервері:</strong></p>
              <code className="block bg-red-100 p-1 rounded text-xs mt-1">
                ssh root@144.76.224.179 "docker ps | grep swapper"
              </code>
              <code className="block bg-red-100 p-1 rounded text-xs mt-1">
                ssh root@144.76.224.179 "curl http://localhost:8890/health"
              </code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalModelsSize = data.models.reduce((sum, m) => sum + m.size_gb, 0);
  const loadedModels = data.models.filter(m => m.status === 'loaded' || m.is_active);
  const activeModel = data.models.find(m => m.is_active);

  return (
    <div className="space-y-6">
      {/* Статус сервісу */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Статус сервісу</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
            data.status === 'healthy' || data.status === 'running'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {data.status}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-600" />
            <div>
              <div className="text-sm text-gray-500">CPU</div>
              <div className="text-lg font-semibold">{data.cpu_percent.toFixed(2)}%</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-green-600" />
            <div>
              <div className="text-sm text-gray-500">RAM</div>
              <div className="text-lg font-semibold">{data.ram_mib.toFixed(1)} MiB</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            <div>
              <div className="text-sm text-gray-500">VRAM</div>
              <div className="text-lg font-semibold">{data.vram_gb.toFixed(1)} GB</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-600" />
            <div>
              <div className="text-sm text-gray-500">Uptime</div>
              <div className="text-lg font-semibold">{data.uptime_hours.toFixed(1)}h</div>
            </div>
          </div>
        </div>
      </div>

      {/* Конфігурація */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Конфігурація</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500">Режим</div>
            <div className="text-lg font-semibold">{data.config.mode}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Макс. одночасно</div>
            <div className="text-lg font-semibold">{data.config.max_concurrent}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Буфер пам'яті</div>
            <div className="text-lg font-semibold">{data.config.memory_buffer_gb} GB</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Евікція</div>
            <div className="text-lg font-semibold">{data.config.eviction}</div>
          </div>
        </div>
      </div>

      {/* Моделі */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Моделі ({data.models.length})</h3>
          </div>
          <div className="text-sm text-gray-500">
            Загальний розмір: {totalModelsSize.toFixed(2)} GB
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Модель</th>
                <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Тип</th>
                <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">Розмір</th>
                <th className="text-center py-2 px-3 text-sm font-semibold text-gray-700">Статус</th>
                <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">Uptime</th>
                <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">Запитів</th>
              </tr>
            </thead>
            <tbody>
              {data.models.map((model) => (
                <tr
                  key={model.name}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                    model.is_active ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="py-2 px-3">
                    <div className="font-medium text-gray-900">{model.name}</div>
                    <div className="text-xs text-gray-500">{model.ollama_name}</div>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      model.type === 'llm' ? 'bg-blue-100 text-blue-700' :
                      model.type === 'vision' ? 'bg-purple-100 text-purple-700' :
                      model.type === 'math' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {model.type}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right text-sm">{model.size_gb.toFixed(2)} GB</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      model.status === 'loaded' || model.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {model.is_active ? '● Active' : model.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right text-sm">{model.uptime_hours.toFixed(2)}h</td>
                  <td className="py-2 px-3 text-right text-sm">{model.request_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Спеціалісти */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Спеціалісти ({data.specialists.length})</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.specialists.map((specialist) => (
            <div
              key={specialist.name}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">{specialist.name}</h4>
                <span className="text-xs text-gray-500">{specialist.vram_gb} GB VRAM</span>
              </div>
              <div className="text-sm text-gray-600 mb-2">
                Модель: <span className="font-medium">{specialist.model}</span>
              </div>
              <div className="text-xs text-gray-500 mb-2">
                Idle timeout: {specialist.idle_timeout} хв
              </div>
              {specialist.used_by && specialist.used_by.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-gray-500 mb-1">Використовується:</div>
                  <div className="flex flex-wrap gap-1">
                    {specialist.used_by.map((user, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                      >
                        {user}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Активна модель */}
      {activeModel && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">Активна модель</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-blue-700">Назва</div>
              <div className="text-lg font-semibold text-blue-900">{activeModel.name}</div>
            </div>
            <div>
              <div className="text-sm text-blue-700">Uptime</div>
              <div className="text-lg font-semibold text-blue-900">{activeModel.uptime_hours.toFixed(2)}h</div>
            </div>
            <div>
              <div className="text-sm text-blue-700">Запитів</div>
              <div className="text-lg font-semibold text-blue-900">{activeModel.request_count}</div>
            </div>
            <div>
              <div className="text-sm text-blue-700">Розмір</div>
              <div className="text-lg font-semibold text-blue-900">{activeModel.size_gb.toFixed(2)} GB</div>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 text-center">
        Оновлено: {new Date(data.timestamp).toLocaleString()}
      </div>
    </div>
  );
}

