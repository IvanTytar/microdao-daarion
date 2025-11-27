/**
 * useCityStats Hook
 *
 * Хук для отримання статистики міста
 */

import { useState, useEffect } from 'react';
import type { UseCityStatsResult } from '../types/city';
import { fetchCityStats } from '../../../api/city';

export function useCityStats(): UseCityStatsResult {
  const [stats, setStats] = useState<CityStatsResponse['stats'] | null>(null);
  const [zones, setZones] = useState<CityStatsResponse['zones']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchCityStats();
      setStats(data.stats);
      setZones(data.zones);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load city stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const refetch = () => {
    fetchStats();
  };

  return {
    stats,
    zones,
    loading,
    error,
    refetch,
  };
}

