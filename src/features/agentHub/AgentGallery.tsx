/**
 * AgentGallery Component
 * Grid view of agent cards
 */
import { AgentCard } from './AgentCard';
import type { AgentSummary } from '@/types/agent-cabinet';

interface AgentGalleryProps {
  agents: AgentSummary[];
  loading: boolean;
  error: string | null;
}

export function AgentGallery({ agents, loading, error }: AgentGalleryProps) {
  // Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-gray-200" />
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded w-32 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-20" />
              </div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
        <div className="text-red-600 mb-2">❌ Failed to load agents</div>
        <div className="text-sm text-red-500">{error}</div>
      </div>
    );
  }

  // Empty state
  if (agents.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <div className="text-6xl mb-4">🤖</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No Agents Found
        </h3>
        <p className="text-gray-600">
          Try adjusting your filters or create a new agent.
        </p>
      </div>
    );
  }

  // Grid of agents
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}

