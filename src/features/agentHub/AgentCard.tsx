/**
 * AgentCard Component
 * Single agent card for gallery view
 */
import { useNavigate } from 'react-router-dom';
import type { AgentSummary } from '@/types/agent-cabinet';

interface AgentCardProps {
  agent: AgentSummary;
}

const STATUS_COLORS: Record<string, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  busy: 'bg-yellow-500',
  active: 'bg-green-500',
  idle: 'bg-yellow-500',
  error: 'bg-red-500',
};

export function AgentCard({ agent }: AgentCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/agents/${agent.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="
        bg-white rounded-lg border border-gray-200 p-6
        hover:shadow-lg hover:border-blue-500 
        transition-all duration-200 cursor-pointer
        relative
      "
    >
      {/* Status indicator */}
      <div className="absolute top-4 right-4 flex gap-2">
        {agent.is_public && (
          <span className="text-[10px] font-bold uppercase tracking-wide bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
            Public
          </span>
        )}
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[agent.status] || 'bg-gray-300'}`} />
        </div>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-sm">
          {agent.avatar_url ? (
            <img src={agent.avatar_url} alt={agent.display_name} className="w-full h-full object-cover rounded-lg" />
          ) : (
            agent.display_name.charAt(0).toUpperCase()
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 truncate pr-8">
            {agent.display_name}
          </h3>
          
          {/* Kind badge */}
          <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 uppercase tracking-wide">
            {agent.kind}
          </span>
        </div>
      </div>

      {/* Tagline/Description */}
      <p className="text-sm text-gray-600 mb-4 line-clamp-2 h-10">
        {agent.tagline || agent.title || 'No description provided.'}
      </p>

      {/* Meta Info */}
      <div className="space-y-2 text-xs text-gray-500">
        {agent.node_label && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span>🖥️</span>
              <span>Node</span>
            </div>
            <span className="font-medium text-gray-700">{agent.node_label}</span>
          </div>
        )}
        {agent.primary_microdao_name && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span>🏢</span>
              <span>MicroDAO</span>
            </div>
            <span className="font-medium text-gray-700 truncate max-w-[120px]">
              {agent.primary_microdao_name}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-blue-600 font-medium">
        <span>Open Cabinet →</span>
      </div>
    </div>
  );
}

