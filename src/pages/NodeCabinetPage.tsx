import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Server, Activity, Cpu, HardDrive, Network, Users, Settings, BarChart3, Plug, RefreshCw, CheckCircle2, XCircle, AlertCircle, Filter, Play, Loader2, Wrench, Download, Bot, Database, AlertTriangle, PlusCircle, Boxes, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../api/client';
import { getNode2Agents, type Node2Agent } from '../api/node2Agents';
import { getNode1Agents, type Node1Agent } from '../api/node1Agents';
import { deployAgentToNode2, deployAllAgentsToNode2, checkNode2AgentsDeployment } from '../api/node2Deployment';
import { SwapperStatusCard, SwapperMetricsSummary } from '../components/swapper/SwapperComponents';
import { SwapperDetailedMetrics } from '../components/swapper/SwapperDetailedMetrics';
import { getNodeInventory, type NodeInventory } from '../api/nodeInventory';
import { NodeMonitorChat } from '../components/monitor/NodeMonitorChat';
import '../styles/swapper.css';

interface NodeDetails {
  node_id: string;
  node_name: string;
  ip_address: string;
  role: string;
  status: string;
  agents?: Array<{
    id: string;
    name: string;
    status: string;
    model: string;
  }>;
  services?: Array<{
    name: string;
    status: string;
    port: number;
    url: string;
  }>;
  plugins?: Array<{
    name: string;
    version: string;
    enabled: boolean;
  }>;
  metrics?: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    network_in: number;
    network_out: number;
  };
  microdaos?: Array<{
    id: string;
    name: string;
    slug: string;
    role?: string;
  }>;
  guardian_agent?: {
    id: string;
    name: string;
    slug?: string;
    status?: string;
  };
  steward_agent?: {
    id: string;
    name: string;
    slug?: string;
    status?: string;
  };
}

// Grafana та Prometheus URLs (налаштувати під ваші сервери)
const GRAFANA_URL = import.meta.env.VITE_GRAFANA_URL || 'http://localhost:3000';
const PROMETHEUS_URL = import.meta.env.VITE_PROMETHEUS_URL || 'http://localhost:9090';

export function NodeCabinetPage() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'services' | 'metrics' | 'plugins' | 'inventory'>('overview');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [refreshingAgents, setRefreshingAgents] = useState(false);
  const [deployingAgents, setDeployingAgents] = useState<Set<string>>(new Set());
  const [deploymentStatus, setDeploymentStatus] = useState<{ total: number; deployed: number; unhealthy: number; unknown: number } | null>(null);

  // Отримуємо агенти з НОДА1
  const { data: node1AgentsData, isLoading: isLoadingNode1Agents, refetch: refetchNode1Agents } = useQuery({
    queryKey: ['node1-agents', nodeId],
    queryFn: async () => {
      if (nodeId === 'node-1-hetzner-gex44' || nodeId?.includes('node-1')) {
        return await getNode1Agents();
      }
      return null;
    },
    enabled: !!nodeId && (nodeId === 'node-1-hetzner-gex44' || nodeId?.includes('node-1')),
    refetchInterval: 30000, // Оновлення кожні 30 секунд
  });

  // Отримуємо агенти з НОДА2
  const { data: node2AgentsData, isLoading: isLoadingNode2Agents, refetch: refetchNode2Agents } = useQuery({
    queryKey: ['node2-agents', nodeId],
    queryFn: async () => {
      if (nodeId === 'node-2' || nodeId?.includes('node-2')) {
        return await getNode2Agents();
      }
      return null;
    },
    enabled: !!nodeId && (nodeId === 'node-2' || nodeId?.includes('node-2')),
    refetchInterval: 30000, // Оновлення кожні 30 секунд
  });

  // Визначаємо які агенти використовувати
  const isNode1 = nodeId === 'node-1-hetzner-gex44' || nodeId?.includes('node-1');
  const agentsData = isNode1 ? node1AgentsData : node2AgentsData;
  const isLoadingAgents = isNode1 ? isLoadingNode1Agents : isLoadingNode2Agents;
  const refetchAgents = isNode1 ? refetchNode1Agents : refetchNode2Agents;

  // Отримуємо інвентаризацію ноди
  const { data: inventory, isLoading: isLoadingInventory } = useQuery<NodeInventory>({
    queryKey: ['node-inventory', nodeId],
    queryFn: () => getNodeInventory(nodeId || ''),
    enabled: !!nodeId,
    refetchInterval: 60000, // Оновлення кожну хвилину
  });

  // Отримуємо детальну інформацію про ноду
  const { data: nodeDetails, isLoading } = useQuery({
    queryKey: ['node', nodeId],
    queryFn: async (): Promise<NodeDetails> => {
      const agents = agentsData?.items || [];
      const isNode1 = nodeId?.includes('node-1');
      
      // Отримуємо профіль з API (для MicroDAOs та агентів)
      let apiNodeProfile: any = null;
      try {
          apiNodeProfile = await apiGet(`/public/nodes/${nodeId}`);
      } catch (e) {
          console.warn('Failed to fetch node profile from API', e);
      }
      
      // Отримуємо реальні дані з інвентаризації
      const inv = inventory;
      
      // Визначаємо статус на основі проблемних сервісів
      let status: 'online' | 'offline' | 'degraded' = 'online';
      if (inv?.problematic_services && inv.problematic_services.length > 0) {
        const critical = inv.problematic_services.filter(s => s.priority === 'critical');
        status = critical.length > 0 ? 'degraded' : 'online';
      }
      
      // Формуємо список сервісів з інвентаризації
      const services: Array<{ name: string; status: string; port: number; url: string }> = [];
      
      if (inv) {
        // Healthy сервіси
        inv.docker_containers.healthy.forEach(container => {
          const port = container.ports?.[0]?.split(':')[0] || '';
          services.push({
            name: container.name.replace('dagi-', '').replace('-', ' '),
            status: 'running',
            port: parseInt(port) || 0,
            url: isNode1 
              ? `http://144.76.224.179:${port}`
              : `http://192.168.1.244:${port}`,
          });
        });
        
        // Running сервіси
        inv.docker_containers.up.forEach(container => {
          const port = container.ports?.[0]?.split(':')[0] || '';
          services.push({
            name: container.name.replace('dagi-', '').replace('-', ' '),
            status: 'running',
            port: parseInt(port) || 0,
            url: isNode1 
              ? `http://144.76.224.179:${port}`
              : `http://192.168.1.244:${port}`,
          });
        });
        
        // Problematic сервіси
        inv.docker_containers.problematic.forEach(container => {
          const port = container.ports?.[0]?.split(':')[0] || '';
          services.push({
            name: container.name.replace('dagi-', '').replace('-', ' '),
            status: container.state === 'restarting' ? 'restarting' : 'unhealthy',
            port: parseInt(port) || 0,
            url: isNode1 
              ? `http://144.76.224.179:${port}`
              : `http://192.168.1.244:${port}`,
          });
        });
      } else {
        // Fallback дані
        services.push(
          { name: 'Swapper Service', status: 'running', port: 8890, url: isNode1 ? 'http://144.76.224.179:8890' : 'http://192.168.1.244:8890' },
          { name: 'Node Registry', status: 'running', port: 9205, url: isNode1 ? 'http://144.76.224.179:9205' : 'http://192.168.1.244:9205' },
          { name: 'NATS JetStream', status: 'running', port: 4222, url: 'nats://localhost:4222' }
        );
      }
      
      return {
        node_id: nodeId || '',
        node_name: isNode1 ? 'НОДА1' : 'НОДА2',
        ip_address: isNode1 ? '144.76.224.179' : '192.168.1.244',
        role: isNode1 ? 'production' : 'development',
        status,
        agents: agents.map(agent => ({
          id: agent.id,
          name: agent.name,
          status: agent.status,
          model: agent.model,
        })),
        services,
        plugins: [
          { name: 'Ollama Plugin', version: '1.0.0', enabled: true },
          { name: 'OpenAI Plugin', version: '1.0.0', enabled: true },
          { name: 'DeepSeek Plugin', version: '1.0.0', enabled: true },
        ],
        metrics: inv?.statistics ? {
          cpu_usage: 45, // Буде оновлюватися з реальних метрик
          memory_usage: 62,
          disk_usage: 38,
          network_in: 1250,
          network_out: 890,
        } : {
          cpu_usage: 45,
          memory_usage: 62,
          disk_usage: 38,
          network_in: 1250,
          network_out: 890,
        },
        microdaos: apiNodeProfile?.microdaos || [],
        guardian_agent: apiNodeProfile?.guardian_agent,
        steward_agent: apiNodeProfile?.steward_agent,
      };
    },
    enabled: !!nodeId,
    refetchInterval: 60000, // Оновлення кожну хвилину
  });

  // Фільтрація агентів по командах
  const filteredAgents = agentsData?.items.filter(agent => {
    if (agentFilter === 'all') return true;
    return agent.department?.toLowerCase() === agentFilter.toLowerCase();
  }) || [];

  // Отримуємо унікальні команди
  const departments = Array.from(new Set(agentsData?.items.map(a => a.department).filter(Boolean) || []));

  const handleRefreshAgents = async () => {
    setRefreshingAgents(true);
    if (isNode1) {
      await refetchNode1Agents();
    } else {
      await refetchNode2Agents();
      // Оновлюємо статус деплою для НОДА2
      const status = await checkNode2AgentsDeployment();
      setDeploymentStatus(status);
    }
    setRefreshingAgents(false);
  };

  const handleDeployAgent = async (agentId: string) => {
    setDeployingAgents(prev => new Set(prev).add(agentId));
    try {
      const result = await deployAgentToNode2(agentId);
      if (result.success) {
        // Оновлюємо список агентів
        if (isNode1) {
          await refetchNode1Agents();
        } else {
          await refetchNode2Agents();
        }
        // Оновлюємо статус деплою
        if (!isNode1) {
          const status = await checkNode2AgentsDeployment();
          setDeploymentStatus(status);
        }
      } else {
        alert(`Помилка деплою: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deploying agent:', error);
      alert('Помилка при деплої агента');
    } finally {
      setDeployingAgents(prev => {
        const next = new Set(prev);
        next.delete(agentId);
        return next;
      });
    }
  };

  const handleDeployAllAgents = async () => {
    if (!agentsData?.items) return;
    
    // Фільтруємо тільки не задеплоєних агентів
    const undeployedAgents = agentsData.items.filter(
      agent => !agent.deployment_status?.deployed || agent.deployment_status?.health_check === 'unhealthy'
    );

    if (undeployedAgents.length === 0) {
      alert('✅ Всі агенти вже задеплоєні!');
      return;
    }
    
    const confirmDeploy = window.confirm(
      `Ви впевнені, що хочете задеплоїти ${undeployedAgents.length} агентів на НОДА2?\n\n` +
      `(Всього агентів: ${agentsData.items.length}, вже задеплоєно: ${agentsData.items.length - undeployedAgents.length})`
    );
    
    if (!confirmDeploy) return;

    setRefreshingAgents(true);
    try {
      console.log(`🚀 Початок деплою ${undeployedAgents.length} агентів...`);
      const result = await deployAllAgentsToNode2(undeployedAgents);
      
      const message = `Деплой завершено!\n\n` +
        `✅ Успішно задеплоєно: ${result.success}\n` +
        `❌ Помилок: ${result.failed}\n` +
        `📦 Всього оброблено: ${undeployedAgents.length}`;
      
      alert(message);
      console.log('📊 Результати деплою:', result);
      
      // Оновлюємо список агентів
      await refetchNode2Agents();
      // Оновлюємо статус деплою
      const status = await checkNode2AgentsDeployment();
      setDeploymentStatus(status);
    } catch (error) {
      console.error('Error deploying all agents:', error);
      alert(`Помилка при деплої агентів: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRefreshingAgents(false);
    }
  };

  // Завантажуємо статус деплою при завантаженні сторінки НОДА2
  useEffect(() => {
    if ((nodeId === 'node-2' || nodeId?.includes('node-2')) && !deploymentStatus) {
      checkNode2AgentsDeployment().then(setDeploymentStatus);
    }
  }, [nodeId, deploymentStatus]);

  // Автоматичний деплой всіх не задеплоєних агентів при завантаженні сторінки НОДА2
  useEffect(() => {
    let isMounted = true;
    let hasDeployed = false; // Прапорець щоб не деплоїти двічі
    
    const autoDeploy = async () => {
      // Перевіряємо чи це НОДА2 та чи є агенти
      if ((nodeId === 'node-2' || nodeId?.includes('node-2')) && agentsData?.items && isMounted && !hasDeployed) {
        // Чекаємо трохи, щоб дані встигли завантажитися
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (!isMounted || hasDeployed) return;
        
        // Фільтруємо не задеплоєних агентів
        const undeployedAgents = agentsData.items.filter(
          agent => !agent.deployment_status?.deployed || agent.deployment_status?.health_check === 'unhealthy'
        );

        if (undeployedAgents.length > 0 && isMounted && !hasDeployed) {
          hasDeployed = true; // Встановлюємо прапорець
          console.log(`🚀 Знайдено ${undeployedAgents.length} не задеплоєних агентів. Запускаю автоматичний деплой...`);
          console.log(`📋 Агенти для деплою:`, undeployedAgents.map(a => a.name).join(', '));
          
          // Автоматично запускаємо деплой без підтвердження
          try {
            setRefreshingAgents(true);
            const result = await deployAllAgentsToNode2(undeployedAgents);
            
            if (isMounted) {
              console.log(`✅ Деплой завершено: ${result.success} успішно, ${result.failed} помилок`);
              
              // Виводимо детальні результати
              if (result.results.length > 0) {
                console.log('📊 Детальні результати:');
                result.results.forEach((r, i) => {
                  const agent = undeployedAgents[i];
                  const status = r.success ? '✅' : '❌';
                  console.log(`${status} ${agent.name} (${agent.id}): ${r.message}`);
                });
              }
              
              // Оновлюємо список агентів
              await refetchNode2Agents();
              // Оновлюємо статус деплою
              const status = await checkNode2AgentsDeployment();
              setDeploymentStatus(status);
            }
          } catch (error) {
            if (isMounted) {
              console.error('❌ Помилка при автоматичному деплої:', error);
            }
          } finally {
            if (isMounted) {
              setRefreshingAgents(false);
            }
          }
        } else if (isMounted) {
          console.log('✅ Всі агенти вже задеплоєні!');
        }
      }
    };

    // Запускаємо автоматичний деплой тільки один раз при завантаженні
    const timer = setTimeout(autoDeploy, 3000);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [nodeId, agentsData, refetchNode2Agents]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Завантаження...</p>
        </div>
      </div>
    );
  }

  if (!nodeDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ноду не знайдено</h1>
          <button
            onClick={() => navigate('/nodes')}
            className="text-blue-600 hover:text-blue-700"
          >
            Повернутися до списку нод
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/nodes')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <Server className="w-6 h-6 text-blue-600" />
                  {nodeDetails.node_name}
                </h1>
                <p className="text-sm text-gray-500 mt-1">{nodeDetails.node_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/console')}
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
              <span className={`w-3 h-3 rounded-full ${
                nodeDetails.status === 'online' ? 'bg-green-500' :
                nodeDetails.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="font-semibold text-gray-700">
                {nodeDetails.status === 'online' ? 'Онлайн' :
                 nodeDetails.status === 'degraded' ? 'Деградовано' : 'Офлайн'}
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
              { id: 'services', label: 'Сервіси', icon: Settings },
              { id: 'inventory', label: 'Інвентаризація', icon: Server },
              { id: 'plugins', label: 'Плагіни', icon: Plug },
              { id: 'metrics', label: 'Метрики', icon: Activity },
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
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">CPU</span>
                  <Cpu className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{nodeDetails.metrics?.cpu_usage || 0}%</div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{ width: `${nodeDetails.metrics?.cpu_usage || 0}%` }}
                  />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Пам'ять</span>
                  <HardDrive className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{nodeDetails.metrics?.memory_usage || 0}%</div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-600 transition-all"
                    style={{ width: `${nodeDetails.metrics?.memory_usage || 0}%` }}
                  />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Диск</span>
                  <HardDrive className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{nodeDetails.metrics?.disk_usage || 0}%</div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 transition-all"
                    style={{ width: `${nodeDetails.metrics?.disk_usage || 0}%` }}
                  />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Мережа</span>
                  <Network className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {(nodeDetails.metrics?.network_in || 0) + (nodeDetails.metrics?.network_out || 0)} MB/s
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  ↓ {nodeDetails.metrics?.network_in || 0} MB/s ↑ {nodeDetails.metrics?.network_out || 0} MB/s
                </div>
              </div>
              </div>
            </div>

            {/* Core Runtime & Participation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Core Runtime */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Core Runtime
                </h3>
                <div className="space-y-3">
                  {[
                    { name: 'Node Registry', icon: Database },
                    { name: 'NATS JetStream', icon: Network },
                    { name: 'Swapper Service', icon: RefreshCw },
                    { name: 'Ollama', icon: Bot },
                  ].map((service) => {
                    const s = nodeDetails.services?.find(s => s.name.includes(service.name) || (service.name === 'Ollama' && s.name.includes('ollama')));
                    const status = s?.status === 'running' ? 'online' : 'offline'; // Simple mapping
                    const Icon = service.icon;
                    
                    return (
                      <div key={service.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-700">{service.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <span className="text-sm text-gray-600">{status === 'online' ? 'Active' : 'Unknown'}</span>
                        </div>
                      </div>
                    );
                  })}
                   {/* Guardian & Steward */}
                   <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100">
                        <div className="flex items-center gap-3">
                          <Shield className="w-4 h-4 text-purple-600" />
                          <span className="font-medium text-purple-900">Guardian Agent</span>
                        </div>
                        <span className="text-sm font-medium text-purple-700">
                          {nodeDetails.guardian_agent?.name || 'Not active'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                         <div className="flex items-center gap-3">
                          <Users className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-blue-900">Steward Agent</span>
                        </div>
                        <span className="text-sm font-medium text-blue-700">
                          {nodeDetails.steward_agent?.name || 'Not active'}
                        </span>
                      </div>
                   </div>
                </div>
              </div>

              {/* Participation */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-green-600" />
                  Participation
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2 uppercase">Hosted MicroDAOs</h4>
                    {nodeDetails.microdaos && nodeDetails.microdaos.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2">
                        {nodeDetails.microdaos.map(dao => (
                          <div key={dao.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-lg">
                            <span className="font-medium text-green-900">{dao.name}</span>
                            <span className="text-xs px-2 py-1 bg-white text-green-700 rounded border border-green-200">
                              Hosting
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                       <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                          <p className="text-gray-500 text-sm">No MicroDAOs hosted yet</p>
                          <button 
                            onClick={() => navigate('/microdao')}
                            className="mt-2 text-sm text-blue-600 hover:underline"
                          >
                            Join a MicroDAO
                          </button>
                       </div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2 uppercase">Agent Capabilities</h4>
                    <div className="grid grid-cols-2 gap-2">
                       <div className="p-3 bg-gray-50 rounded-lg text-center">
                          <div className="text-xl font-bold text-gray-900">{departments.length}</div>
                          <div className="text-xs text-gray-500">Teams</div>
                       </div>
                       <div className="p-3 bg-gray-50 rounded-lg text-center">
                          <div className="text-xl font-bold text-gray-900">{nodeDetails.agents?.length || 0}</div>
                          <div className="text-xs text-gray-500">Agents</div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Агенти
                </h3>
                <div className="text-3xl font-bold text-gray-900">{nodeDetails.agents?.length || 0}</div>
                <p className="text-sm text-gray-500 mt-1">Активних агентів</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-green-600" />
                  Сервіси
                </h3>
                <div className="text-3xl font-bold text-gray-900">{nodeDetails.services?.length || 0}</div>
                <p className="text-sm text-gray-500 mt-1">Запущених сервісів</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Plug className="w-5 h-5 text-purple-600" />
                  Плагіни
                </h3>
                <div className="text-3xl font-bold text-gray-900">
                  {nodeDetails.plugins?.filter(p => p.enabled).length || 0}
                </div>
                <p className="text-sm text-gray-500 mt-1">Активних плагінів</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Агенти ноди</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Всього агентів: {agentsData?.total || 0}
                    {deploymentStatus && (
                      <span className="ml-2">
                        | Задеплоєно: <span className="text-green-600 font-semibold">{deploymentStatus.deployed}</span>
                        {deploymentStatus.unhealthy > 0 && (
                          <span className="ml-2 text-red-600">Несправних: {deploymentStatus.unhealthy}</span>
                        )}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!isNode1 && (
                    <button
                      onClick={handleDeployAllAgents}
                      disabled={refreshingAgents || !agentsData?.items?.length}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      title="Задеплоїти всіх агентів"
                    >
                      <Play className="w-4 h-4" />
                      Деплой всіх
                    </button>
                  )}
                  <button
                    onClick={handleRefreshAgents}
                    disabled={refreshingAgents}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshingAgents ? 'animate-spin' : ''}`} />
                    Оновити
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              {/* Фільтр по командах */}
              {(isNode1 || nodeId === 'node-2' || nodeId?.includes('node-2')) && departments.length > 0 ? (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Фільтр по командах:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setAgentFilter('all')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        agentFilter === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Всі ({agentsData?.total || 0})
                    </button>
                    {departments.map((dept) => {
                      const count = agentsData?.items.filter(a => a.department === dept).length || 0;
                      return (
                        <button
                          key={dept}
                          onClick={() => setAgentFilter(dept)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            agentFilter === dept
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {dept} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {isLoadingAgents ? (
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-gray-500">Завантаження агентів...</p>
                </div>
              ) : filteredAgents.length > 0 ? (
                <div className="space-y-4">
                  {filteredAgents.map((agent) => {
                    const deploymentStatus = agent.deployment_status;
                    const getStatusIcon = () => {
                      if (!deploymentStatus) return null;
                      if (deploymentStatus.health_check === 'healthy') {
                        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
                      } else if (deploymentStatus.health_check === 'unhealthy') {
                        return <XCircle className="w-5 h-5 text-red-500" />;
                      } else {
                        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
                      }
                    };

                    return (
                      <div
                        key={agent.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                            {getStatusIcon()}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{agent.role}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Модель: {agent.model}</span>
                            <span>Backend: {agent.backend}</span>
                            {agent.department && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                {agent.department}
                              </span>
                            )}
                            {agent.category && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                                {agent.category}
                              </span>
                            )}
                            {(agent as any).type && (
                              <span className={`px-2 py-1 rounded ${
                                (agent as any).type === 'orchestrator' 
                                  ? 'bg-indigo-100 text-indigo-700' 
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {(agent as any).type}
                              </span>
                            )}
                            {agent.priority && (
                              <span className={`px-2 py-1 rounded ${
                                agent.priority === 'highest' ? 'bg-red-100 text-red-700' :
                                agent.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                agent.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {agent.priority}
                              </span>
                            )}
                          </div>
                          {deploymentStatus && (
                            <div className="mt-2 text-xs text-gray-500">
                              Статус деплою: {deploymentStatus.deployed ? '✅ Розгорнуто' : '❌ Не розгорнуто'}
                              {deploymentStatus.health_check && (
                                <span className="ml-2">
                                  Health: {deploymentStatus.health_check === 'healthy' ? '✅' :
                                    deploymentStatus.health_check === 'unhealthy' ? '❌' : '⚠️'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            agent.status === 'active' || agent.status === 'deployed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {agent.status === 'active' || agent.status === 'deployed' ? 'Активний' : 'Неактивний'}
                          </span>
                          {!isNode1 && (!agent.deployment_status?.deployed || agent.deployment_status?.health_check === 'unhealthy') && (
                            <button
                              onClick={() => handleDeployAgent(agent.id)}
                              disabled={deployingAgents.has(agent.id)}
                              className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
                              title="Задеплоїти агента"
                            >
                              {deployingAgents.has(agent.id) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                              Деплой
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Немає агентів</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-6">
            {/* Swapper Service - детальна інформація */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">🔄 Swapper Service</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Динамічне завантаження та управління AI моделями для {nodeDetails.node_name}
                </p>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <SwapperStatusCard nodeId={nodeId} />
                  </div>
                  <div>
                    <SwapperMetricsSummary nodeId={nodeId} />
                  </div>
                </div>
                <div className="mt-6">
                  <SwapperDetailedMetrics nodeId={nodeId} />
                </div>
              </div>
            </div>

            {/* Інші сервіси ноди */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Інші сервіси ноди</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Сервіси та координатори {nodeDetails.node_name}
                </p>
              </div>
              <div className="p-6">
                {nodeDetails.services && nodeDetails.services.filter(service => service.name !== 'Swapper Service').length > 0 ? (
                  <div className="space-y-4">
                    {nodeDetails.services
                      .filter(service => service.name !== 'Swapper Service')
                      .map((service, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">{service.name}</h3>
                              {service.name === 'NodeAgent' && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                  Coordinator
                                </span>
                              )}
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                service.status === 'running' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {service.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              Порт: {service.port} | URL: <code className="text-xs">{service.url}</code>
                            </p>
                            {service.name === 'NodeAgent' && (
                              <p className="text-xs text-gray-400 mt-1">
                                Координатор ноди: управління Swoper, Memory, Health checks, Self-healing
                              </p>
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            service.status === 'running'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {service.status === 'running' ? 'Запущено' : 'Зупинено'}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Немає інших сервісів</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {isLoadingInventory ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-gray-500">Завантаження інвентаризації...</p>
                </div>
              </div>
            ) : inventory ? (
              <>
                {/* Статистика */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">📊 Статистика {inventory.node_name}</h2>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{inventory.statistics.containers_total}</div>
                        <div className="text-sm text-gray-500 mt-1">Контейнери</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {inventory.statistics.containers_healthy} healthy, {inventory.statistics.containers_problematic} проблемних
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{inventory.statistics.bots_active}</div>
                        <div className="text-sm text-gray-500 mt-1">Активні боти</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {inventory.statistics.bots_total} всього
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{inventory.statistics.agents_total}</div>
                        <div className="text-sm text-gray-500 mt-1">AI Агенти</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">{inventory.statistics.databases_total}</div>
                        <div className="text-sm text-gray-500 mt-1">Бази даних</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{inventory.statistics.ollama_models_installed}</div>
                        <div className="text-sm text-gray-500 mt-1">Ollama моделі</div>
                        {inventory.statistics.ollama_models_needed > 0 && (
                          <div className="text-xs text-yellow-600 mt-1">
                            {inventory.statistics.ollama_models_needed} потрібно
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-600">{inventory.statistics.services_total}</div>
                        <div className="text-sm text-gray-500 mt-1">Сервіси</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Проблемні сервіси */}
                {inventory.problematic_services.length > 0 && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg shadow">
                    <div className="p-6 border-b border-red-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-semibold text-red-900 flex items-center gap-2">
                            <AlertTriangle className="w-6 h-6" />
                            Проблемні сервіси ({inventory.problematic_services.length})
                          </h2>
                          <p className="text-sm text-red-700 mt-1">Потребують уваги</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {inventory.problematic_services.map((service) => (
                          <div key={service.container} className="bg-white rounded-lg p-4 border border-red-200">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-gray-900">{service.name}</h3>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    service.priority === 'critical' 
                                      ? 'bg-red-100 text-red-700' 
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {service.priority === 'critical' ? 'Критично' : 'Некритично'}
                                  </span>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    service.status === 'restarting' 
                                      ? 'bg-orange-100 text-orange-700' 
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {service.status}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">Контейнер: <code className="text-xs">{service.container}</code></p>
                                <p className="text-sm text-gray-600">Порт: {service.port}</p>
                                <p className="text-sm text-red-600 mt-2">Проблема: {service.problem}</p>
                              </div>
                              <button className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2">
                                <Wrench className="w-4 h-4" />
                                Виправити
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Docker контейнери */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">🐳 Docker контейнери</h2>
                    <p className="text-sm text-gray-500 mt-1">Всі контейнери на {nodeDetails.node_name}</p>
                  </div>
                  <div className="p-6">
                    {/* Healthy контейнери */}
                    {inventory.docker_containers.healthy.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          Працюють (Healthy) - {inventory.docker_containers.healthy.length}
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Назва</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Образ</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Порти</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uptime</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Призначення</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {inventory.docker_containers.healthy.map((container) => (
                                <tr key={container.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{container.name}</td>
                                  <td className="px-4 py-3 text-sm text-gray-500">{container.image}</td>
                                  <td className="px-4 py-3 text-sm text-gray-500">
                                    {container.ports.length > 0 ? container.ports.join(', ') : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-500">{container.uptime || '-'}</td>
                                  <td className="px-4 py-3 text-sm text-gray-500">{container.purpose || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Up контейнери */}
                    {inventory.docker_containers.up.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Activity className="w-5 h-5 text-blue-600" />
                          Працюють (без health check) - {inventory.docker_containers.up.length}
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Назва</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Образ</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Порти</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uptime</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Призначення</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {inventory.docker_containers.up.map((container) => (
                                <tr key={container.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{container.name}</td>
                                  <td className="px-4 py-3 text-sm text-gray-500">{container.image}</td>
                                  <td className="px-4 py-3 text-sm text-gray-500">
                                    {container.ports.length > 0 ? container.ports.join(', ') : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-500">{container.uptime || '-'}</td>
                                  <td className="px-4 py-3 text-sm text-gray-500">{container.purpose || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Problematic контейнери */}
                    {inventory.docker_containers.problematic.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
                          <XCircle className="w-5 h-5 text-red-600" />
                          Проблемні - {inventory.docker_containers.problematic.length}
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-red-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">Назва</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">Образ</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">Порти</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">Статус</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">Призначення</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {inventory.docker_containers.problematic.map((container) => (
                                <tr key={container.id} className="hover:bg-red-50">
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{container.name}</td>
                                  <td className="px-4 py-3 text-sm text-gray-500">{container.image}</td>
                                  <td className="px-4 py-3 text-sm text-gray-500">
                                    {container.ports.length > 0 ? container.ports.join(', ') : '-'}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      container.state === 'restarting' 
                                        ? 'bg-orange-100 text-orange-700' 
                                        : 'bg-red-100 text-red-700'
                                    }`}>
                                      {container.state}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-500">{container.purpose || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Docker образи */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">📦 Docker образи</h2>
                    <p className="text-sm text-gray-500 mt-1">Всі Docker образи на {nodeDetails.node_name}</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {inventory.docker_images.map((image) => (
                        <div key={image.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                          <h4 className="font-semibold text-gray-900">{image.repository}</h4>
                          <p className="text-sm text-gray-500 mt-1">Tag: {image.tag}</p>
                          <p className="text-sm text-gray-500">Розмір: {image.size}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Бази даних */}
                {inventory.databases.length > 0 && (
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Database className="w-5 h-5 text-indigo-600" />
                        Бази даних ({inventory.databases.length})
                      </h2>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {inventory.databases.map((db) => (
                          <div key={db.name} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-gray-900">{db.name}</h4>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                db.status === 'Healthy' || db.status === 'Up'
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {db.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">Контейнер: <code className="text-xs">{db.container}</code></p>
                            <p className="text-sm text-gray-500">Порт: {db.port}</p>
                            <p className="text-xs text-gray-400 mt-2">{db.purpose}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Telegram боти */}
                {inventory.telegram_bots.length > 0 && (
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Bot className="w-5 h-5 text-blue-600" />
                        Telegram/Discord боти ({inventory.telegram_bots.length})
                      </h2>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {inventory.telegram_bots.map((bot) => (
                          <div key={bot.name} className={`p-4 border rounded-lg ${
                            bot.status === 'active' 
                              ? 'border-green-200 bg-green-50' 
                              : 'border-yellow-200 bg-yellow-50'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-gray-900">{bot.name}</h4>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                bot.status === 'active' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {bot.status === 'active' ? '✅ Активний' : '⏳ Потрібен токен'}
                              </span>
                            </div>
                            {bot.username && <p className="text-sm text-gray-600">@{bot.username}</p>}
                            <p className="text-xs text-gray-500 mt-1">Token: {bot.token_prefix}...</p>
                            <p className="text-xs text-gray-500">Model: {bot.llm_model}</p>
                            <p className="text-xs text-gray-500">Type: {bot.type}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Агенти */}
                {inventory.ai_agents.length > 0 && (
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="text-xl font-semibold text-gray-900">🧠 AI Агенти ({inventory.ai_agents.length})</h2>
                    </div>
                    <div className="p-6">
                      {/* Команда Яромира */}
                      {inventory.ai_agents.filter(a => a.team === 'yaromir').length > 0 && (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-indigo-900 mb-4">Команда Яромира</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {inventory.ai_agents.filter(a => a.team === 'yaromir').map((agent) => (
                              <div key={agent.name} className="p-4 border border-indigo-200 rounded-lg bg-indigo-50">
                                <h4 className="font-semibold text-gray-900">{agent.name}</h4>
                                <p className="text-sm text-gray-600 mt-1">{agent.specialization}</p>
                                <p className="text-xs text-gray-500 mt-1">Model: {agent.llm_model}</p>
                                {agent.temperature && <p className="text-xs text-gray-500">Temp: {agent.temperature}</p>}
                                {agent.size && <p className="text-xs text-gray-500">Size: {agent.size}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Інші агенти */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Основні агенти</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {inventory.ai_agents.filter(a => !a.team).map((agent) => (
                            <div key={agent.name} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                              <h4 className="font-semibold text-gray-900">{agent.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">{agent.specialization}</p>
                              <p className="text-xs text-gray-500 mt-1">Model: {agent.llm_model}</p>
                              {agent.size && <p className="text-xs text-gray-500">Size: {agent.size}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ollama моделі */}
                {inventory.ollama_models && inventory.ollama_models.length > 0 && (
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="text-xl font-semibold text-gray-900">🤖 Ollama моделі</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Встановлено: {inventory.ollama_models.filter(m => m.status === 'installed').length} | 
                        Потрібно: {inventory.ollama_models.filter(m => m.status === 'needed').length}
                      </p>
                    </div>
                    <div className="p-6">
                      {/* Встановлені моделі */}
                      {inventory.ollama_models.filter(m => m.status === 'installed').length > 0 && (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-green-900 mb-4">✅ Встановлені ({inventory.ollama_models.filter(m => m.status === 'installed').length})</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {inventory.ollama_models.filter(m => m.status === 'installed').map((model) => (
                              <div key={model.name} className="p-4 border border-green-200 rounded-lg bg-green-50">
                                <h4 className="font-semibold text-gray-900">{model.name}</h4>
                                <p className="text-sm text-gray-600 mt-1">Розмір: {model.size}</p>
                                {model.modified && <p className="text-xs text-gray-400 mt-1">Оновлено: {model.modified}</p>}
                                {model.purpose && <p className="text-xs text-gray-500 mt-1">{model.purpose}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Потрібні моделі */}
                      {inventory.ollama_models.filter(m => m.status === 'needed').length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-yellow-900 mb-4">⚠️ Потрібно завантажити ({inventory.ollama_models.filter(m => m.status === 'needed').length})</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {inventory.ollama_models.filter(m => m.status === 'needed').map((model) => (
                              <div key={model.name} className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold text-gray-900">{model.name}</h4>
                                  <button className="px-3 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700 transition-colors flex items-center gap-1">
                                    <Download className="w-3 h-3" />
                                    Завантажити
                                  </button>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">Розмір: {model.size}</p>
                                {model.purpose && <p className="text-xs text-gray-500 mt-1">{model.purpose}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Systemd сервіси */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">⚙️ Systemd сервіси</h2>
                    <p className="text-sm text-gray-500 mt-1">Системні сервіси</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {inventory.systemd_services.map((service) => (
                        <div key={service.name} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">{service.name}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              service.status === 'active' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {service.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{service.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Встановлені пакети */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">📚 Встановлені системні пакети</h2>
                    <p className="text-sm text-gray-500 mt-1">Всього: {inventory.system_packages.length}</p>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-wrap gap-2">
                      {inventory.system_packages.map((pkg) => (
                        <div key={pkg.name} className="px-3 py-2 bg-gray-100 rounded-lg">
                          <span className="font-medium text-gray-900">{pkg.name}</span>
                          <span className="text-sm text-gray-500 ml-2">v{pkg.version}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Встановлене програмне забезпечення */}
                {inventory.installed_software && inventory.installed_software.length > 0 && (
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="text-xl font-semibold text-gray-900">💻 Встановлене програмне забезпечення</h2>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {inventory.installed_software.map((software) => (
                          <div key={software.name} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-gray-900">{software.name}</h4>
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                {software.type}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">Версія: {software.version}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Файлова структура */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">📁 Файлова структура</h2>
                    <p className="text-sm text-gray-500 mt-1">Проєкт: {inventory.file_structure.path}</p>
                  </div>
                  <div className="p-6">
                    <div className="font-mono text-sm">
                      <div className="text-gray-900 font-semibold">{inventory.file_structure.path}/</div>
                      {inventory.file_structure.children?.map((item, index) => (
                        <div key={index} className="ml-4 mt-1 text-gray-600">
                          {item.type === 'directory' ? '📁' : '📄'} {item.path.split('/').pop()}
                          {item.size && <span className="text-gray-400 ml-2">({(item.size / 1024).toFixed(1)} KB)</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500 text-center py-8">Інвентаризація недоступна</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'plugins' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Плагіни</h2>
            </div>
            <div className="p-6">
              {nodeDetails.plugins && nodeDetails.plugins.length > 0 ? (
                <div className="space-y-4">
                  {nodeDetails.plugins.map((plugin, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <h3 className="font-semibold text-gray-900">{plugin.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">Версія: {plugin.version}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        plugin.enabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {plugin.enabled ? 'Увімкнено' : 'Вимкнено'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Немає плагінів</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="space-y-6">
            {/* Grafana Dashboard */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Grafana Dashboard
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Візуалізація метрик через Grafana
                </p>
              </div>
              <div className="p-6">
                <div className="bg-gray-100 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Grafana URL: <code className="text-xs bg-white px-2 py-1 rounded">{GRAFANA_URL}</code>
                  </p>
                  <p className="text-xs text-gray-500">
                    Налаштуйте Grafana dashboard для відображення метрик ноди
                  </p>
                </div>
                <iframe
                  src={`${GRAFANA_URL}/d/node-dashboard?orgId=1&refresh=30s&kiosk=tv`}
                  className="w-full h-[600px] border border-gray-200 rounded-lg"
                  title="Grafana Dashboard"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              </div>
            </div>

            {/* Prometheus Metrics */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-600" />
                  Prometheus Metrics
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Метрики з Prometheus
                </p>
              </div>
              <div className="p-6">
                <div className="bg-gray-100 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Prometheus URL: <code className="text-xs bg-white px-2 py-1 rounded">{PROMETHEUS_URL}</code>
                  </p>
                </div>
                <iframe
                  src={`${PROMETHEUS_URL}/graph?g0.expr=up&g0.tab=0`}
                  className="w-full h-[400px] border border-gray-200 rounded-lg"
                  title="Prometheus Metrics"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    {nodeDetails && <NodeMonitorChat nodeId={nodeId || ''} nodeName={nodeDetails.node_name} />}
    </>
  );
}

