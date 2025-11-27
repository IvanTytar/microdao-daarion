/**
 * useCreateAgent Hook
 * Phase 6: Create new agent
 */
import { useState } from 'react';
import { createAgent, type AgentCreate, type AgentRead } from '@/api/agents';

interface UseCreateAgentResult {
  createNewAgent: (data: AgentCreate) => Promise<AgentRead | null>;
  creating: boolean;
  error: Error | null;
  success: boolean;
}

export function useCreateAgent(): UseCreateAgentResult {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [success, setSuccess] = useState(false);

  const createNewAgent = async (data: AgentCreate): Promise<AgentRead | null> => {
    try {
      setCreating(true);
      setError(null);
      setSuccess(false);
      
      const agent = await createAgent(data);
      
      setSuccess(true);
      console.log('✅ Agent created:', agent.external_id);
      
      return agent;
    } catch (err) {
      console.error('❌ Failed to create agent:', err);
      setError(err as Error);
      return null;
    } finally {
      setCreating(false);
    }
  };

  return {
    createNewAgent,
    creating,
    error,
    success,
  };
}

