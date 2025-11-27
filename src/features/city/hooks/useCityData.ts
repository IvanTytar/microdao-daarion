/**
 * useCityData Hook
 * 
 * Хук для отримання повного знімку міста
 */

import { useEffect, useState, useCallback } from 'react';
import type { CitySnapshot } from '../types/city';
import { getCitySnapshot } from '../api/getCitySnapshot';

const REFRESH_INTERVAL_MS = 15_000; // 15 секунд

export function useCityData() {
  const [data, setData] = useState<CitySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const snapshot = await getCitySnapshot();
      setData(snapshot);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (cancelled) return;
      await loadData();
    }

    void load();
    const intervalId = setInterval(load, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [loadData]);

  return { data, loading, error, refetch: loadData };
}





