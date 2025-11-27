/**
 * useAgents Hook
 *
 * Хук для отримання списку агентів міста з фільтрами та fallback-даними
 */

import { useEffect, useMemo, useState } from 'react';
import type { AgentFilters, AgentInfo, AgentsResponse, UseAgentsResult } from '../types/city';
import { ApiError } from '../../../api/client';
import { fetchCityAgents } from '../../../api/city';

const defaultFilters: AgentFilters = {};

const MOCK_AGENTS: AgentInfo[] = [
  {
    id: 'daarwizz',
    name: 'DAARWIZZ',
    type: 'core-agent',
    role: 'System Orchestrator',
    status: 'active',
    department: 'City Core',
    node: 'NODE1 — Hetzнер GEX44',
    microDao: 'daarion-dao',
    lastActivity: new Date().toISOString(),
    metrics: {
      requests: 182,
      successRate: 99,
      avgResponseTime: 420,
      errors24h: 1,
    },
  },
  {
    id: 'greenfood-planner',
    name: 'GreenFood Planner',
    type: 'dao-agent',
    role: 'Supply Planner',
    status: 'active',
    department: 'GreenFood',
    node: 'NODE1 — Hetzнер GEX44',
    microDao: 'greenfood-dao',
    lastActivity: new Date(Date.now() - 1_800_000).toISOString(),
    metrics: {
      requests: 56,
      successRate: 96,
      avgResponseTime: 650,
      errors24h: 3,
    },
  },
  {
    id: 'energy-oracle',
    name: 'Energy Oracle',
    type: 'platform-agent',
    role: 'Energy Analytics',
    status: 'idle',
    department: 'Energy Union',
    node: 'NODE2 — MacBook Pro M4 Max',
    microDao: 'energy-union-dao',
    lastActivity: new Date(Date.now() - 3_600_000).toISOString(),
    metrics: {
      requests: 12,
      successRate: 92,
      avgResponseTime: 780,
      errors24h: 2,
    },
  },
  {
    id: 'node-monitor',
    name: 'Node Monitor',
    type: 'service-agent',
    role: 'Infrastructure',
    status: 'active',
    department: 'Ops',
    node: 'NODE2 — MacBook Pro M4 Max',
    microDao: 'daarion-dao',
    lastActivity: new Date(Date.now() - 300_000).toISOString(),
    metrics: {
      requests: 220,
      successRate: 97,
      avgResponseTime: 310,
      errors24h: 4,
    },
  },
];

export function useAgents(): UseAgentsResult {
  const [items, setItems] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<AgentFilters>(defaultFilters);
  const [hasMore, setHasMore] = useState(false);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);

      const query = new URLSearchParams();
      if (filters.type) query.append('type', filters.type);
      if (filters.status) query.append('status', filters.status);
      if (filters.department) query.append('department', filters.department);
      if (filters.node) query.append('node', filters.node);
      if (filters.search) query.append('search', filters.search);

      let data: AgentsResponse | null = null;
      try {
        data = await fetchCityAgents(query);
      } catch (apiError) {
        if (!(apiError instanceof ApiError && apiError.status === 0)) {
          throw apiError;
        }
      }

      if (data) {
        setItems(data.items);
        setHasMore(data.total > data.items.length);
      } else {
        setItems(MOCK_AGENTS);
        setHasMore(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити агентів');
      setItems(MOCK_AGENTS);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.type, filters.status, filters.department, filters.node, filters.search]);

  const filteredItems = useMemo(() => {
    return items.filter((agent) => {
      if (filters.type && agent.type !== filters.type) return false;
      if (filters.status && agent.status !== filters.status) return false;
      if (filters.department && agent.department !== filters.department) return false;
      if (filters.node && agent.node !== filters.node) return false;
      if (filters.search && !agent.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [items, filters]);

  const setFilters = (updates: Partial<AgentFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...updates }));
  };

  const loadMore = () => {
    // Поки що вся вибірка поміщається локально
    setHasMore(false);
  };

  return {
    items: filteredItems,
    total: filteredItems.length,
    loading,
    error,
    loadMore,
    hasMore,
    filters,
    setFilters,
  };
}

