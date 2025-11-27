import { apiGet } from './client';

export interface NodeInfo {
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
}

export interface NodeDetails {
  node_id: string;
  node_name: string;
  ip_address: string;
  role: string;
  status: string;
  agents?: Array<{
    id: string;
    name: string;
    status: string;
    model: string;
  }>;
  services?: Array<{
    name: string;
    status: string;
    port: number;
    url: string;
  }>;
  plugins?: Array<{
    name: string;
    version: string;
    enabled: boolean;
  }>;
  metrics?: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    network_in: number;
    network_out: number;
  };
}

export async function getNodes(): Promise<{ nodes: NodeInfo[] }> {
  // TODO: Замінити на реальний API endpoint
  // return apiGet<{ nodes: NodeInfo[] }>('/api/v1/nodes');
  
  // Mock data поки що
  return Promise.resolve({
    nodes: [
      {
        node_id: 'node-1-hetzner-gex44',
        node_name: 'НОДА1',
        ip_address: '144.76.224.179',
        role: 'production',
        status: 'online',
        swapper_url: 'http://144.76.224.179:8890',
      },
      {
        node_id: 'node-2-macbook-m4max',
        node_name: 'НОДА2',
        ip_address: '192.168.1.244',
        role: 'development',
        status: 'online',
        swapper_url: 'http://localhost:8890',
      },
    ],
  });
}

export async function getNodeDetails(nodeId: string): Promise<NodeDetails> {
  // TODO: Замінити на реальний API endpoint
  // return apiGet<NodeDetails>(`/api/v1/nodes/${nodeId}`);
  
  // Mock data поки що
  return Promise.resolve({
    node_id: nodeId,
    node_name: nodeId.includes('node-1') ? 'НОДА1' : 'НОДА2',
    ip_address: nodeId.includes('node-1') ? '144.76.224.179' : '192.168.1.244',
    role: nodeId.includes('node-1') ? 'production' : 'development',
    status: 'online',
    agents: [
      { id: 'agent-1', name: 'Daarwizz', status: 'active', model: 'gpt-4' },
      { id: 'agent-2', name: 'DevTools Agent', status: 'active', model: 'deepseek-r1' },
      { id: 'agent-3', name: 'Monitor Agent', status: 'active', model: 'local_qwen3_8b' },
    ],
    services: [
      { name: 'Swapper Service', status: 'running', port: 8890, url: 'http://localhost:8890' },
      { name: 'Node Registry', status: 'running', port: 9205, url: 'http://localhost:9205' },
      { name: 'NATS JetStream', status: 'running', port: 4222, url: 'nats://localhost:4222' },
    ],
    plugins: [
      { name: 'Ollama Plugin', version: '1.0.0', enabled: true },
      { name: 'OpenAI Plugin', version: '1.0.0', enabled: true },
      { name: 'DeepSeek Plugin', version: '1.0.0', enabled: true },
    ],
    metrics: {
      cpu_usage: 45,
      memory_usage: 62,
      disk_usage: 38,
      network_in: 1250,
      network_out: 890,
    },
  });
}

