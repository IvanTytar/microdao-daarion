import React, { useEffect, useState } from 'react';
import { Server, Cpu, Database, Layers } from 'lucide-react';

interface NodeServicesResponse {
  nodes: Record<string, Array<{ name: string; type: string; status: string; port?: number }>>;
  summary: { total: number; running: number };
}

interface NodeModelsResponse {
  nodes: Record<
    string,
    Array<{ name: string; type: string; status: string; format?: string; node_id: string }>
  >;
  summary: { total: number; by_type: Record<string, number> };
}

export default function StackPage() {
  const [servicesData, setServicesData] = useState<NodeServicesResponse | null>(null);
  const [modelsData, setModelsData] = useState<NodeModelsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStack = async () => {
      try {
        const [servicesRes, modelsRes] = await Promise.all([
          fetch('/api/stack/services').then((res) => res.json()),
          fetch('/api/stack/models').then((res) => res.json()),
        ]);
        setServicesData(servicesRes);
        setModelsData(modelsRes);
      } catch (error) {
        console.error('Failed to load stack catalog:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStack();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Завантаження каталогу стеку...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">Standard Stack</h1>
        <p className="text-slate-400 text-sm">
          Актуальні сервіси та моделі, розгорнуті на NODE1 та NODE2
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <Server className="w-5 h-5 text-purple-400 mb-2" />
          <p className="text-xs text-slate-400">Сервісів</p>
          <p className="text-3xl font-bold text-white">{servicesData?.summary.total || 0}</p>
          <p className="text-xs text-green-400">
            Запущено: {servicesData?.summary.running || 0}
          </p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <Cpu className="w-5 h-5 text-blue-400 mb-2" />
          <p className="text-xs text-slate-400">Моделей</p>
          <p className="text-3xl font-bold text-white">{modelsData?.summary.total || 0}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <Layers className="w-5 h-5 text-emerald-400 mb-2" />
          <p className="text-xs text-slate-400">Типи моделей</p>
          <div className="text-sm text-slate-300 space-x-3">
            {modelsData &&
              Object.entries(modelsData.summary.by_type).map(([type, count]) => (
                <span key={type}>
                  {type}: {count}
                </span>
              ))}
          </div>
        </div>
      </div>

      {/* Services per node */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-purple-400" />
          Сервіси по нодах
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {servicesData &&
            Object.entries(servicesData.nodes).map(([nodeId, services]) => (
              <div key={nodeId} className="bg-slate-950/50 rounded-xl border border-slate-800 p-4">
                <p className="text-sm text-slate-400 mb-3">{nodeId}</p>
                <div className="space-y-3">
                  {services.map((service) => (
                    <div
                      key={`${nodeId}-${service.name}`}
                      className="flex items-center justify-between border border-slate-800 rounded-lg p-3 text-sm"
                    >
                      <div>
                        <p className="text-white font-semibold">{service.name}</p>
                        <p className="text-slate-500 text-xs">{service.type}</p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-xs px-2 py-1 rounded-full ${
                            service.status === 'running'
                              ? 'bg-green-500/15 text-green-400'
                              : service.status === 'unhealthy'
                                ? 'bg-yellow-500/15 text-yellow-300'
                                : 'bg-red-500/15 text-red-300'
                          }`}
                        >
                          {service.status}
                        </p>
                        {service.port && (
                          <p className="text-[10px] text-slate-500 mt-1">:{service.port}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Models */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-400" />
          Моделі
        </h2>
        {modelsData &&
          Object.entries(modelsData.nodes).map(([nodeId, models]) => (
            <div key={nodeId} className="mb-8">
              <p className="text-sm text-slate-400 mb-3">{nodeId}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {models.map((model) => (
                  <div
                    key={`${nodeId}-${model.name}`}
                    className="p-4 border border-slate-800 rounded-xl bg-slate-950/40"
                  >
                    <p className="text-white font-semibold">{model.name}</p>
                    <p className="text-xs text-slate-500 mb-2">{model.type}</p>
                    <p
                      className={`text-xs inline-block px-2 py-0.5 rounded-full ${
                        model.status === 'loaded'
                          ? 'bg-green-500/15 text-green-300'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {model.status}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-2">
                      Format: {model.format || 'gguf'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

