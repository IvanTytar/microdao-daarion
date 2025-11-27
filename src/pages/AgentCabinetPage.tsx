import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Activity, 
  BarChart3, 
  Users, 
  Settings, 
  MessageSquare,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
  ArrowLeft,
  Play,
  Pause,
  Network,
  PlusCircle,
  Plug
} from 'lucide-react';
import { getMicroDaoByAgentId, isAgentOrchestrator } from '../utils/agentMicroDaoMapping';
import { TelegramBotConnectionCard } from '../components/agents/TelegramBotConnectionCard';

interface AgentMetrics {
  agent_id: string;
  agent_name: string;
  status: 'active' | 'inactive' | 'error';
  uptime_hours: number;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time_ms: number;
  last_active: string;
  model: string;
  model_backend: string;
  node: string;
  is_orchestrator: boolean;
  team_size: number;
  workspace?: string;
  workspace_info?: any;
  sub_agents?: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

interface CrewAICrew {
  id: string;
  name: string;
  agents: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  tasks: Array<{
    id: string;
    description: string;
    status: string;
  }>;
  status: 'active' | 'inactive';
  created_at: string;
}

const API_BASE_URL = import.meta.env.VITE_AGENT_CABINET_URL || 'http://localhost:8898';

export function AgentCabinetPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'team' | 'crews' | 'settings'>('overview');
  const [showChat, setShowChat] = useState(false);

  // Перевіряємо чи агент є оркестратором мікроДАО
  const microDaoMapping = agentId ? getMicroDaoByAgentId(agentId) : null;
  
  // Якщо агент є оркестратором мікроДАО - перенаправляємо на кабінет мікроДАО
  useEffect(() => {
    if (microDaoMapping && agentId) {
      // Перенаправляємо на кабінет мікроДАО
      navigate(`/microdao/${microDaoMapping.microDaoId}`, { replace: true });
    }
  }, [microDaoMapping, agentId, navigate]);

  // Отримуємо метрики агента
  const { data: metrics, isLoading: metricsLoading } = useQuery<AgentMetrics>({
    queryKey: ['agent-metrics', agentId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/agent/${agentId}/metrics`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    },
    enabled: !!agentId,
    refetchInterval: 30000, // Оновлення кожні 30 секунд
  });

  // Отримуємо CrewAI команди для оркестраторів
  const { data: crews, isLoading: crewsLoading } = useQuery<CrewAICrew[]>({
    queryKey: ['agent-crews', agentId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/agent/${agentId}/crews`);
      if (!response.ok) throw new Error('Failed to fetch crews');
      return response.json();
    },
    enabled: !!agentId && !!metrics?.is_orchestrator,
  });

  // Мутація для перетворення в оркестратора
  const becomeOrchestratorMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/agent/${agentId}/become-orchestrator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to become orchestrator');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-metrics', agentId] });
    },
  });

  if (metricsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Завантаження кабінету агента...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Агент не знайдено</h1>
          <button
            onClick={() => navigate('/dagi-monitor')}
            className="text-blue-600 hover:text-blue-700"
          >
            Повернутися до монітору
          </button>
        </div>
      </div>
    );
  }

  const successRate = metrics.total_requests > 0 
    ? ((metrics.successful_requests / metrics.total_requests) * 100).toFixed(1)
    : '0';

  const getStatusIcon = () => {
    switch (metrics.status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dagi-monitor')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{metrics.agent_name}</h1>
                <p className="text-sm text-gray-600">Agent ID: {metrics.agent_id}</p>
              </div>
              {getStatusIcon()}
            </div>
            <div className="flex items-center gap-3">
              {!metrics.is_orchestrator && (
                <button
                  onClick={() => becomeOrchestratorMutation.mutate()}
                  disabled={becomeOrchestratorMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  {becomeOrchestratorMutation.isPending ? 'Обробка...' : 'Стати оркестратором'}
                </button>
              )}
              {!microDaoMapping && (
                <>
                  <button
                    onClick={() => navigate('/console?create=true')}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Створити МікроДАО
                  </button>
                  <button
                    onClick={() => navigate('/console')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Network className="w-4 h-4" />
                    Підключитись до МікроДАО
                  </button>
                </>
              )}
              <button
                onClick={() => setShowChat(!showChat)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Чат з агентом
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Огляд', icon: BarChart3 },
              { id: 'metrics', label: 'Метрики', icon: Activity },
              { id: 'team', label: 'Команда', icon: Users },
              { id: 'crews', label: 'CrewAI Команди', icon: Play },
              { id: 'settings', label: 'Налаштування', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-3 flex items-center gap-2 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 font-semibold'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Детальні метрики */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Детальні метрики агента</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-gray-600">Uptime</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{metrics.uptime_hours.toFixed(1)} год</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-600">Запитів</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{metrics.total_requests.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                    <span className="text-sm text-gray-600">Успішність</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{successRate}%</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-5 h-5 text-orange-600" />
                    <span className="text-sm text-gray-600">Середній час відповіді</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{metrics.avg_response_time_ms.toFixed(0)} мс</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Успішні запити:</span>
                  <p className="text-lg font-semibold text-green-600">{metrics.successful_requests.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Невдалі запити:</span>
                  <p className="text-lg font-semibold text-red-600">{metrics.failed_requests.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Остання активність:</span>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(metrics.last_active).toLocaleString('uk-UA')}
                  </p>
                </div>
              </div>
            </div>

            <TelegramBotConnectionCard agentId={metrics.agent_id} />

            {/* Конфігурація */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Конфігурація</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Модель:</span>
                  <p className="text-lg font-semibold text-gray-900">{metrics.model}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Backend:</span>
                  <p className="text-lg font-semibold text-gray-900">{metrics.model_backend}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Нода:</span>
                  <p className="text-lg font-semibold text-gray-900">{metrics.node}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Статус:</span>
                  <p className="text-lg font-semibold text-gray-900 capitalize">{metrics.status}</p>
                </div>
                {metrics.is_orchestrator && (
                  <div>
                    <span className="text-sm text-gray-600">Розмір команди:</span>
                    <p className="text-lg font-semibold text-indigo-600">{metrics.team_size} агентів</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Детальна статистика</h2>
            <p className="text-gray-600">Тут буде детальна статистика з графіками</p>
          </div>
        )}

        {/* Team Tab - тільки для оркестраторів */}
        {activeTab === 'team' && metrics.is_orchestrator && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Команда агентів</h2>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Додати агента
              </button>
            </div>
            {metrics.sub_agents && metrics.sub_agents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ім'я
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Роль
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Дії
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {metrics.sub_agents.map((agent) => (
                      <tr key={agent.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {agent.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {agent.role}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {agent.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button className="text-red-600 hover:text-red-900">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Команда порожня. Додайте агентів до команди.</p>
            )}
          </div>
        )}

        {/* CrewAI Commands Tab - тільки для оркестраторів */}
        {activeTab === 'crews' && metrics.is_orchestrator && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">CrewAI Команди</h2>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Створити нову команду
                </button>
              </div>
              {crewsLoading ? (
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-gray-600">Завантаження команд...</p>
                </div>
              ) : crews && crews.length > 0 ? (
                <div className="space-y-4">
                  {crews.map((crew) => (
                    <div key={crew.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{crew.name}</h3>
                        <span className={`px-2 py-1 rounded text-xs ${
                          crew.status === 'active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {crew.status === 'active' ? 'Активна' : 'Неактивна'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <span className="text-sm text-gray-600">Агенти:</span>
                          <p className="text-lg font-semibold text-gray-900">{crew.agents.length}</p>
                          <ul className="mt-2 space-y-1">
                            {crew.agents.map((agent) => (
                              <li key={agent.id} className="text-sm text-gray-600">
                                • {agent.name} ({agent.role})
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Задачі:</span>
                          <p className="text-lg font-semibold text-gray-900">{crew.tasks.length}</p>
                          <ul className="mt-2 space-y-1">
                            {crew.tasks.map((task) => (
                              <li key={task.id} className="text-sm text-gray-600">
                                • {task.description}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          Створено: {new Date(crew.created_at).toLocaleString('uk-UA')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Немає створених CrewAI команд. Створіть першу команду.</p>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Налаштування агента</h2>
            <p className="text-gray-600">Тут будуть налаштування агента</p>
          </div>
        )}
      </div>

      {/* Chat Window */}
      {showChat && (
        <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50">
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <h3 className="font-semibold">Чат з {metrics.agent_name}</h3>
            <button
              onClick={() => setShowChat(false)}
              className="text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="text-sm text-gray-500 text-center">
              Чат буде доступний після інтеграції з DAGI Router
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

