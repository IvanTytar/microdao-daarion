import React, { useEffect, useState } from 'react';
import { getTeams } from '../../api/teams';
import type { Team } from '../../types/api';

interface MicroDaoListProps {
  onSelectTeam?: (team: Team) => void;
}

export function MicroDaoList({ onSelectTeam }: MicroDaoListProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const data = await getTeams();
      setTeams(data.teams || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Помилка завантаження списку MicroDAO');
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      city: 'Місто',
      platform: 'Платформа',
      community: 'Спільнота',
      guild: 'Гільдія',
      lab: 'Лабораторія',
      personal: 'Особисте',
    };
    return labels[type || 'community'] || 'Спільнота';
  };

  const getModeLabel = (mode: string) => {
    return mode === 'public' ? 'Публічний' : 'Конфіденційний';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Мої MicroDAO</h2>
        <button
          onClick={loadTeams}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Оновити
        </button>
      </div>

      {loading && <div className="text-gray-500">Завантаження...</div>}
      {error && <div className="text-red-500 mb-4">{error}</div>}

      {!loading && !error && (
        <>
          {teams.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              <p>У вас ще немає MicroDAO</p>
              <p className="text-sm mt-2">Створіть перше MicroDAO, щоб почати</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teams.map((team) => (
                <div
                  key={team.id}
                  onClick={() => onSelectTeam?.(team)}
                  className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                    onSelectTeam ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{team.name}</h3>
                      {team.description && (
                        <p className="text-sm text-gray-600 mt-1">{team.description}</p>
                      )}
                      <div className="flex gap-3 mt-2 text-xs text-gray-500">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {getTypeLabel(team.type)}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                          {getModeLabel(team.mode)}
                        </span>
                        {team.slug && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                            {team.slug}
                          </span>
                        )}
                      </div>
                    </div>
                    {team.type === 'city' && (
                      <span className="ml-4 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        DAARION.city
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

