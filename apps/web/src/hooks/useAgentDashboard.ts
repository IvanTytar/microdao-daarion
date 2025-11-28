'use client';

import { useState, useEffect, useCallback } from 'react';
import { AgentDashboard, fetchAgentDashboard } from '@/lib/agent-dashboard';

interface UseAgentDashboardOptions {
  refreshInterval?: number;
  enabled?: boolean;
}

interface UseAgentDashboardResult {
  dashboard: AgentDashboard | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useAgentDashboard(
  agentId: string | null,
  options: UseAgentDashboardOptions = {}
): UseAgentDashboardResult {
  const { refreshInterval = 30000, enabled = true } = options;
  
  const [dashboard, setDashboard] = useState<AgentDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const refresh = useCallback(async () => {
    if (!enabled || !agentId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await fetchAgentDashboard(agentId);
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard'));
    } finally {
      setIsLoading(false);
    }
  }, [agentId, enabled]);
  
  useEffect(() => {
    refresh();
  }, [refresh]);
  
  useEffect(() => {
    if (!enabled || !agentId || refreshInterval <= 0) return;
    
    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [refresh, refreshInterval, enabled, agentId]);
  
  return {
    dashboard,
    isLoading,
    error,
    refresh
  };
}

