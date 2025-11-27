import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, MessageSquare, FolderKanban, Settings, BarChart3, Activity, Plus, Crown, Plug, Network, PlusCircle, Bot, Zap } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTeam } from '../api/teams';
import { getChannels } from '../api/channels';
import { getAgents } from '../api/agents';
import { getNode1Agents, type Node1Agent } from '../api/node1Agents';
import { getNode2Agents, type Node2Agent } from '../api/node2Agents';
import { getCrewAgents, type CrewAgent } from '../api/crewAgents';
import { getMicroDaoWorkspace, createMicroDaoWorkspace } from '../api/workspaces';
import { DaarionCoreRoom } from '../components/daarion/DaarionCoreRoom';
import { MicroDaoMonitorChat } from '../components/monitor/MicroDaoMonitorChat';
import { MicroDaoOrchestratorChat } from '../components/microdao/MicroDaoOrchestratorChat';
import { MicroDaoOrchestratorChatEnhanced } from '../components/microdao/MicroDaoOrchestratorChatEnhanced';
import { MicroDaoManagementPanel } from '../components/microdao/MicroDaoManagementPanel';
import { getAgentByMicroDaoId, getAgentMicroDao } from '../utils/agentMicroDaoMapping';

type Tab = 'overview' | 'agents' | 'channels' | 'projects' | 'settings' | 'daarion-core' | 'microdao-management';

interface MicroDaoCabinetPageProps {
  microDaoId?: string;
}

export function MicroDaoCabinetPage({ microDaoId: propMicroDaoId }: MicroDaoCabinetPageProps = {}) {
  const { microDaoId: paramMicroDaoId } = useParams<{ microDaoId: string }>();
  const navigate = useNavigate();
  const microDaoIdParam = propMicroDaoId || paramMicroDaoId || '';
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [useEnhancedChat, setUseEnhancedChat] = useState(false); // Toggle для розширеного чату

  // Отримуємо правильний ID мікроДАО з маппінгу (якщо передано slug) - мемоізуємо
  const orchestratorMapping = useMemo(() => {
    const mapping = getAgentByMicroDaoId(microDaoIdParam);
    if (mapping) {
      console.log('Found orchestrator mapping for:', microDaoIdParam, '->', mapping?.microDaoName);
    } else {
      console.warn('No orchestrator mapping found for:', microDaoIdParam);
    }
    return mapping || null;
  }, [microDaoIdParam]);
  const microDaoId = useMemo(
    () => orchestratorMapping?.microDaoId || microDaoIdParam,
    [orchestratorMapping, microDaoIdParam]
  );

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ['team', microDaoId, orchestratorMapping?.microDaoId],
    queryFn: async () => {
      // Спочатку перевіряємо чи є маппінг - якщо є, одразу повертаємо fallback дані
      // щоб уникнути зайвих запитів до API
      if (orchestratorMapping) {
        console.log('Orchestrator mapping found, using fallback data for:', orchestratorMapping.microDaoName);
        try {
          // Все одно пробуємо отримати дані з API
          const result = await getTeam(microDaoId);
          console.log('Team data fetched from API:', result);
          return result;
        } catch (error: any) {
          // Якщо помилка - використовуємо fallback дані
          console.log('API error, using fallback data:', error);
          return {
            id: orchestratorMapping.microDaoId,
            name: orchestratorMapping.microDaoName,
            slug: orchestratorMapping.microDaoSlug,
            description: orchestratorMapping.description || `${orchestratorMapping.microDaoName} мікроДАО - платформа в екосистемі DAARION.city`,
            mode: 'public' as const,
            type: 'platform' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
      }
      
      // Якщо немає маппінгу - пробуємо отримати дані з API
      try {
        const result = await getTeam(microDaoId);
        console.log('Team data fetched from API (no mapping):', result);
        return result;
      } catch (error: any) {
        // Якщо немає маппінгу - пробуємо визначити чи це 404
        const is404 = error?.status === 404 || 
                     error?.response?.status === 404 || 
                     error?.message?.includes('404') || 
                     error?.message?.includes('not found') ||
                     error?.message?.includes('NOT_FOUND');
        if (is404) {
          console.warn('404 error and no mapping found for:', microDaoId);
          throw error;
        }
        console.error('Unknown error:', error);
        throw error;
      }
    },
    enabled: !!microDaoId,
    staleTime: 60000, // Дані вважаються свіжими 1 хвилину
    gcTime: 300000, // Кеш зберігається 5 хвилин
    refetchOnWindowFocus: false, // Не оновлювати при фокусі вікна
    retry: false, // Не повторювати запит при помилці
  });

  const { data: channelsData } = useQuery({
    queryKey: ['channels', microDaoId],
    queryFn: () => getChannels(microDaoId),
    enabled: !!microDaoId,
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const { data: agentsData } = useQuery({
    queryKey: ['agents', microDaoId],
    queryFn: async () => {
      try {
        const result = await getAgents(microDaoId);
        console.log('📥 Agents from API for', microDaoId, ':', result);
        return result;
      } catch (error) {
        console.warn('⚠️ Failed to fetch agents from API, will use NODE1 fallback:', error);
        // Повертаємо порожній список, щоб використати fallback з NODE1
        return { items: [] };
      }
    },
    enabled: !!microDaoId,
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Якщо команда не знайдена, але є маппінг - створюємо mock дані - мемоізуємо
  // ВИЗНАЧАЄМО teamData ДО використання в інших useQuery
  const teamData = useMemo(() => {
    if (team) return team;
    if (orchestratorMapping) {
      console.log('Creating fallback teamData for:', orchestratorMapping.microDaoName);
      return {
        id: orchestratorMapping.microDaoId,
        name: orchestratorMapping.microDaoName,
        slug: orchestratorMapping.microDaoSlug,
        description: orchestratorMapping.description || `${orchestratorMapping.microDaoName} мікроДАО - платформа в екосистемі DAARION.city`,
        mode: 'public' as const,
        type: 'platform' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    console.warn('No teamData and no orchestratorMapping found for:', microDaoIdParam, 'microDaoId:', microDaoId);
    return null;
  }, [team, orchestratorMapping, microDaoIdParam, microDaoId]);

  // Отримуємо агента-оркестратора для цього мікроДАО (використовуємо правильний ID) - мемоізуємо
  const orchestratorAgentId = useMemo(
    () => orchestratorMapping?.agentId,
    [orchestratorMapping]
  );

  // Отримуємо CrewAI команду агентів для оркестратора
  const { data: crewAgentsData } = useQuery({
    queryKey: ['crew-agents', orchestratorAgentId],
    queryFn: () => getCrewAgents(orchestratorAgentId || ''),
    enabled: !!orchestratorAgentId && !!orchestratorMapping?.crewEnabled,
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Отримуємо або створюємо workspace для мікроДАО
  const { data: microDaoWorkspace } = useQuery({
    queryKey: ['microdao-workspace', microDaoId, orchestratorAgentId],
    queryFn: async () => {
      // Спочатку пробуємо отримати існуючий workspace
      const existing = await getMicroDaoWorkspace(microDaoId);
      if (existing && existing.participants.length > 0) {
        return existing;
      }
      
      // Якщо workspace не існує або порожній - створюємо автоматично
      if (orchestratorAgentId && teamData) {
        // createMicroDaoWorkspace вже має fallback обробку, тому не потрібен try-catch
        const result = await createMicroDaoWorkspace(
          microDaoId,
          teamData.name,
          orchestratorAgentId
        );
        return result.workspace;
      }
      
      return null;
    },
    enabled: !!microDaoId && !!teamData,
    staleTime: 300000, // Workspace не змінюється часто
    gcTime: 600000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Отримуємо агентів з НОДИ1 для відображення оркестраторів (GREENFOOD, Helion)
  const { data: node1AgentsData } = useQuery({
    queryKey: ['node1-agents-for-microdao'],
    queryFn: async () => {
      try {
        return await getNode1Agents();
      } catch (error) {
        console.error('Error fetching node1 agents:', error);
        return null;
      }
    },
    staleTime: 60000, // Дані вважаються свіжими 1 хвилину
    gcTime: 300000, // Кеш зберігається 5 хвилин
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Отримуємо агентів з НОДИ2 для DAARION Core (50 агентів)
  const { data: node2AgentsData } = useQuery({
    queryKey: ['node2-agents-for-microdao'],
    queryFn: async () => {
      try {
        return await getNode2Agents();
      } catch (error) {
        console.error('Error fetching node2 agents:', error);
        return null;
      }
    },
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Знаходимо оркестратора серед агентів з НОДИ1 або НОДИ2 - мемоізуємо
  const orchestratorFromNodes = useMemo(() => {
    if (!orchestratorAgentId) {
      console.log('❌ No orchestratorAgentId:', orchestratorAgentId);
      return undefined;
    }
    
    // Для DAARION шукаємо в НОДА2 (daarwizz)
    if (orchestratorAgentId === 'daarwizz' && node2AgentsData?.items) {
      const found = node2AgentsData.items.find(
        (agent: Node2Agent) => 
          agent.id === 'agent-daarwizz' || 
          agent.id === 'daarwizz' ||
          agent.name.toLowerCase().includes('daarwizz')
      );
      if (found) {
        console.log('🔍 Found orchestrator from NODE2:', found.name);
        return found;
      }
    }
    
    // Для інших мікроДАО (GREENFOOD, Helion) шукаємо в НОДА1
    if (node1AgentsData?.items) {
      const found = node1AgentsData.items.find(
        (agent: Node1Agent) => {
          // Точне співпадіння ID
          if (agent.id === orchestratorAgentId || agent.id === `agent-${orchestratorAgentId}`) return true;
          // Спеціальні випадки для кожного агента
          if (orchestratorAgentId === 'greenfood' && agent.id === 'agent-greenfood-assistant') return true;
          if (orchestratorAgentId === 'helion' && agent.id === 'agent-helion') return true;
          // Перевірка за назвою
          if (orchestratorMapping && agent.name.toLowerCase().includes(orchestratorMapping.microDaoName.toLowerCase())) return true;
          return false;
        }
      );
      
      if (found) {
        console.log('🔍 Found orchestrator from NODE1:', found.name);
        return found;
      }
    }
    
    console.log('❌ Orchestrator NOT FOUND for:', orchestratorAgentId);
    return undefined;
  }, [node1AgentsData, node2AgentsData, orchestratorAgentId, orchestratorMapping]);

  // Об'єднуємо агенти з API та з НОДИ1/НОДИ2 + ФІЛЬТРУЄМО за мікроДАО - мемоізуємо
  const allAgents = useMemo(() => {
    const baseAgents = agentsData?.items || [];
    
    console.log('🔄 Combining agents:', {
      baseAgents: baseAgents.length,
      hasOrchestrator: !!orchestratorFromNodes,
      orchestratorName: orchestratorFromNodes?.name,
      totalNode1Agents: node1AgentsData?.items?.length || 0,
      totalNode2Agents: node2AgentsData?.items?.length || 0,
      microDaoId,
    });
    
    // Функція для фільтрації агентів за мікроДАО
    const filterAgentsByMicroDao = (agents: any[]) => {
      return agents.filter((agent) => {
        const agentMicroDao = getAgentMicroDao(agent);
        const belongs = agentMicroDao === microDaoId;
        
        if (!belongs) {
          console.log(`🚫 Filtering out agent ${agent.name} (belongs to ${agentMicroDao}, not ${microDaoId})`);
        }
        
        return belongs;
      });
    };
    
    // Для DAARION: всі агенти з НОДА2 + агенти з НОДА1, які не належать іншим мікроДАО
    if (baseAgents.length === 0 && microDaoId === 'daarion-dao') {
      const node2Agents = (node2AgentsData?.items || []).map((agent: Node2Agent) => ({
        id: agent.id,
        name: agent.name,
        role: agent.role || 'Агент',
        language: 'uk',
        focus: agent.category || agent.department || 'Core',
        enabled: agent.status === 'active' || agent.deployment_status?.deployed === true,
        type: (agent.type || 'worker') as 'worker' | 'orchestrator',
        department: agent.department,
        category: agent.category,
        node2Agent: agent,
      }));
      
      const node1FilteredAgents = filterAgentsByMicroDao(
        (node1AgentsData?.items || []).map((agent: Node1Agent) => ({
          id: agent.id,
          name: agent.name,
          role: agent.role || 'Агент',
          language: 'uk',
          focus: agent.category || agent.department || 'Core',
          enabled: agent.status === 'active' || agent.deployment_status?.deployed === true,
          type: (agent.type || 'worker') as 'worker' | 'orchestrator',
          department: agent.department,
          category: agent.category,
          node1Agent: agent,
        }))
      );
      
      const daarionAgents = [...node2Agents, ...node1FilteredAgents];
      console.log(`✅ Using ${node2Agents.length} NODE2 agents + ${node1FilteredAgents.length} NODE1 agents for DAARION (total: ${daarionAgents.length})`);
      return daarionAgents;
    }
    
    // Для GREENFOOD: тільки агенти з department: 'GreenFood'
    if (baseAgents.length === 0 && microDaoId === 'greenfood-dao' && node1AgentsData?.items) {
      const greenfoodAgents = filterAgentsByMicroDao(
        node1AgentsData.items.map((agent: Node1Agent) => ({
          id: agent.id,
          name: agent.name,
          role: agent.role || 'Агент',
          language: 'uk',
          focus: agent.category || agent.department || 'GreenFood',
          enabled: agent.status === 'active' || agent.deployment_status?.deployed === true,
          type: (agent.type || 'worker') as 'worker' | 'orchestrator',
          department: agent.department,
          category: agent.category,
          node1Agent: agent,
        }))
      );
      console.log(`✅ Using ${greenfoodAgents.length} GREENFOOD agents from NODE1`);
      return greenfoodAgents;
    }
    
    // Для ENERGY UNION: тільки Helion
    if (baseAgents.length === 0 && microDaoId === 'energy-union-dao' && node1AgentsData?.items) {
      const energyAgents = filterAgentsByMicroDao(
        node1AgentsData.items.map((agent: Node1Agent) => ({
          id: agent.id,
          name: agent.name,
          role: agent.role || 'Агент',
          language: 'uk',
          focus: agent.category || agent.department || 'Energy',
          enabled: agent.status === 'active' || agent.deployment_status?.deployed === true,
          type: (agent.type || 'worker') as 'worker' | 'orchestrator',
          department: agent.department,
          category: agent.category,
          node1Agent: agent,
        }))
      );
      console.log(`✅ Using ${energyAgents.length} ENERGY UNION agents from NODE1`);
      return energyAgents;
    }
    
    // Для Yaromir: тільки Yaromir команда
    if (baseAgents.length === 0 && microDaoId === 'yaromir-dao' && node1AgentsData?.items) {
      const yaromirAgents = filterAgentsByMicroDao(
        node1AgentsData.items.map((agent: Node1Agent) => ({
          id: agent.id,
          name: agent.name,
          role: agent.role || 'Агент',
          language: 'uk',
          focus: agent.category || agent.department || 'Yaromir',
          enabled: agent.status === 'active' || agent.deployment_status?.deployed === true,
          type: (agent.type || 'worker') as 'worker' | 'orchestrator',
          department: agent.department,
          category: agent.category,
          node1Agent: agent,
        }))
      );
      console.log(`✅ Using ${yaromirAgents.length} Yaromir agents from NODE1`);
      return yaromirAgents;
    }
    
    // Якщо є оркестратор, додаємо його до списку (якщо ще немає)
    if (orchestratorFromNodes) {
      const orchestratorExists = baseAgents.some((a: any) => a.id === orchestratorFromNodes.id);
      if (!orchestratorExists) {
        console.log('➕ Adding orchestrator to agents list:', orchestratorFromNodes.name);
        return [
          ...baseAgents,
          {
            id: orchestratorFromNodes.id,
            name: orchestratorFromNodes.name,
            role: orchestratorFromNodes.role || 'Оркестратор мікроДАО',
            language: 'uk',
            focus: orchestratorFromNodes.category || 'Оркестрація',
            enabled: orchestratorFromNodes.status === 'active' || orchestratorFromNodes.deployment_status?.deployed === true,
            type: 'orchestrator' as const,
            department: orchestratorFromNodes.department,
            category: orchestratorFromNodes.category,
            node1Agent: 'node1Agent' in orchestratorFromNodes ? orchestratorFromNodes : undefined,
            node2Agent: 'node2Agent' in orchestratorFromNodes ? orchestratorFromNodes : undefined,
          },
        ];
      }
    }
    
    return baseAgents;
  }, [agentsData?.items, orchestratorFromNodes, node1AgentsData?.items, node2AgentsData?.items, microDaoId]);


  // Показуємо завантаження тільки якщо немає даних і немає маппінгу
  // Але якщо є orchestratorMapping, не показуємо завантаження - одразу використовуємо fallback
  if (teamLoading && !teamData && !orchestratorMapping) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Завантаження...</p>
        </div>
      </div>
    );
  }

  // Якщо немає teamData, але є orchestratorMapping - створюємо fallback дані
  if (!teamData) {
    // Якщо є маппінг, але teamData все ще null - створюємо його вручну
    if (orchestratorMapping) {
      console.log('Creating teamData from orchestratorMapping (fallback)');
      const fallbackTeamData = {
        id: orchestratorMapping.microDaoId,
        name: orchestratorMapping.microDaoName,
        slug: orchestratorMapping.microDaoSlug,
        description: orchestratorMapping.description || `${orchestratorMapping.microDaoName} мікроДАО - платформа в екосистемі DAARION.city`,
        mode: 'public' as const,
        type: 'platform' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      // Використовуємо fallback дані для відображення
      return (
        <>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => navigate('/console')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{fallbackTeamData.name}</h1>
                    {fallbackTeamData.description && (
                      <p className="text-sm text-gray-500 mt-1">{fallbackTeamData.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">ID: {fallbackTeamData.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    fallbackTeamData.mode === 'public'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {fallbackTeamData.mode === 'public' ? 'Публічне' : 'Приватне'}
                  </span>
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
                  { id: 'agents', label: 'Агенти', icon: Users },
                  { id: 'channels', label: 'Канали', icon: MessageSquare },
                  { id: 'projects', label: 'Проєкти', icon: FolderKanban },
                  { id: 'settings', label: 'Налаштування', icon: Settings },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as Tab)}
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
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{fallbackTeamData.name}</h2>
              <p className="text-gray-600">{fallbackTeamData.description}</p>
              <p className="text-sm text-gray-500 mt-4">Використовуються fallback дані. API не відповідає.</p>
            </div>
          </div>
        </div>
        <MicroDaoMonitorChat microDaoId={fallbackTeamData.id} microDaoName={fallbackTeamData.name} />
        </>
      );
    }
    
    // Якщо немає маппінгу - показуємо помилку
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">МікроДАО не знайдено</h1>
          <p className="text-gray-600 mb-4">ID: {microDaoId} | Param: {microDaoIdParam}</p>
          <button
            onClick={() => navigate('/console')}
            className="text-blue-600 hover:text-blue-700"
          >
            Повернутися до консолі
          </button>
        </div>
      </div>
    );
  }

  const channels = channelsData?.channels || [];

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/console')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{teamData.name}</h1>
                {teamData.description && (
                  <p className="text-sm text-gray-500 mt-1">{teamData.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">ID: {teamData.id}</p>
                {microDaoWorkspace && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Робочий простір: {microDaoWorkspace.name} ({microDaoWorkspace.participants.length} учасників)
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/nodes')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plug className="w-4 h-4" />
                Підключити НОДУ
              </button>
              <button
                onClick={() => navigate('/console')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Network className="w-4 h-4" />
                Підключитись до МікроДАО
              </button>
              <button
                onClick={() => navigate('/console?create=true')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Створити нову МікроДАО
              </button>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                teamData.mode === 'public'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {teamData.mode === 'public' ? 'Публічне' : 'Приватне'}
              </span>
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
              { id: 'agents', label: 'Агенти', icon: Users },
              { id: 'channels', label: 'Канали', icon: MessageSquare },
              { id: 'projects', label: 'Проєкти', icon: FolderKanban },
              { id: 'microdao-management', label: 'Управління мікроДАО', icon: Network },
              { id: 'daarion-core', label: 'DAARION Core', icon: Crown },
              { id: 'settings', label: 'Налаштування', icon: Settings },
            ].filter((tab) => {
              // Показуємо вкладку DAARION Core тільки для DAARION мікроДАО
              if (tab.id === 'daarion-core') {
                const isDaarion = teamData.id === 'daarion-dao' || 
                                 teamData.slug === 'daarion' || 
                                 teamData.name.toLowerCase().includes('daarion');
                return isDaarion;
              }
              // Показуємо вкладку "Управління мікроДАО" тільки для DAARION мікроДАО
              if (tab.id === 'microdao-management') {
                const isDaarion = teamData.id === 'daarion-dao' || 
                                 teamData.slug === 'daarion' || 
                                 teamData.name.toLowerCase().includes('daarion');
                return isDaarion;
              }
              return true;
            }).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
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
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Агенти</span>
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{allAgents.length}</div>
                <p className="text-sm text-gray-500 mt-1">Активних агентів</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Канали</span>
                  <MessageSquare className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{channels.length}</div>
                <p className="text-sm text-gray-500 mt-1">Каналів комунікації</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Тип</span>
                  <Settings className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-lg font-bold text-gray-900 capitalize">
                  {teamData.type || 'community'}
                </div>
                <p className="text-sm text-gray-500 mt-1">Тип мікроДАО</p>
              </div>
            </div>

            {/* Робочий простір мікроДАО */}
            {microDaoWorkspace && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Робочий простір
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">{microDaoWorkspace.description || 'Робочий простір для команди мікроДАО'}</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Учасники ({microDaoWorkspace.participants.length})</h3>
                    <div className="space-y-2">
                      {microDaoWorkspace.participants.map((participant) => {
                        const agent = allAgents.find((a: any) => a.id === participant.agent_id);
                        return (
                          <div key={participant.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
                                {participant.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900">{participant.name}</p>
                              <p className="text-xs text-gray-500">{participant.role}</p>
                            </div>
                            {agent && (
                              <span className={`px-2 py-1 rounded text-xs ${
                                agent.status === 'active' || agent.status === 'deployed'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {agent.status === 'deployed' ? 'Деплой' : agent.status === 'active' ? 'Активний' : 'Неактивний'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Чат з оркестратором мікроДАО - на головній сторінці */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 pb-0 flex items-center justify-between border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Чат з оркестратором мікроДАО
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">
                    {useEnhancedChat ? '🚀 Розширений' : '💬 Базовий'}
                  </span>
                  <button
                    onClick={() => setUseEnhancedChat(!useEnhancedChat)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                      useEnhancedChat ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                    title={useEnhancedChat ? 'Вимкнути розширений режим' : 'Увімкнути розширений режим (Images, Files, Web Search, Voice, Knowledge Base)'}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        useEnhancedChat ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
              <div className="p-6">
                {useEnhancedChat ? (
                  <MicroDaoOrchestratorChatEnhanced 
                    orchestratorAgentId={orchestratorAgentId || allAgents.find((a: any) => a.type === 'orchestrator' || a.role?.toLowerCase().includes('orchestrator'))?.id}
                  />
                ) : (
                  <MicroDaoOrchestratorChat 
                    microDaoId={teamData.id}
                    orchestratorAgentId={orchestratorAgentId || allAgents.find((a: any) => a.type === 'orchestrator' || a.role?.toLowerCase().includes('orchestrator'))?.id}
                  />
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Швидкі дії</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => navigate(`/teams/${teamData.id}`)}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <MessageSquare className="w-6 h-6 text-blue-600 mb-2" />
                  <h3 className="font-semibold text-gray-900">Відкрити чат</h3>
                  <p className="text-sm text-gray-500 mt-1">Перейти до каналів</p>
                </button>
                <button
                  onClick={() => setActiveTab('agents')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <Users className="w-6 h-6 text-green-600 mb-2" />
                  <h3 className="font-semibold text-gray-900">Управління агентами</h3>
                  <p className="text-sm text-gray-500 mt-1">Налаштувати агентів</p>
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <Settings className="w-6 h-6 text-purple-600 mb-2" />
                  <h3 className="font-semibold text-gray-900">Налаштування</h3>
                  <p className="text-sm text-gray-500 mt-1">Змінити параметри</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="space-y-6">
            {/* Основні агенти */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Агенти</h2>
                <button
                  onClick={() => navigate(`/teams/${teamData.id}/agents/create`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Додати агента
                </button>
              </div>
              <div className="p-6">
                {allAgents.length > 0 ? (
                  <div className="space-y-4">
                    {allAgents.map((agent: any) => {
                      const isOrchestrator = agent.type === 'orchestrator' || orchestratorAgentId === agent.id;
                      return (
                        <div
                          key={agent.id}
                          className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                            isOrchestrator ? 'border-purple-300 bg-purple-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {isOrchestrator && (
                              <div className="bg-purple-100 p-2 rounded-lg">
                                <Crown className="w-5 h-5 text-purple-600" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                                {isOrchestrator && (
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                                    Оркестратор
                                  </span>
                                )}
                                {isOrchestrator && orchestratorMapping?.crewEnabled && (
                                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">
                                    CrewAI
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                Роль: {agent.role || 'N/A'} | Мова: {agent.language || 'uk'} | Фокус: {agent.focus || 'N/A'}
                              </p>
                              {agent.node1Agent && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Модель: {agent.node1Agent.model || 'N/A'} | Нода: НОДА1 | Статус: {agent.node1Agent.status}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => navigate(`/agent/${agent.id}`)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                            >
                              <Bot className="w-4 h-4" />
                              Кабінет
                            </button>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              agent.enabled
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {agent.enabled ? 'Активний' : 'Неактивний'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">Немає агентів</p>
                    <button
                      onClick={() => navigate(`/teams/${teamData.id}/agents/create`)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Створити першого агента
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Команда CrewAI агентів */}
            {orchestratorMapping?.crewEnabled && crewAgentsData && crewAgentsData.crew_enabled && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-indigo-600" />
                        Команда CrewAI агентів
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        {crewAgentsData.total} агентів у команді {crewAgentsData.orchestrator_name}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {crewAgentsData.agents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {crewAgentsData.agents.map((agent: CrewAgent) => (
                        <div
                          key={agent.id}
                          className="p-4 border border-indigo-200 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                            {agent.category && (
                              <span className="px-2 py-0.5 bg-indigo-200 text-indigo-800 rounded text-xs">
                                {agent.category}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-indigo-700 mb-1">{agent.role}</p>
                          {agent.description && (
                            <p className="text-xs text-gray-600 mt-2">{agent.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Bot className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p>Команда CrewAI агентів порожня</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'channels' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Канали</h2>
              <button
                onClick={() => navigate(`/teams/${teamData.id}/channels/create`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Створити канал
              </button>
            </div>
            <div className="p-6">
              {channels.length > 0 ? (
                <div className="space-y-4">
                  {channels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => navigate(`/teams/${teamData.id}/channels/${channel.id}`)}
                      className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <div>
                        <h3 className="font-semibold text-gray-900">{channel.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Тип: {channel.type === 'public' ? 'Публічний' : 'Приватний'}
                        </p>
                      </div>
                      <MessageSquare className="w-5 h-5 text-gray-400" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Немає каналів</p>
                  <button
                    onClick={() => navigate(`/teams/${teamData.id}/channels/create`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Створити перший канал
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Проєкти</h2>
            </div>
            <div className="p-6">
              <div className="text-center py-12">
                <FolderKanban className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Функція проєктів буде доступна найближчим часом</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'microdao-management' && (
          <MicroDaoManagementPanel />
        )}

        {activeTab === 'daarion-core' && (
          <DaarionCoreRoom />
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Налаштування</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Назва мікроДАО
                </label>
                <input
                  type="text"
                  value={teamData.name}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Опис
                </label>
                <textarea
                  value={teamData.description || ''}
                  disabled
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Режим
                </label>
                <select
                  value={teamData.mode}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                >
                  <option value="public">Публічне</option>
                  <option value="confidential">Приватне</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тип
                </label>
                <input
                  type="text"
                  value={teamData.type || 'community'}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 capitalize"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    {teamData && <MicroDaoMonitorChat microDaoId={teamData.id} microDaoName={teamData.name} />}
    </>
  );
}

