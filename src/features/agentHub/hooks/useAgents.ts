/**
 * useAgents Hook
 * Fetch list of agents (optionally filtered by microDAO)
 */
import { useState, useEffect } from 'react';
import { getAgents, type AgentListItem } from '@/api/agents';

interface UseAgentsResult {
  agents: AgentListItem[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAgents(microdaoId?: string): UseAgentsResult {
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAgents(microdaoId);
      setAgents(data);
    } catch (err) {
      console.error('❌ Failed to fetch agents:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [microdaoId]);

  return {
    agents,
    loading,
    error,
    refetch: fetchAgents,
  };
}

