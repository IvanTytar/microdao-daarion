/**
 * Node Dashboard Types and API
 * Based on Node Profile Standard v1
 */

// ============================================================================
// Types
// ============================================================================

export interface NodeInfo {
  node_id: string;
  name: string;
  roles: string[];
  status: 'online' | 'offline' | 'degraded' | 'maintenance';
  public_hostname: string;
  environment: string;
  gpu: {
    name: string;
    vram_gb?: number;
    unified_memory_gb?: number;
  } | null;
  modules: ModuleStatus[];
  version: string;
}

export interface ModuleStatus {
  id: string;
  status: 'up' | 'down' | 'degraded' | 'unknown';
  port?: number;
  error?: string;
}

export interface InfraMetrics {
  cpu_usage_pct: number;
  ram: {
    total_gb: number;
    used_gb: number;
  };
  disk: {
    total_gb: number;
    used_gb: number;
  };
  gpus: Array<{
    name: string;
    vram_gb: number;
    used_gb: number;
    sm_util_pct: number;
  }>;
  network?: {
    rx_mbps: number;
    tx_mbps: number;
  };
}

export interface SwapperStatus {
  status: 'up' | 'down' | 'degraded' | 'not_installed';
  endpoint: string;
  latency_ms: number;
  active_model?: string;
  mode?: string;
  storage: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
  };
  models: Array<{
    name: string;
    size_gb: number;
    device: string;
    state: string;
  }>;
}

export interface RouterStatus {
  status: 'up' | 'down' | 'degraded' | 'not_installed';
  endpoint: string;
  version: string;
  nats_connected?: boolean;
  backends: Array<{
    name: string;
    status: string;
    latency_ms: number;
    error?: string;
  }>;
  metrics: {
    requests_1m: number;
    requests_1h: number;
    error_rate_1h: number;
    avg_latency_ms_1h: number;
  };
}

export interface OllamaStatus {
  status: 'up' | 'down' | 'degraded' | 'not_installed';
  endpoint: string;
  latency_ms: number;
  models: string[];
  error?: string;
}

export interface ServiceStatus {
  status: 'up' | 'down' | 'degraded' | 'not_installed';
  endpoint: string;
  latency_ms: number;
  error?: string;
}

export interface AIServices {
  swapper: SwapperStatus;
  router: RouterStatus;
  ollama: OllamaStatus;
  services: Record<string, ServiceStatus>;
}

export interface AgentSummary {
  total: number;
  running: number;
  by_kind: Record<string, number>;
  top: Array<{
    agent_id: string;
    display_name: string;
    kind: string;
    status: string;
    node_id?: string;
  }>;
}

export interface MatrixStatus {
  enabled: boolean;
  homeserver?: string;
  synapse?: {
    status: string;
    latency_ms: number;
  };
  presence_bridge?: {
    status: string;
    latency_ms: number;
  };
}

export interface MonitoringStatus {
  prometheus: {
    url: string;
    status: string;
  };
  grafana: {
    url: string;
    status: string;
  };
  logging: {
    loki: {
      status: string;
    };
  };
}

export interface NodeDashboard {
  node: NodeInfo;
  infra: InfraMetrics;
  ai: AIServices;
  agents: AgentSummary;
  matrix: MatrixStatus;
  monitoring: MonitoringStatus;
}

// ============================================================================
// API Functions
// ============================================================================

export async function fetchNodeDashboard(nodeId?: string): Promise<NodeDashboard> {
  const url = nodeId 
    ? `/api/node/dashboard?nodeId=${encodeURIComponent(nodeId)}`
    : '/api/node/dashboard';
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard: ${response.status}`);
  }
  
  return response.json();
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getStatusColor(status: string): string {
  switch (status) {
    case 'up':
    case 'online':
      return 'text-green-500';
    case 'degraded':
    case 'busy':
      return 'text-yellow-500';
    case 'down':
    case 'offline':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}

export function getStatusBgColor(status: string): string {
  switch (status) {
    case 'up':
    case 'online':
      return 'bg-green-500/20';
    case 'degraded':
    case 'busy':
      return 'bg-yellow-500/20';
    case 'down':
    case 'offline':
      return 'bg-red-500/20';
    default:
      return 'bg-gray-500/20';
  }
}

export function formatBytes(gb: number): string {
  if (gb >= 1000) {
    return `${(gb / 1000).toFixed(1)} TB`;
  }
  return `${gb.toFixed(1)} GB`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

