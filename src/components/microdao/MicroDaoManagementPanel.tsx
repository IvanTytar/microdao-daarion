/**
 * Панель управління всіма мікроДАО
 * Відображається в кабінеті DAARION для керування всіма мікроДАО
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, ExternalLink, Users, MessageSquare, Settings, Activity, Crown, Zap } from 'lucide-react';
import { getTeams } from '../../api/teams';
import { AGENT_MICRODAO_MAPPING } from '../../utils/agentMicroDaoMapping';
import type { Team } from '../../types/api';

export function MicroDaoManagementPanel() {
  const navigate = useNavigate();
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
      // Об'єднуємо дані з API та маппінг
      const apiTeams = data.teams || [];
      const mappedTeams = AGENT_MICRODAO_MAPPING.map(mapping => {
        const apiTeam = apiTeams.find(t => t.id === mapping.microDaoId || t.slug === mapping.microDaoSlug);
        return apiTeam || {
          id: mapping.microDaoId,
          name: mapping.microDaoName,
          slug: mapping.microDaoSlug,
          description: mapping.description || `${mapping.microDaoName} мікроДАО - платформа в екосистемі DAARION.city`,
          mode: 'public' as const,
          type: 'platform' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });
      setTeams(mappedTeams);
      setError(null);
    } catch (err: any) {
      console.error('Error loading teams:', err);
      // Якщо API не працює, використовуємо тільки маппінг
      const mappedTeams = AGENT_MICRODAO_MAPPING.map(mapping => ({
        id: mapping.microDaoId,
        name: mapping.microDaoName,
        slug: mapping.microDaoSlug,
        description: mapping.description || `${mapping.microDaoName} мікроДАО - платформа в екосистемі DAARION.city`,
        mode: 'public' as const,
        type: 'platform' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      setTeams(mappedTeams);
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
    return labels[type || 'platform'] || 'Платформа';
  };

  const getModeLabel = (mode: string) => {
    return mode === 'public' ? 'Публічний' : 'Конфіденційний';
  };

  const getOrchestratorInfo = (teamId: string) => {
    const mapping = AGENT_MICRODAO_MAPPING.find(m => m.microDaoId === teamId || m.microDaoSlug === teamId);
    return mapping;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Activity className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Завантаження мікроДАО...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={loadTeams}
          className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
        >
          Спробувати ще раз
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок з кнопкою створення */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Управління мікроДАО</h2>
          <p className="text-sm text-gray-500 mt-1">
            Всі мікроДАО в екосистемі DAARION.city
          </p>
        </div>
        <button
          onClick={() => navigate('/console?action=create-microdao')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Створити мікроДАО
        </button>
      </div>

      {/* Список мікроДАО */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => {
          const orchestrator = getOrchestratorInfo(team.id);
          const isDaarion = team.id === 'daarion-dao' || team.slug === 'daarion';

          return (
            <div
              key={team.id}
              className={`bg-white rounded-lg shadow-sm border-2 transition-all hover:shadow-md ${
                isDaarion ? 'border-blue-500' : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="p-6">
                {/* Заголовок */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className={`w-6 h-6 ${isDaarion ? 'text-blue-600' : 'text-gray-600'}`} />
                      <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                      {isDaarion && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          Головний
                        </span>
                      )}
                    </div>
                    {team.description && (
                      <p className="text-sm text-gray-500 line-clamp-2">{team.description}</p>
                    )}
                  </div>
                </div>

                {/* Оркестратор */}
                {orchestrator && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="w-4 h-4 text-yellow-600" />
                      <span className="text-xs font-medium text-gray-700">Оркестратор:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{orchestrator.agentId}</span>
                      {orchestrator.crewEnabled && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                          CrewAI
                        </span>
                      )}
                    </div>
                    {orchestrator.crewAgents && orchestrator.crewAgents.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Команда: {orchestrator.crewAgents.join(', ')}
                      </p>
                    )}
                  </div>
                )}

                {/* Метадані */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    {getTypeLabel(team.type)}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    team.mode === 'public'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {getModeLabel(team.mode)}
                  </span>
                </div>

                {/* Дії */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate(`/microdao/${team.slug || team.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Відкрити кабінет
                  </button>
                  <button
                    onClick={() => navigate(`/microdao/${team.slug || team.id}?tab=agents`)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                    title="Агенти"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/microdao/${team.slug || team.id}?tab=channels`)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                    title="Канали"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/microdao/${team.slug || team.id}?tab=settings`)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                    title="Налаштування"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Статистика */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Статистика</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{teams.length}</div>
            <div className="text-sm text-gray-500">Всього мікроДАО</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {teams.filter(t => t.mode === 'public').length}
            </div>
            <div className="text-sm text-gray-500">Публічних</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {AGENT_MICRODAO_MAPPING.filter(m => m.crewEnabled).length}
            </div>
            <div className="text-sm text-gray-500">З CrewAI</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {AGENT_MICRODAO_MAPPING.length}
            </div>
            <div className="text-sm text-gray-500">Оркестраторів</div>
          </div>
        </div>
      </div>
    </div>
  );
}

