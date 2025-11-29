import { useState, useEffect, useCallback } from 'react';
import { getAgentDashboard } from '@/api/agents';
import { AgentDetailDashboard } from '@/types/agent-cabinet';

export function useAgentDashboard(agentId: string) {
  const [dashboard, setDashboard] = useState<AgentDetailDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const data = await getAgentDashboard(agentId);
      setDashboard(data);
      setError(null);
    } catch (err) {
      setError('Failed to load agent dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { dashboard, loading, error, refetch: fetchDashboard };
}

