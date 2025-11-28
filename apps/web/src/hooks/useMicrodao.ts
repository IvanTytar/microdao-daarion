'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MicrodaoSummary, MicrodaoDetail } from '@/lib/types/microdao';

interface UseMicrodaoListOptions {
  district?: string;
  q?: string;
  refreshInterval?: number;
  enabled?: boolean;
}

interface UseMicrodaoListResult {
  items: MicrodaoSummary[];
  total: number;
  isLoading: boolean;
  error: Error | null;
  mutate: () => Promise<void>;
}

export function useMicrodaoList(options: UseMicrodaoListOptions = {}): UseMicrodaoListResult {
  const { district, q, refreshInterval = 60000, enabled = true } = options;
  
  const [items, setItems] = useState<MicrodaoSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const search = new URLSearchParams();
      if (district) search.set("district", district);
      if (q) search.set("q", q);
      
      const url = `/api/microdao${search.toString() ? `?${search.toString()}` : ""}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error('Failed to fetch MicroDAO list');
      }
      
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch'));
    } finally {
      setIsLoading(false);
    }
  }, [district, q, enabled]);
  
  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Auto-refresh
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;
    
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval, enabled]);
  
  return {
    items,
    total: items.length,
    isLoading,
    error,
    mutate: fetchData,
  };
}

interface UseMicrodaoDetailOptions {
  refreshInterval?: number;
  enabled?: boolean;
}

interface UseMicrodaoDetailResult {
  microdao: MicrodaoDetail | null;
  isLoading: boolean;
  error: Error | null;
  mutate: () => Promise<void>;
}

export function useMicrodaoDetail(
  slug: string | undefined,
  options: UseMicrodaoDetailOptions = {}
): UseMicrodaoDetailResult {
  const { refreshInterval = 30000, enabled = true } = options;
  
  const [microdao, setMicrodao] = useState<MicrodaoDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchData = useCallback(async () => {
    if (!enabled || !slug) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const res = await fetch(`/api/microdao/${encodeURIComponent(slug)}`);
      
      if (!res.ok) {
        throw new Error('Failed to fetch MicroDAO detail');
      }
      
      const data = await res.json();
      setMicrodao(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch'));
    } finally {
      setIsLoading(false);
    }
  }, [slug, enabled]);
  
  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Auto-refresh
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;
    
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval, enabled]);
  
  return {
    microdao,
    isLoading,
    error,
    mutate: fetchData,
  };
}
