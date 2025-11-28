'use client';

import { useState, useEffect, useCallback } from 'react';
import { NodeDashboard, fetchNodeDashboard } from '@/lib/node-dashboard';

interface UseNodeDashboardOptions {
  nodeId?: string;
  refreshInterval?: number; // in milliseconds
  enabled?: boolean;
}

interface UseNodeDashboardResult {
  dashboard: NodeDashboard | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useNodeDashboard(options: UseNodeDashboardOptions = {}): UseNodeDashboardResult {
  const { nodeId, refreshInterval = 30000, enabled = true } = options;
  
  const [dashboard, setDashboard] = useState<NodeDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const refresh = useCallback(async () => {
    if (!enabled) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await fetchNodeDashboard(nodeId);
      setDashboard(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard'));
    } finally {
      setIsLoading(false);
    }
  }, [nodeId, enabled]);
  
  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);
  
  // Auto-refresh
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;
    
    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [refresh, refreshInterval, enabled]);
  
  return {
    dashboard,
    isLoading,
    error,
    refresh,
    lastUpdated
  };
}

