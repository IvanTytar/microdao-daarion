/**
 * useAgentMetrics Hook
 * Fetch agent usage metrics and time series
 */
import { useState, useEffect } from 'react';
import { 
  getAgentMetrics, 
  getAgentMetricsSeries,
  type AgentMetrics,
  type AgentMetricsSeries 
} from '@/api/agents';

interface UseAgentMetricsResult {
  metrics: AgentMetrics | null;
  series: AgentMetricsSeries | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAgentMetrics(
  agentId: string,
  periodHours: number = 24
): UseAgentMetricsResult {
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [series, setSeries] = useState<AgentMetricsSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch both metrics and series in parallel
      const [metricsData, seriesData] = await Promise.all([
        getAgentMetrics(agentId, periodHours),
        getAgentMetricsSeries(agentId, periodHours),
      ]);
      
      setMetrics(metricsData);
      setSeries(seriesData);
    } catch (err) {
      console.error(`❌ Failed to fetch metrics for agent ${agentId}:`, err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (agentId) {
      fetchMetrics();
    }
  }, [agentId, periodHours]);

  return {
    metrics,
    series,
    loading,
    error,
    refetch: fetchMetrics,
  };
}

