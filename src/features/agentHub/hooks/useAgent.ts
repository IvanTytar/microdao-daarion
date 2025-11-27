/**
 * useAgent Hook
 * Fetch single agent details
 */
import { useState, useEffect } from 'react';
import { getAgent, type AgentDetail } from '@/api/agents';

interface UseAgentResult {
  agent: AgentDetail | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAgent(agentId: string): UseAgentResult {
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAgent = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAgent(agentId);
      setAgent(data);
    } catch (err) {
      console.error(`❌ Failed to fetch agent ${agentId}:`, err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (agentId) {
      fetchAgent();
    }
  }, [agentId]);

  return {
    agent,
    loading,
    error,
    refetch: fetchAgent,
  };
}

