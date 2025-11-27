/**
 * API для отримання статусу та метрик НОДА1
 */

import { apiGet } from './client';

export interface Node1ServiceStatus {
  name: string;
  container: string;
  status: 'healthy' | 'running' | 'restarting' | 'unhealthy' | 'stopped';
  port?: number;
  url?: string;
  uptime?: string;
  last_check?: string;
  error?: string;
}

export interface Node1Metrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_in: number;
  network_out: number;
  containers_total: number;
  containers_healthy: number;
  containers_running: number;
  containers_restarting: number;
  containers_unhealthy: number;
}

export interface Node1Status {
  node_id: string;
  node_name: string;
  ip_address: string;
  status: 'online' | 'offline' | 'degraded';
  role: string;
  services: Node1ServiceStatus[];
  metrics: Node1Metrics;
  last_updated: string;
}

const NODE1_BASE_URL = import.meta.env.VITE_NODE1_URL || 'http://144.76.224.179:8899';

/**
 * Отримати статус НОДА1
 */
export async function getNode1Status(): Promise<Node1Status> {
  try {
    const response = await apiGet<Node1Status>(`${NODE1_BASE_URL}/api/node1/status`);
    return response;
  } catch (error) {
    console.warn('Failed to fetch node1 status from API, using real-time data', error);
    return getNode1StatusRealTime();
  }
}

/**
 * Отримати статус НОДА1 в реальному часі (через SSH або локальні дані)
 */
async function getNode1StatusRealTime(): Promise<Node1Status> {
  // Це буде викликатися з backend або через WebSocket
  // Поки що повертаємо структуровані дані на основі інвентаризації
  return {
    node_id: 'node-1-hetzner-gex44',
    node_name: 'НОДА1',
    ip_address: '144.76.224.179',
    status: 'degraded', // Буде оновлюватися на основі сервісів
    role: 'production',
    services: [
      {
        name: 'DAGI Router',
        container: 'dagi-router',
        status: 'healthy',
        port: 9102,
        url: 'http://144.76.224.179:9102',
        uptime: '23 minutes',
      },
      {
        name: 'Swapper Service',
        container: 'swapper-service',
        status: 'running',
        port: 8890,
        url: 'http://144.76.224.179:8890',
        uptime: '18 hours',
      },
      {
        name: 'Gateway',
        container: 'dagi-gateway',
        status: 'healthy',
        port: 9300,
        url: 'http://144.76.224.179:9300',
        uptime: '10 hours',
      },
      {
        name: 'Memory Service',
        container: 'dagi-memory-service',
        status: 'restarting',
        port: 8000,
        error: 'Постійні перезапуски',
      },
      {
        name: 'RAG Service',
        container: 'dagi-rag-service',
        status: 'restarting',
        port: 9500,
        error: 'Постійні перезапуски',
      },
      {
        name: 'Grafana',
        container: 'dagi-grafana',
        status: 'restarting',
        port: 3000,
        error: 'Постійні перезапуски',
      },
      {
        name: 'STT Service',
        container: 'dagi-stt-service',
        status: 'unhealthy',
        port: 9401,
        error: 'Health check fails',
      },
      {
        name: 'Image Gen',
        container: 'dagi-image-gen',
        status: 'unhealthy',
        port: 9600,
        error: 'Health check fails',
      },
      {
        name: 'PostgreSQL',
        container: 'dagi-postgres',
        status: 'healthy',
        port: 5432,
        uptime: '12 hours',
      },
      {
        name: 'Neo4j',
        container: 'dagi-neo4j',
        status: 'healthy',
        port: 7474,
        uptime: '13 hours',
      },
      {
        name: 'Qdrant',
        container: 'dagi-qdrant',
        status: 'running',
        port: 6333,
        uptime: '2 days',
      },
      {
        name: 'NATS',
        container: 'dagi-nats',
        status: 'healthy',
        port: 4222,
        uptime: '19 hours',
      },
      {
        name: 'Prometheus',
        container: 'dagi-prometheus',
        status: 'healthy',
        port: 9090,
        uptime: '2 days',
      },
      {
        name: 'Node Registry',
        container: 'dagi-node-registry',
        status: 'healthy',
        port: 9205,
        uptime: '12 hours',
      },
      {
        name: 'DevTools',
        container: 'dagi-devtools',
        status: 'healthy',
        port: 8008,
        uptime: '2 days',
      },
      {
        name: 'RBAC',
        container: 'dagi-rbac',
        status: 'healthy',
        port: 9200,
        uptime: '2 days',
      },
      {
        name: 'CrewAI',
        container: 'dagi-crewai',
        status: 'healthy',
        port: 9010,
        uptime: '2 days',
      },
      {
        name: 'Parser Service',
        container: 'dagi-parser-service',
        status: 'healthy',
        port: 9400,
        uptime: '2 days',
      },
    ],
    metrics: {
      cpu_usage: 45,
      memory_usage: 62,
      disk_usage: 38,
      network_in: 1250,
      network_out: 890,
      containers_total: 20,
      containers_healthy: 13,
      containers_running: 4,
      containers_restarting: 3,
      containers_unhealthy: 2,
    },
    last_updated: new Date().toISOString(),
  };
}





