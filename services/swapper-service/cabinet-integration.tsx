/**
 * Swapper Service Integration for Node #1 and Node #2 Admin Consoles
 * React/TypeScript component example
 */

import React, { useEffect, useState } from 'react';

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

// API Service
const SWAPPER_API_BASE = process.env.NEXT_PUBLIC_SWAPPER_URL || 'http://localhost:8890';

export const swapperService = {
  async getStatus(): Promise<SwapperStatus> {
    const response = await fetch(`${SWAPPER_API_BASE}/api/cabinet/swapper/status`);
    if (!response.ok) throw new Error('Failed to fetch Swapper status');
    return response.json();
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
export const SwapperStatusCard: React.FC = () => {
  const [status, setStatus] = useState<SwapperStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const data = await swapperService.getStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="swapper-loading">Loading Swapper status...</div>;
  if (error) return <div className="swapper-error">Error: {error}</div>;
  if (!status) return <div className="swapper-error">No status data</div>;

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
export const SwapperMetricsSummary: React.FC = () => {
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

