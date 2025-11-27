/**
 * City API client helpers
 */

import { apiGet, ApiError } from './client';
import type {
  CityStatsResponse,
  MicroDAOsResponse,
  NodesResponse,
  AgentsResponse,
  CityEventsResponse,
  CityEvent,
} from '../features/city-dashboard/types/city';

const STATS_FALLBACK: CityStatsResponse = {
  stats: {
    microdaos: 15,
    agents: 247,
    nodes: 2,
    activeUsers: 89,
    transactions24h: 1250,
    daarBalance: '125,430.50',
    trends: {
      microdaos: 3,
      agents: 12,
      users: 8,
      transactions: 15,
    },
  },
  zones: [
    {
      id: 'core',
      name: 'Core',
      description: 'Центральна зона з системними сервісами',
      position: { x: 400, y: 300 },
      size: { width: 200, height: 200 },
      color: '#8b5cf6',
      count: 12,
      status: 'active',
    },
    {
      id: 'microdao',
      name: 'MicroDAO District',
      description: 'Квартал автономних спільнот',
      position: { x: 200, y: 200 },
      size: { width: 300, height: 250 },
      color: '#06b6d4',
      count: 15,
      status: 'active',
    },
    {
      id: 'platform',
      name: 'Platform Zone',
      description: 'Платформні сервіси міста',
      position: { x: 600, y: 250 },
      size: { width: 250, height: 200 },
      color: '#10b981',
      count: 8,
      status: 'active',
    },
    {
      id: 'agent-hub',
      name: 'Agent Hub',
      description: 'Центр управління агентами',
      position: { x: 350, y: 500 },
      size: { width: 200, height: 150 },
      color: '#f59e0b',
      count: 247,
      status: 'active',
    },
    {
      id: 'node-network',
      name: 'Node Network',
      description: 'Мережа обчислювальних нод',
      position: { x: 650, y: 500 },
      size: { width: 180, height: 120 },
      color: '#ef4444',
      count: 2,
      status: 'active',
    },
  ],
};

export async function fetchCityStats(): Promise<CityStatsResponse> {
  try {
    return await apiGet<CityStatsResponse>('/city/stats');
  } catch (error) {
    if (error instanceof ApiError && error.status === 0) {
      return STATS_FALLBACK;
    }
    throw error;
  }
}

export async function fetchCityMicroDAOs(): Promise<MicroDAOsResponse> {
  try {
    return await apiGet<MicroDAOsResponse>('/city/microdaos');
  } catch (error) {
    if (error instanceof ApiError && error.status === 0) {
      return {
        items: [],
        total: 0,
        page: 1,
        limit: 50,
      };
    }
    throw error;
  }
}

export async function fetchCityNodes(): Promise<NodesResponse> {
  try {
    return await apiGet<NodesResponse>('/city/nodes');
  } catch (error) {
    if (error instanceof ApiError && error.status === 0) {
      return {
        items: [],
        total: 0,
      };
    }
    throw error;
  }
}

export async function fetchCityAgents(filters: URLSearchParams): Promise<AgentsResponse> {
  try {
    const query = filters.toString();
    const endpoint = query ? `/city/agents?${query}` : '/city/agents';
    return await apiGet<AgentsResponse>(endpoint);
  } catch (error) {
    if (error instanceof ApiError && error.status === 0) {
      return {
        items: [],
        total: 0,
        page: 1,
        limit: 50,
      };
    }
    throw error;
  }
}

export async function fetchCityEventsSnapshot(): Promise<CityEventsResponse> {
  try {
    return await apiGet<CityEventsResponse>('/city/events');
  } catch (error) {
    if (error instanceof ApiError && error.status === 0) {
      return {
        items: [],
        total: 0,
      };
    }
    throw error;
  }
}

export function buildMockEvent(description: string): CityEvent {
  return {
    id: `mock-${Date.now()}`,
    type: 'metrics.raw.*',
    title: 'City heartbeat',
    description,
    timestamp: new Date().toISOString(),
    data: {},
    priority: 'low',
  };
}

