import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTeam } from '../api/teams';
import { getChannels } from '../api/channels';
import { MessageSquare, Plus, Loader2 } from 'lucide-react';

export function TeamPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => getTeam(teamId!),
    enabled: !!teamId,
  });

  const { data: channelsData, isLoading: channelsLoading } = useQuery({
    queryKey: ['channels', teamId],
    queryFn: () => getChannels(teamId!),
    enabled: !!teamId,
  });

  if (teamLoading || channelsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Спільноту не знайдено</h1>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-700"
          >
            Повернутися на головну
          </button>
        </div>
      </div>
    );
  }

  const channels = channelsData?.channels || [];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Team Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900 truncate">{team.name}</h1>
          {team.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{team.description}</p>
          )}
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="flex items-center justify-between mb-2 px-2">
            <h2 className="text-xs font-semibold text-gray-500 uppercase">Канали</h2>
            <button
              className="text-gray-400 hover:text-gray-600"
              title="Створити канал"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => navigate(`/teams/${teamId}/channels/${channel.id}`)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-100 text-left transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700 truncate">{channel.name}</span>
              </button>
            ))}
            {channels.length === 0 && (
              <p className="text-sm text-gray-500 px-2 py-4 text-center">
                Немає каналів
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Виберіть канал
          </h2>
          <p className="text-gray-600">
            Оберіть канал зі списку або створіть новий
          </p>
        </div>
      </div>
    </div>
  );
}

