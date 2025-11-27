/**
 * useNodes Hook
 *
 * Хук для отримання списку нод
 */

import { useState, useEffect } from 'react';
import type { UseNodesResult, NodeInfo } from '../types/city';
import { fetchCityNodes } from '../../../api/city';

const MOCK_NODES: NodeInfo[] = [
  {
    id: 'node-1-hetzner-gex44',
    name: 'NODE1 — Hetzner GEX44',
    status: 'online',
    location: 'Hetzner, Germany',
    specs: {
      cpu: 24,
      ram: 128,
      gpu: 'NVIDIA L40S',
      storage: 2000,
    },
    metrics: {
      cpuUsage: 42,
      ramUsage: 65,
      gpuUsage: 55,
      diskUsage: 38,
      networkIn: 245,
      networkOut: 198,
    },
    agents: 52,
    services: 24,
    uptime: '234 дні',
  },
  {
    id: 'node-2-macbook-m4max',
    name: 'NODE2 — MacBook Pro M4 Max',
    status: 'online',
    location: 'Kyiv, UA',
    specs: {
      cpu: 16,
      ram: 64,
      gpu: 'Apple M4 Max (40 core)',
      storage: 2000,
    },
    metrics: {
      cpuUsage: 28,
      ramUsage: 45,
      gpuUsage: 18,
      diskUsage: 52,
      networkIn: 84,
      networkOut: 96,
    },
    agents: 31,
    services: 12,
    uptime: '18 днів',
  },
];

export function useNodes(): UseNodesResult {
  const [items, setItems] = useState<NodeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNodes = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchCityNodes();
      const nodes = response.items.length ? response.items : MOCK_NODES;
      setItems(nodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load nodes');
      setItems(MOCK_NODES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  const refetch = () => {
    fetchNodes();
  };

  return {
    items,
    loading,
    error,
    refetch,
  };
}

