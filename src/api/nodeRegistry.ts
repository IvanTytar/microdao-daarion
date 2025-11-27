/**
 * Node Registry API Client
 * Взаємодія з Node Registry Service для управління нодами в мережі
 */

// Використовуємо проксі через Vite для уникнення CORS
const NODE_REGISTRY_URL = import.meta.env.VITE_NODE_REGISTRY_URL || '/node-registry';

export interface NodeCapabilities {
  system: {
    hostname: string;
    local_ip: string;
    public_ip?: string;
    platform: string;
    platform_version: string;
    architecture: string;
    cpu_count: number;
    memory_total_gb: number;
    disk_total_gb: number;
    python_version: string;
  };
  services: string[];
  features: string[];
  gpu?: {
    available: boolean;
    gpus?: string[];
    count?: number;
  };
  ollama?: {
    available: boolean;
    models?: string[];
  };
}

export interface RegisteredNode {
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
    capabilities?: NodeCapabilities;
    first_registration?: string;
    last_registration?: string;
  };
}

export interface NetworkStats {
  service: string;
  uptime_seconds: number;
  total_nodes: number;
  online_nodes: number;
  offline_nodes: number;
  uptime_percentage: number;
  timestamp: string;
}

/**
 * Отримати список всіх зареєстрованих нод
 */
export async function getRegisteredNodes(filters?: {
  role?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ nodes: RegisteredNode[]; total: number }> {
  const params = new URLSearchParams();
  if (filters?.role) params.append('role', filters.role);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset) params.append('offset', filters.offset.toString());

  const url = `${NODE_REGISTRY_URL}/api/v1/nodes${params.toString() ? '?' + params.toString() : ''}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch nodes: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Отримати інформацію про конкретну ноду
 */
export async function getNodeById(nodeId: string): Promise<RegisteredNode> {
  const response = await fetch(`${NODE_REGISTRY_URL}/api/v1/nodes/${nodeId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch node: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Отримати статистику мережі
 */
export async function getNetworkStats(): Promise<NetworkStats> {
  const response = await fetch(`${NODE_REGISTRY_URL}/metrics`);
  if (!response.ok) {
    throw new Error(`Failed to fetch network stats: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Пошук нод за критеріями
 */
export async function discoverNodes(query: {
  role?: string;
  type?: string;
  status?: string;
  capability?: string;
  labels?: string[];
}): Promise<{ nodes: RegisteredNode[]; total: number }> {
  const response = await fetch(`${NODE_REGISTRY_URL}/api/v1/nodes/discover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to discover nodes: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Health check Node Registry сервісу
 */
export async function getNodeRegistryHealth(): Promise<{
  status: string;
  service: string;
  version: string;
  uptime_seconds: number;
  database: any;
  network_stats: any;
}> {
  const response = await fetch(`${NODE_REGISTRY_URL}/health`);
  if (!response.ok) {
    throw new Error(`Failed to fetch health: ${response.statusText}`);
  }
  
  return response.json();
}

