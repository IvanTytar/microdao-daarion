import { AgentVisibilityPayload } from '@/lib/types/agents';

/**
 * Update agent visibility settings
 */
export async function updateAgentVisibility(
  agentId: string,
  payload: AgentVisibilityPayload
): Promise<void> {
  const response = await fetch(`/api/agents/${agentId}/visibility`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to update visibility');
  }
}

