import { useState, useEffect, useCallback } from 'react';
import { getAgentList } from '@/api/agents';
import { AgentSummary } from '@/types/agent-cabinet';

export function useAgentsV2(filters: Record<string, any> = {}) {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAgentList(filters);
      setAgents(data.items);
      setError(null);
    } catch (err) {
      setError('Failed to load agents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, loading, error, refetch: fetchAgents };
}

