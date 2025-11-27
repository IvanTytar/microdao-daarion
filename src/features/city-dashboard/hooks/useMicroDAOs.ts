/**
 * useMicroDAOs Hook
 */

import { useEffect, useState } from 'react';
import type { MicroDAOInfo, UseMicroDAOsResult } from '../types/city';
import { fetchCityMicroDAOs } from '../../../api/city';

const FALLBACK_DAOS: MicroDAOInfo[] = [
  {
    id: 'daarion-dao',
    name: 'DAARION',
    description: 'Системний DAO міста з 50+ агентами',
    members: 89,
    agents: 52,
    status: 'active',
    type: 'platform',
    createdAt: '2024-01-01T00:00:00Z',
    lastActivity: new Date().toISOString(),
  },
  {
    id: 'greenfood-dao',
    name: 'GREENFOOD',
    description: 'ERP-система з 13 AI-агентами для виробників продуктів',
    members: 45,
    agents: 13,
    status: 'active',
    type: 'platform',
    createdAt: '2024-02-15T00:00:00Z',
    lastActivity: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'energy-union-dao',
    name: 'ENERGY UNION',
    description: 'Платформа управління енергетичними ресурсами',
    members: 32,
    agents: 8,
    status: 'active',
    type: 'platform',
    createdAt: '2024-03-01T00:00:00Z',
    lastActivity: new Date(Date.now() - 7200000).toISOString(),
  },
];

export function useMicroDAOs(): UseMicroDAOsResult {
  const [items, setItems] = useState<MicroDAOInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchData = async (p = 1) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchCityMicroDAOs();
      if (response.items.length) {
        setItems(response.items);
        setTotal(response.total);
      } else {
        setItems(FALLBACK_DAOS);
        setTotal(FALLBACK_DAOS.length);
      }
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити MicroDAO');
      setItems(FALLBACK_DAOS);
      setTotal(FALLBACK_DAOS.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const loadMore = () => {
    // TODO: підтримати пагінацію, коли бекенд буде готовий
  };

  return {
    items,
    total,
    loading,
    error,
    loadMore,
    hasMore: false,
  };
}





