/**
 * useAgentContext Hook
 * Fetch agent memory context (short-term, mid-term, knowledge)
 */
import { useState, useEffect } from 'react';
import { getAgentContext, type AgentContext } from '@/api/agents';

interface UseAgentContextResult {
  context: AgentContext | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAgentContext(agentId: string): UseAgentContextResult {
  const [context, setContext] = useState<AgentContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchContext = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAgentContext(agentId);
      setContext(data);
    } catch (err) {
      console.error(`❌ Failed to fetch context for agent ${agentId}:`, err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (agentId) {
      fetchContext();
    }
  }, [agentId]);

  return {
    context,
    loading,
    error,
    refetch: fetchContext,
  };
}

