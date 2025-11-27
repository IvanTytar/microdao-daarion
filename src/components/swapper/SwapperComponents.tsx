/**
 * Swapper Service Integration for Node #1 and Node #2 Admin Consoles
 * React/TypeScript component example
 */

import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

// Types
interface SwapperStatus {
  service: string;
  status: string;
  mode: string;
  active_model: {
    name: string;
    uptime_hours: number;
    request_count: number;
    loaded_at: string | null;
  } | null;
  total_models: number;
  available_models: string[];
  loaded_models: string[];
  models: Array<{
    name: string;
    ollama_name: string;
    type: string;
    size_gb: number;
    priority: string;
    status: string;
    is_active: boolean;
    uptime_hours: number;
    request_count: number;
    total_uptime_seconds: number;
  }>;
  timestamp: string;
}

interface SwapperMetrics {
  summary: {
    total_models: number;
    active_models: number;
    available_models: number;
    total_uptime_hours: number;
    total_requests: number;
  };
  most_used_model: {
    name: string;
    uptime_hours: number;
    request_count: number;
  } | null;
  active_model: {
    name: string;
    uptime_hours: number | null;
  } | null;
  timestamp: string;
}

// API Service - визначається по ноді
const getSwapperUrl = (nodeId?: string): string => {
  // Визначаємо URL Swapper Service на основі nodeId
  if (!nodeId) {
    return import.meta.env.VITE_SWAPPER_URL || 'http://localhost:8890';
  }
  
  // НОДА1: node-1, node-1-hetzner-gex44, або будь-який ID що містить 'node-1'
  if (nodeId === 'node-1' || nodeId === 'node-1-hetzner-gex44' || nodeId.includes('node-1')) {
    return import.meta.env.VITE_SWAPPER_NODE1_URL || 'http://144.76.224.179:8890';
  }
  
  // НОДА2: node-2 або будь-який ID що містить 'node-2'
  if (nodeId === 'node-2' || nodeId.includes('node-2')) {
    return import.meta.env.VITE_SWAPPER_NODE2_URL || 'http://192.168.1.244:8890';
  }
  
  // За замовчуванням
  return import.meta.env.VITE_SWAPPER_URL || 'http://localhost:8890';
};

const SWAPPER_API_BASE = getSwapperUrl();

export const swapperService = {
  async getStatus(): Promise<SwapperStatus> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      const response = await fetch(`${SWAPPER_API_BASE}/api/cabinet/swapper/status`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error('Failed to fetch Swapper status');
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Swapper Service не відповідає (таймаут)');
      }
      throw error;
    }
  },

  async getMetrics(): Promise<SwapperMetrics> {
    const response = await fetch(`${SWAPPER_API_BASE}/api/cabinet/swapper/metrics/summary`);
    if (!response.ok) throw new Error('Failed to fetch Swapper metrics');
    return response.json();
  },

  async loadModel(modelName: string): Promise<void> {
    const response = await fetch(`${SWAPPER_API_BASE}/models/${modelName}/load`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error(`Failed to load model: ${modelName}`);
  },

  async unloadModel(modelName: string): Promise<void> {
    const response = await fetch(`${SWAPPER_API_BASE}/models/${modelName}/unload`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error(`Failed to unload model: ${modelName}`);
  },
};

// Main Swapper Status Component
export const SwapperStatusCard: React.FC<{ nodeId?: string }> = ({ nodeId }) => {
  const [status, setStatus] = useState<SwapperStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const swapperUrl = getSwapperUrl(nodeId);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // Збільшено до 10 секунд
      
      // Спочатку перевіряємо health endpoint
      const healthResponse = await fetch(`${swapperUrl}/health`, {
        signal: controller.signal,
        mode: 'cors',
      });
      clearTimeout(timeoutId);
      
      if (!healthResponse.ok) {
        throw new Error(`Swapper Service health check failed: ${healthResponse.status}`);
      }
      
      // Потім отримуємо статус - спочатку пробуємо cabinet API, потім базовий endpoint
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 10000);
      
      let response;
      let data;
      
      // Спробуємо cabinet API
      try {
        response = await fetch(`${swapperUrl}/api/cabinet/swapper/status`, {
          signal: controller2.signal,
          mode: 'cors',
        });
        
        if (response.ok) {
          data = await response.json();
          setStatus(data);
          setError(null);
          clearTimeout(timeoutId2);
          return;
        }
      } catch (cabinetError) {
        console.warn('Cabinet API not available, trying basic endpoint:', cabinetError);
      }
      
      // Fallback на базовий endpoint
      clearTimeout(timeoutId2);
      const controller3 = new AbortController();
      const timeoutId3 = setTimeout(() => controller3.abort(), 10000);
      
      response = await fetch(`${swapperUrl}/status`, {
        signal: controller3.signal,
        mode: 'cors',
      });
      clearTimeout(timeoutId3);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Swapper status: ${response.status} ${response.statusText}`);
      }
      
      const basicStatus = await response.json();
      
      // Конвертуємо базовий статус у формат cabinet API
      data = {
        service: 'swapper-service',
        status: 'healthy',
        mode: basicStatus.mode || 'single-active',
        active_model: basicStatus.active_model ? {
          name: basicStatus.active_model,
          uptime_hours: 0,
          request_count: 0,
          loaded_at: null,
        } : null,
        total_models: basicStatus.total_models || 0,
        available_models: basicStatus.available_models || [],
        loaded_models: basicStatus.loaded_models || [],
        models: [],
        timestamp: new Date().toISOString(),
      };
      
      setStatus(data);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError(`Swapper Service не відповідає (таймаут 10 секунд). URL: ${swapperUrl}`);
      } else if (err instanceof Error) {
        setError(`${err.message}. URL: ${swapperUrl}`);
      } else {
        setError(`Невідома помилка. URL: ${swapperUrl}`);
      }
      console.error('Error fetching Swapper status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [nodeId, swapperUrl]); // Додано залежності для правильного оновлення

  if (loading) return <div className="swapper-loading text-sm text-gray-500">Завантаження статусу Swapper...</div>;
  if (error) {
    // Показуємо детальну інформацію про помилку
    return (
      <div className="swapper-error bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-red-900 mb-1">Swapper Service недоступний</h4>
            <p className="text-sm text-red-700 mb-2">{error}</p>
            <div className="text-xs text-red-600 space-y-1">
              <p><strong>URL:</strong> {swapperUrl}</p>
              <p><strong>Node ID:</strong> {nodeId || 'N/A'}</p>
              <p className="mt-2"><strong>Можливі причини:</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                <li>Swapper Service не запущений на сервері</li>
                <li>Проблеми з мережею або файрволом</li>
                <li>Неправильний URL або порт</li>
                <li>CORS обмеження</li>
              </ul>
              <p className="mt-2"><strong>Як перевірити:</strong></p>
              <code className="block bg-red-100 p-1 rounded text-xs mt-1">
                ssh root@144.76.224.179 "curl http://localhost:8890/health"
              </code>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!status) return <div className="swapper-error text-sm text-gray-500">Немає даних про статус</div>;

  return (
    <div className="swapper-status-card">
      <div className="swapper-header">
        <h3>🔄 Swapper Service</h3>
        <span className={`status-badge status-${status.status}`}>
          {status.status}
        </span>
      </div>

      <div className="swapper-info">
        <div className="info-row">
          <span>Mode:</span>
          <span>{status.mode}</span>
        </div>
        <div className="info-row">
          <span>Total Models:</span>
          <span>{status.total_models}</span>
        </div>
        <div className="info-row">
          <span>Loaded Models:</span>
          <span>{status.loaded_models.length}</span>
        </div>
      </div>

      {status.active_model && (
        <div className="active-model-card">
          <h4>✨ Active Model</h4>
          <div className="model-details">
            <div className="model-name">{status.active_model.name}</div>
            <div className="model-stats">
              <div className="stat">
                <span className="stat-label">Uptime:</span>
                <span className="stat-value">{status.active_model.uptime_hours.toFixed(2)}h</span>
              </div>
              <div className="stat">
                <span className="stat-label">Requests:</span>
                <span className="stat-value">{status.active_model.request_count}</span>
              </div>
              {status.active_model.loaded_at && (
                <div className="stat">
                  <span className="stat-label">Loaded:</span>
                  <span className="stat-value">
                    {new Date(status.active_model.loaded_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="models-list">
        <h4>Available Models</h4>
        <table className="models-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Size (GB)</th>
              <th>Status</th>
              <th>Uptime (h)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {status.models.map((model) => (
              <tr key={model.name} className={model.is_active ? 'active' : ''}>
                <td>{model.name}</td>
                <td>
                  <span className={`model-type type-${model.type}`}>{model.type}</span>
                </td>
                <td>{model.size_gb.toFixed(1)}</td>
                <td>
                  <span className={`status-badge status-${model.status}`}>
                    {model.status}
                  </span>
                </td>
                <td>{model.uptime_hours.toFixed(2)}</td>
                <td>
                  {model.status === 'unloaded' && (
                    <button
                      className="btn-load"
                      onClick={() => swapperService.loadModel(model.name).then(fetchStatus)}
                    >
                      Load
                    </button>
                  )}
                  {model.status === 'loaded' && !model.is_active && (
                    <button
                      className="btn-unload"
                      onClick={() => swapperService.unloadModel(model.name).then(fetchStatus)}
                    >
                      Unload
                    </button>
                  )}
                  {model.is_active && (
                    <span className="active-indicator">● Active</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="swapper-footer">
        <small>Last updated: {new Date(status.timestamp).toLocaleString()}</small>
      </div>
    </div>
  );
};

// Metrics Summary Component
export const SwapperMetricsSummary: React.FC<{ nodeId?: string }> = ({ nodeId }) => {
  const swapperUrl = getSwapperUrl(nodeId);
  
  const fetchMetrics = async (): Promise<SwapperMetrics | null> => {
    try {
      // Спробуємо cabinet API
      let response = await fetch(`${swapperUrl}/api/cabinet/swapper/metrics/summary`, {
        mode: 'cors',
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      // Fallback - створюємо базові метрики зі статусу
      const statusResponse = await fetch(`${swapperUrl}/status`, {
        mode: 'cors',
      });
      
      if (!statusResponse.ok) {
        throw new Error('Failed to fetch Swapper status');
      }
      
      const status = await statusResponse.json();
      
      // Створюємо базові метрики
      return {
        summary: {
          total_models: status.total_models || 0,
          active_models: status.active_model ? 1 : 0,
          available_models: status.available_models?.length || 0,
          total_uptime_hours: 0,
          total_requests: 0,
        },
        most_used_model: status.active_model ? {
          name: status.active_model,
          uptime_hours: 0,
          request_count: 0,
        } : null,
        active_model: status.active_model ? {
          name: status.active_model,
          uptime_hours: null,
        } : null,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      console.error('Error fetching Swapper metrics:', err);
      return null;
    }
  };

  const [metrics, setMetrics] = useState<SwapperMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      const data = await fetchMetrics();
      setMetrics(data);
      setLoading(false);
    };
    
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [nodeId, swapperUrl]); // Додано залежності для правильного оновлення

  if (loading) return <div className="text-sm text-gray-500">Завантаження метрик...</div>;
  if (!metrics) return <div className="text-sm text-gray-500">Метрики недоступні</div>;

  return (
    <div className="swapper-metrics-summary">
      <h4 className="text-lg font-semibold mb-4">📊 Метрики</h4>
      <div className="space-y-3">
        <div className="metric-item">
          <span className="metric-label">Всього моделей:</span>
          <span className="metric-value">{metrics.summary.total_models}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Активних:</span>
          <span className="metric-value text-green-600">{metrics.summary.active_models}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Доступних:</span>
          <span className="metric-value">{metrics.summary.available_models}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Uptime (год):</span>
          <span className="metric-value">{metrics.summary.total_uptime_hours.toFixed(1)}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Запитів:</span>
          <span className="metric-value">{metrics.summary.total_requests}</span>
        </div>
      </div>
      {metrics.most_used_model && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Найбільш використовувана модель:</p>
          <p className="font-semibold text-gray-900">{metrics.most_used_model.name}</p>
          <p className="text-xs text-gray-500 mt-1">
            {metrics.most_used_model.uptime_hours.toFixed(1)} год | {metrics.most_used_model.request_count} запитів
          </p>
        </div>
      )}
    </div>
  );
};

// Legacy export for backward compatibility
export const SwapperMetricsSummaryLegacy: React.FC = () => {
  const [metrics, setMetrics] = useState<SwapperMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await swapperService.getMetrics();
        setMetrics(data);
      } catch (err) {
        console.error('Error fetching metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  if (loading || !metrics) return <div>Loading metrics...</div>;

  return (
    <div className="swapper-metrics">
      <h4>📊 Metrics Summary</h4>
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Models</div>
          <div className="metric-value">{metrics.summary.total_models}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Active Models</div>
          <div className="metric-value">{metrics.summary.active_models}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Uptime</div>
          <div className="metric-value">{metrics.summary.total_uptime_hours.toFixed(2)}h</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Requests</div>
          <div className="metric-value">{metrics.summary.total_requests}</div>
        </div>
      </div>

      {metrics.most_used_model && (
        <div className="most-used-model">
          <h5>Most Used Model</h5>
          <div className="model-info">
            <span className="model-name">{metrics.most_used_model.name}</span>
            <span className="model-uptime">
              {metrics.most_used_model.uptime_hours.toFixed(2)}h
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Swapper Page Component
export const SwapperPage: React.FC = () => {
  return (
    <div className="swapper-page">
      <div className="page-header">
        <h2>Swapper Service</h2>
        <p>Dynamic model loading and management</p>
      </div>

      <div className="swapper-grid">
        <div className="swapper-main">
          <SwapperStatusCard />
        </div>
        <div className="swapper-sidebar">
          <SwapperMetricsSummary />
        </div>
      </div>
    </div>
  );
};

export default SwapperPage;

