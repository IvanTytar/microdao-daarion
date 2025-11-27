/**
 * AgentCard Component
 * Single agent card for gallery view
 */
import { useNavigate } from 'react-router-dom';
import type { AgentListItem } from '@/api/agents';

interface AgentCardProps {
  agent: AgentListItem;
}

const STATUS_COLORS = {
  active: 'bg-green-500',
  idle: 'bg-yellow-500',
  offline: 'bg-gray-400',
  error: 'bg-red-500',
};

const STATUS_LABELS = {
  active: 'Активний',
  idle: 'Очікує',
  offline: 'Офлайн',
  error: 'Помилка',
};

const KIND_COLORS = {
  assistant: 'bg-blue-100 text-blue-800',
  node: 'bg-purple-100 text-purple-800',
  system: 'bg-gray-100 text-gray-800',
  guardian: 'bg-green-100 text-green-800',
  analyst: 'bg-orange-100 text-orange-800',
};

const KIND_LABELS = {
  assistant: 'Асистент',
  node: 'Нода',
  system: 'Система',
  guardian: 'Захисник',
  analyst: 'Аналітик',
};

export function AgentCard({ agent }: AgentCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/agent/${agent.id}`);
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
      <div className="absolute top-4 right-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[agent.status]}`} />
          <span className="text-xs text-gray-500">
            {STATUS_LABELS[agent.status]}
          </span>
        </div>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
          {agent.name.charAt(0).toUpperCase()}
        </div>
        
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900">
            {agent.name}
          </h3>
          
          {/* Kind badge */}
          <span className={`
            inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium
            ${KIND_COLORS[agent.kind]}
          `}>
            {KIND_LABELS[agent.kind]}
          </span>
        </div>
      </div>

      {/* Description */}
      {agent.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {agent.description}
        </p>
      )}

      {/* Model */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Модель:</span>
          <span className="font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
            {agent.model}
          </span>
        </div>
      </div>

      {/* Last active */}
      {agent.last_active_at && (
        <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
          Остання активність: {new Date(agent.last_active_at).toLocaleString('uk-UA')}
        </div>
      )}
    </div>
  );
}

