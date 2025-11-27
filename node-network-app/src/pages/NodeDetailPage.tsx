import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, Activity, Cpu, HardDrive, Monitor, 
  Wifi, Clock, Settings, BarChart3, Terminal,
  Power, RefreshCw, AlertCircle, CheckCircle,
  Box, Zap, Database, Users, Layers, MessageSquare,
  Send, X
} from 'lucide-react';

// Функція для отримання кольору індикатора на основі навантаження
function getLoadColor(percentage: number) {
  if (percentage < 60) return { bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-500' };
  if (percentage < 80) return { bg: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500' };
  if (percentage < 90) return { bg: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500' };
  return { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500' };
}

// Mock дані для агентів по crewAI групах
const mockCrewAgents = {
  'node-1-hetzner-gex44': [
    {
      crewName: 'Core Agents',
      agents: [
        { name: 'Daarwizz', role: 'Main UI', model: 'qwen3:8b' },
        { name: 'DevTools', role: 'Code & Git', model: 'qwen3:8b' },
        { name: 'MicroDAO Orchestrator', role: 'Workflow', model: 'qwen3:8b' },
        { name: 'Monitor (NODE1)', role: 'Monitoring', model: 'mistral-nemo:12b' },
        { name: 'Tokenomics', role: 'Analysis', model: 'qwen3:8b' },
      ]
    },
    {
      crewName: 'Platform Orchestrators',
      agents: [
        { name: 'GREENFOOD', role: 'ERP', model: 'qwen3:8b' },
        { name: 'Helion', role: 'Energy', model: 'qwen3:8b' },
        { name: 'Yaromir', role: 'DAO', model: 'qwen2.5:14b' },
        { name: 'DRUID', role: 'Ecology', model: 'qwen3:8b' },
        { name: 'EONARCH', role: 'Evolution', model: 'deepseek' },
        { name: 'Dario', role: 'City', model: 'qwen3:8b' },
        { name: 'NUTRA', role: 'Health', model: 'qwen3:8b' },
      ]
    },
  ],
  'default': [
    {
      crewName: 'System (10 агентів)',
      agents: [
        { name: 'Monitor (NODE2)', role: 'Monitoring', model: 'mistral-nemo:12b' },
        { name: 'Solarius', role: 'CEO', model: 'deepseek-r1:70b' },
        { name: 'Sofia', role: 'AI Engineer', model: 'grok-4.1' },
        { name: 'PrimeSynth', role: 'Document', model: 'gpt-4.1' },
        { name: 'Nexor', role: 'Coordinator', model: 'deepseek-r1:70b' },
        { name: 'Vindex', role: 'Decision', model: 'deepseek-r1:70b' },
        { name: 'Helix', role: 'Architect', model: 'deepseek-r1:70b' },
        { name: 'Aurora', role: 'Innovation', model: 'gemma2:27b' },
        { name: 'Arbitron', role: 'Resolver', model: 'mistral-22b' },
        { name: 'Sentinels', role: 'Strategy', model: 'mistral-22b' },
      ]
    },
    {
      crewName: 'Engineering (5)',
      agents: [
        { name: 'ByteForge', role: 'Code Gen', model: 'qwen2.5-coder:72b' },
        { name: 'Vector', role: 'Vector Ops', model: 'starcoder2:34b' },
        { name: 'ChainWeaver', role: 'Blockchain', model: 'qwen2.5-coder:72b' },
        { name: 'Cypher', role: 'Security', model: 'starcoder2:34b' },
        { name: 'Canvas', role: 'UI/UX', model: 'qwen2.5-coder:72b' },
      ]
    },
    {
      crewName: 'Marketing (6)',
      agents: [
        { name: 'Roxy', role: 'Social Media', model: 'mistral:7b' },
        { name: 'Mira', role: 'Content', model: 'qwen2.5:7b' },
        { name: 'Tempo', role: 'Campaigns', model: 'gpt-oss' },
        { name: 'Harmony', role: 'Brand', model: 'mistral:7b' },
        { name: 'Faye', role: 'Community', model: 'qwen2.5:7b' },
        { name: 'Storytelling', role: 'Stories', model: 'qwen2.5:7b' },
      ]
    },
    {
      crewName: 'Finance (4)',
      agents: [
        { name: 'Financial Analyst', role: 'Analysis', model: 'mistral:7b' },
        { name: 'Budget Manager', role: 'Budget', model: 'qwen2.5:7b' },
        { name: 'Tokenomics', role: 'Tokens', model: 'gpt-oss' },
        { name: 'Risk Manager', role: 'Risk', model: 'mistral:7b' },
      ]
    },
    {
      crewName: 'Web3 (5)',
      agents: [
        { name: 'Smart Contracts', role: 'Contracts', model: 'qwen2.5-coder:72b' },
        { name: 'DeFi Specialist', role: 'DeFi', model: 'qwen2.5:7b' },
        { name: 'NFT Manager', role: 'NFT', model: 'qwen2.5:7b' },
        { name: 'DAO Governance', role: 'DAO', model: 'mistral:7b' },
        { name: 'Blockchain Analytics', role: 'Analytics', model: 'qwen2.5:7b' },
      ]
    },
    {
      crewName: 'Security (7)',
      agents: [
        { name: 'Security Auditor', role: 'Audit', model: 'starcoder2:34b' },
        { name: 'Penetration Tester', role: 'PenTest', model: 'qwen2.5-coder:72b' },
        { name: 'Threat Hunter', role: 'Threats', model: 'mistral:7b' },
        { name: 'Compliance Officer', role: 'Compliance', model: 'qwen2.5:7b' },
        { name: 'Incident Response', role: 'Incidents', model: 'mistral:7b' },
        { name: 'Crypto Analyst', role: 'Crypto', model: 'qwen2.5:7b' },
        { name: 'Privacy Guardian', role: 'Privacy', model: 'qwen2.5:7b' },
      ]
    },
    {
      crewName: 'Vision (4)',
      agents: [
        { name: 'Iris', role: 'Vision Proc', model: 'qwen-vl' },
        { name: 'Lumen', role: 'Image Analysis', model: 'qwen2-vl-32b' },
        { name: 'Spectra', role: 'Multimodal', model: 'qwen-vl' },
        { name: 'Visionary', role: 'AI Vision', model: 'qwen2-vl-7b' },
      ]
    },
    {
      crewName: 'Analytics (9)',
      agents: [
        { name: 'Data Scientist', role: 'ML/DS', model: 'qwen2.5:7b' },
        { name: 'BI Analyst', role: 'Business Intel', model: 'mistral:7b' },
        { name: 'Market Research', role: 'Research', model: 'qwen2.5:7b' },
        { name: 'KPI Tracker', role: 'KPIs', model: 'qwen2.5:7b' },
        { name: 'Forecast Agent', role: 'Forecasting', model: 'mistral:7b' },
        { name: 'Dashboard Creator', role: 'Dashboards', model: 'qwen2.5:7b' },
        { name: 'Report Gen', role: 'Reports', model: 'qwen2.5:7b' },
        { name: 'Metrics Monitor', role: 'Metrics', model: 'qwen2.5:7b' },
        { name: 'Insights Agent', role: 'Insights', model: 'mistral:7b' },
      ]
    },
  ],
};

// Mock дані для сервісів
const mockServices = {
  'node-1-hetzner-gex44': [
    { name: 'Swapper Service', status: 'running', port: 8890, type: 'core' },
    { name: 'Agent Cabinet', status: 'running', port: 8898, type: 'core' },
    { name: 'Monitor Agent Service', status: 'running', port: 9500, type: 'core' },
    { name: 'Node Registry', status: 'running', port: 9205, type: 'infrastructure' },
    { name: 'Memory Service', status: 'running', port: 8000, type: 'core' },
    { name: 'NATS JetStream', status: 'running', port: 4222, type: 'infrastructure' },
    { name: 'PostgreSQL', status: 'running', port: 5432, type: 'database' },
    { name: 'Qdrant Vector DB', status: 'running', port: 6333, type: 'database' },
  ],
  'default': [
    { name: 'Swapper Service', status: 'running', port: 8890, type: 'core' },
    { name: 'Node Registry', status: 'running', port: 9205, type: 'infrastructure' },
    { name: 'NATS JetStream', status: 'running', port: 4222, type: 'infrastructure' },
    { name: 'Ollama', status: 'running', port: 11434, type: 'ai' },
  ],
};

// NodeMonitorChat компонент (локальний для кожної ноди)
function NodeMonitorChat({ nodeId, nodeName }: { nodeId: string; nodeName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    {
      id: '1',
      role: 'assistant',
      content: `👋 Привіт! Я Monitor Agent для ${nodeName}.\n\n✨ Можу показати:\n• Метрики цієї ноди\n• Список сервісів\n• Агентів що працюють\n• Swapper Service стан`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages((prev) => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    }]);
    
    // Simulate response
    setTimeout(() => {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `📊 Інформація про ${nodeName}:\n\n✅ Статус: Online\n🔧 Сервісів: ${mockServices[nodeId as keyof typeof mockServices]?.length || 4}\n🤖 Агентів: ${(mockCrewAgents[nodeId as keyof typeof mockCrewAgents] || mockCrewAgents.default).reduce((sum, crew) => sum + crew.agents.length, 0)}`,
        timestamp: new Date().toISOString(),
      }]);
    }, 500);

    setInput('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-500 to-pink-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 z-40"
        title={`Чат з Monitor Agent (${nodeName})`}
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl flex flex-col z-40">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Monitor Agent</h3>
          <p className="text-xs opacity-90">{nodeName}</p>
        </div>
        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-200'}`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="p-4 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Запитайте про ноду..."
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button type="submit" className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NodeDetailPage() {
  const { nodeId } = useParams();
  const [node, setNode] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'grafana' | 'logs' | 'settings'>('overview');
  const [swapperModels, setSwapperModels] = useState<any[]>([]);
  const [realMetrics, setRealMetrics] = useState<any>(null);
  const [nodeEvents, setNodeEvents] = useState<any[]>([]);
  const [nodeAlerts, setNodeAlerts] = useState<any[]>([]);
  const [metricsMessage, setMetricsMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchNode = async () => {
      try {
        setRealMetrics(null);
        setMetricsMessage(null);
        // Отримуємо реальні метрики для NODE2
        if (nodeId?.includes('macbook') || nodeId?.includes('node-2')) {
          try {
            const metricsRes = await fetch('/api/node-metrics');
            const metricsData = await metricsRes.json();
            setRealMetrics(metricsData);
            setMetricsMessage(null);
          } catch (err) {
            console.warn('Failed to fetch real metrics for NODE2:', err);
          }
        }
        
        let resolvedNode: any = null;

        // Якщо це NODE1 (статична нода) - використовуємо базові дані + реальний Swapper
        if (nodeId === 'node-1-hetzner-gex44') {
          // Отримуємо реальні моделі з Swapper Service NODE1
          try {
            const swapperRes = await fetch('http://144.76.224.179:8890/status');
            const swapperData = await swapperRes.json();
            const models = swapperData?.models || [];
            setSwapperModels(models);
          } catch (err) {
            console.warn('Failed to fetch Swapper models for NODE1:', err);
          }

          resolvedNode = {
            node_id: 'node-1-hetzner-gex44',
            node_name: 'Hetzner GEX44 Production (NODE1)',
            node_role: 'production',
            node_type: 'router',
            ip_address: '144.76.224.179',
            local_ip: null,
            hostname: 'gateway.daarion.city',
            status: 'online',
            last_heartbeat: new Date().toISOString(),
            registered_at: '2025-01-17T00:00:00Z',
            updated_at: new Date().toISOString(),
            metadata: {
              capabilities: {
                system: {
                  hostname: 'gateway.daarion.city',
                  platform: 'Linux',
                  platform_version: 'Ubuntu 22.04 LTS',
                  architecture: 'x86_64',
                  cpu_count: 8,
                  memory_total_gb: 32,
                  disk_total_gb: 512,
                  python_version: '3.11.0',
                },
                services: ['nginx', 'docker', 'postgresql'],
                features: ['production', 'gateway', 'docker'],
                gpu: { 
                  available: true,
                  model: 'NVIDIA RTX 4000 Ada',
                  vram_gb: 20,
                  usage_percent: 35,
                },
                ollama: {
                  available: true,
                  models: [], // Буде заповнено з swapperModels
                },
              },
            },
          };
        } else {
          // Для інших нод - запит до API
          const res = await fetch(`/api/v1/nodes/${nodeId}`);
          const data = await res.json();
          resolvedNode = data;
        }

        setNode(resolvedNode);

        if (nodeId === 'node-1-hetzner-gex44') {
          try {
            const node1MetricsRes = await fetch('/api/node1-metrics');
            const node1MetricsData = await node1MetricsRes.json();
            if (node1MetricsData?.metrics) {
              setRealMetrics(node1MetricsData.metrics);
            }
            if (node1MetricsData?.message) {
              setMetricsMessage(node1MetricsData.message);
            }
          } catch (err) {
            console.warn('Failed to fetch NODE1 Prometheus metrics:', err);
          }
        }

        try {
          const [eventsRes, alertsRes] = await Promise.all([
            fetch(`/api/monitoring/events/${nodeId}?limit=10`),
            fetch(`/api/monitoring/alerts?node_id=${nodeId}`),
          ]);
          const eventsData = await eventsRes.json();
          const alertsData = await alertsRes.json();
          setNodeEvents(eventsData?.events || []);
          setNodeAlerts(alertsData?.alerts || []);
        } catch (err) {
          console.warn('Failed to fetch events/alerts:', err);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNode();
    const interval = setInterval(fetchNode, 10000);
    return () => clearInterval(interval);
  }, [nodeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Завантаження кабінету...</p>
        </div>
      </div>
    );
  }

  if (!node) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <p className="text-slate-400 text-lg">Нода не знайдена</p>
        <Link to="/nodes" className="text-purple-400 hover:text-purple-300 mt-4 inline-block">
          ← Повернутися до списку
        </Link>
      </div>
    );
  }

  const system = node.metadata?.capabilities?.system;
  const ollama = node.metadata?.capabilities?.ollama;
  const services = mockServices[nodeId as keyof typeof mockServices] || mockServices.default;
  const crewAgents = mockCrewAgents[nodeId as keyof typeof mockCrewAgents] || mockCrewAgents.default;
  const features = node.metadata?.capabilities?.features || [];

  // Реальні або mock метрики
  const metrics = realMetrics ? {
    cpu: realMetrics.cpu?.percent || 0,
    ram: realMetrics.memory?.percent || 0,
    disk: realMetrics.disk?.percent || 0,
    gpu: realMetrics.gpu?.percent || 0,
  } : nodeId === 'node-1-hetzner-gex44' 
    ? { cpu: 0, ram: 0, disk: 0, gpu: 0 } // NODE1 - N/A (Prometheus недоступний)
    : { cpu: 0, ram: 0, disk: 0, gpu: 0 };

  const cpuColor = getLoadColor(metrics.cpu);
  const ramColor = getLoadColor(metrics.ram);
  const diskColor = getLoadColor(metrics.disk);

  const formatTimestamp = (value?: string) => {
    if (!value) return '—';
    return new Date(value).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  };

  const alertPalette: Record<string, string> = {
    critical: 'border-red-500/40 bg-red-500/10 text-red-200',
    warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-100',
    info: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
  };

  return (
    <div className="space-y-6">
      {/* NodeMonitorChat */}
      <NodeMonitorChat nodeId={nodeId || ''} nodeName={node.node_name} />

      {/* Breadcrumb */}
      <Link 
        to="/nodes" 
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Назад до списку нод
      </Link>

      {/* Header Card */}
      <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-2xl p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              node.status === 'online' 
                ? 'bg-gradient-to-br from-green-500 to-green-600' 
                : 'bg-gradient-to-br from-red-500 to-red-600'
            }`}>
              <Monitor className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{node.node_name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-slate-400">ID: {node.node_id}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">{node.hostname || 'N/A'}</span>
                <span className="text-slate-600">•</span>
                <span className={`flex items-center gap-1 ${
                  node.status === 'online' ? 'text-green-400' : 'text-red-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    node.status === 'online' ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                  }`} />
                  {node.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Оновити
            </button>
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Налаштування
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-2">
        <div className="flex gap-2">
          {[
            { id: 'overview', label: 'Огляд', icon: Activity },
            { id: 'metrics', label: 'Метрики', icon: BarChart3 },
            { id: 'grafana', label: 'Grafana', icon: BarChart3 },
            { id: 'logs', label: 'Логи', icon: Terminal },
            { id: 'settings', label: 'Налаштування', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* System Resources with Color Indicators */}
          {system && (
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-400" />
                Системні ресурси з індикаторами навантаження
              </h2>
              {metricsMessage && (
                <div className="mb-4 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                  {metricsMessage}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`bg-gradient-to-br from-purple-900/30 to-purple-950/30 border ${cpuColor.border} rounded-xl p-6`}>
                  <Cpu className={`w-8 h-8 ${cpuColor.text} mb-3`} />
                  <div className="text-sm text-slate-400 mb-1">CPU</div>
                  <div className="text-3xl font-bold text-white mb-1">{system.cpu_count}</div>
                  <div className="text-xs text-slate-500">cores</div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">Навантаження</span>
                      <span className={cpuColor.text}>{metrics.cpu}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${cpuColor.bg}`} style={{ width: `${metrics.cpu}%` }} />
                    </div>
                  </div>
                </div>

                <div className={`bg-gradient-to-br from-blue-900/30 to-blue-950/30 border ${ramColor.border} rounded-xl p-6`}>
                  <Monitor className={`w-8 h-8 ${ramColor.text} mb-3`} />
                  <div className="text-sm text-slate-400 mb-1">RAM</div>
                  <div className="text-3xl font-bold text-white mb-1">{system.memory_total_gb}</div>
                  <div className="text-xs text-slate-500">GB total</div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">Використано</span>
                      <span className={ramColor.text}>{metrics.ram}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${ramColor.bg}`} style={{ width: `${metrics.ram}%` }} />
                    </div>
                  </div>
                </div>

                <div className={`bg-gradient-to-br from-green-900/30 to-green-950/30 border ${diskColor.border} rounded-xl p-6`}>
                  <HardDrive className={`w-8 h-8 ${diskColor.text} mb-3`} />
                  <div className="text-sm text-slate-400 mb-1">Disk</div>
                  <div className="text-3xl font-bold text-white mb-1">{Math.round(system.disk_total_gb)}</div>
                  <div className="text-xs text-slate-500">GB total</div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">Заповнено</span>
                      <span className={diskColor.text}>{metrics.disk}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${diskColor.bg}`} style={{ width: `${metrics.disk}%` }} />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-950/30 border border-yellow-800/30 rounded-xl p-6">
                  <Activity className="w-8 h-8 text-yellow-400 mb-3" />
                  <div className="text-sm text-slate-400 mb-1">Platform</div>
                  <div className="text-2xl font-bold text-white mb-1">{system.platform}</div>
                  <div className="text-xs text-slate-500 line-clamp-2">{system.platform_version?.split(' ').slice(0, 3).join(' ')}</div>
                </div>
              </div>
            </div>
          )}

          {/* Swapper Service та Ollama Models - РЕАЛЬНІ ДАНІ */}
          {(swapperModels.length > 0 || (ollama?.available && ollama.models && ollama.models.length > 0)) && (
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-green-400" />
                Swapper Service - Ollama Models ({swapperModels.length > 0 ? swapperModels.length : ollama.models.length})
              </h3>
              <div className="mb-4 p-4 bg-green-900/20 border border-green-800/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-400 font-semibold mb-1">
                      ✅ Swapper Service активний {swapperModels.length > 0 ? '(реальні дані з API)' : ''}
                    </p>
                    <p className="text-xs text-slate-400">Керує моделями Ollama на цій ноді</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Активна модель:</p>
                    <p className="text-green-400 font-mono text-sm">
                      {swapperModels.find(m => m.status === 'loaded')?.ollama_name || 
                       swapperModels[0]?.ollama_name || 
                       ollama.models[0] || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {(swapperModels.length > 0 ? swapperModels : ollama.models.map((m: string) => ({ ollama_name: m, status: 'loaded' }))).map((model: any, idx: number) => {
                  const modelName = model.ollama_name || model;
                  const isActive = model.status === 'loaded' || idx === 0;
                  return (
                    <div
                      key={modelName}
                      className={`px-3 py-2 ${isActive ? 'bg-green-800/30 border-green-700' : 'bg-slate-800/50 border-slate-700'} hover:bg-slate-800 border rounded-lg text-sm text-slate-300 transition-colors relative`}
                    >
                      {isActive && (
                        <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                          Loaded
                        </span>
                      )}
                      {modelName}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Services List */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Box className="w-5 h-5 text-blue-400" />
              Сервіси на ноді ({services.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {services.map((service) => (
                <div
                  key={service.name}
                  className="p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white">{service.name}</h4>
                    <span className={`px-2 py-1 rounded text-xs ${
                      service.status === 'running' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {service.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span>Port: {service.port}</span>
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                      {service.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Events & Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Останні події ({nodeEvents.length})
              </h3>
              <div className="space-y-4">
                {nodeEvents.length > 0 ? nodeEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3">
                    <div className="text-xs text-slate-500 w-14 flex-shrink-0 text-right">
                      {formatTimestamp(event.timestamp)}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{event.title}</p>
                      <p className="text-xs text-slate-400">{event.details}</p>
                    </div>
                  </div>
                )) : <p className="text-slate-500 text-sm">Поки немає подій</p>}
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                Алерти ({nodeAlerts.length})
              </h3>
              <div className="space-y-3">
                {nodeAlerts.length > 0 ? nodeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-xl border text-sm ${alertPalette[alert.severity] || 'border-slate-700 bg-slate-800/60 text-slate-200'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold">{alert.title}</p>
                      <span className="text-[10px] uppercase tracking-wide">{alert.status || 'active'}</span>
                    </div>
                    <p className="text-xs">{alert.description}</p>
                  </div>
                )) : <p className="text-slate-500 text-sm">Алертів не зафіксовано</p>}
              </div>
            </div>
          </div>

          {/* AI Agents */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              {nodeId === 'node-1-hetzner-gex44' 
                ? `AI Агенти на NODE1 (${crewAgents.reduce((sum, crew) => sum + crew.agents.length, 0)})`
                : `AI Агенти по групах (${crewAgents.reduce((sum, crew) => sum + crew.agents.length, 0)})`
              }
            </h3>
            <div className="space-y-6">
              {crewAgents.map((crew) => (
                <div key={crew.crewName}>
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <h4 className="text-lg font-semibold text-purple-400">{crew.crewName}</h4>
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                      {crew.agents.length} агентів
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {crew.agents.map((agent) => (
                      <div
                        key={agent.name}
                        className="p-4 bg-gradient-to-br from-purple-900/20 to-purple-950/20 border border-purple-800/30 rounded-lg hover:border-purple-700/50 transition-colors"
                      >
                        <h5 className="font-semibold text-white mb-1">{agent.name}</h5>
                        <p className="text-sm text-slate-400 mb-2">{agent.role}</p>
                        <p className="text-xs text-purple-400 font-mono">{agent.model}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Network & Connection */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Wifi className="w-5 h-5 text-blue-400" />
                Мережа
              </h3>
              <div className="space-y-3">
                {node.ip_address && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Public IP</span>
                    <span className="text-white font-mono">{node.ip_address}</span>
                  </div>
                )}
                {node.local_ip && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Local IP</span>
                    <span className="text-white font-mono">{node.local_ip}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-400">Hostname</span>
                  <span className="text-white">{node.hostname || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-400" />
                Статус
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Роль</span>
                  <span className="text-white capitalize">{node.node_role}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Тип</span>
                  <span className="text-white capitalize">{node.node_type}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Last Heartbeat</span>
                  <span className="text-white">
                    {node.last_heartbeat ? new Date(node.last_heartbeat).toLocaleString('uk-UA') : 'Never'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-400">Зареєстровано</span>
                  <span className="text-white">
                    {new Date(node.registered_at).toLocaleDateString('uk-UA')}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                Керування нодою
              </h3>
              <div className="space-y-3">
                <button className="w-full px-4 py-2 rounded-lg bg-orange-600/40 border border-orange-500/40 text-orange-100 text-sm hover:bg-orange-600/60 transition-colors flex items-center justify-center gap-2">
                  <Power className="w-4 h-4" />
                  Drain ноду
                </button>
                <button className="w-full px-4 py-2 rounded-lg bg-red-600/30 border border-red-500/40 text-red-100 text-sm hover:bg-red-600/50 transition-colors flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Перезавантажити
                </button>
                <button className="w-full px-4 py-2 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-100 text-sm hover:bg-blue-600/50 transition-colors flex items-center justify-center gap-2">
                  <Settings className="w-4 h-4" />
                  Restart сервісів
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-4">
                * Керування активується після інтеграції з Monitor Agent
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'metrics' && (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8">
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Метрики в розробці</h3>
            <p className="text-slate-400">
              Тут будуть графіки CPU, RAM, Network usage та історія heartbeat
            </p>
          </div>
        </div>
      )}

      {activeTab === 'grafana' && (
        <div className="space-y-6">
          {/* Grafana Integration */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-400" />
                Grafana Dashboards
              </h3>
              {nodeId === 'node-1-hetzner-gex44' && (
                <a
                  href="http://144.76.224.179:3000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Відкрити Grafana ↗
                </a>
              )}
            </div>

            {nodeId === 'node-1-hetzner-gex44' ? (
              <>
                {/* Grafana Dashboards List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <a
                    href="http://144.76.224.179:3000/d/dagi-router"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-br from-orange-900/30 to-orange-950/30 border border-orange-800/30 rounded-xl p-6 hover:border-orange-700 transition-all group"
                  >
                    <h4 className="text-lg font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">
                      DAGI Router Dashboard
                    </h4>
                    <p className="text-sm text-slate-400 mb-4">
                      Requests, latency, error rate, provider distribution, model usage stats
                    </p>
                    <div className="flex items-center gap-2 text-orange-400 text-sm font-medium">
                      <span>Відкрити дашборд</span>
                      <span>→</span>
                    </div>
                  </a>

                  <a
                    href="http://144.76.224.179:3000/d/telegram-gateway"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 border border-blue-800/30 rounded-xl p-6 hover:border-blue-700 transition-all group"
                  >
                    <h4 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                      Telegram Gateway Dashboard
                    </h4>
                    <p className="text-sm text-slate-400 mb-4">
                      Active bots (3), messages per minute, response time, bot-specific stats
                    </p>
                    <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                      <span>Відкрити дашборд</span>
                      <span>→</span>
                    </div>
                  </a>
                </div>

                {/* Prometheus Link */}
                <div className="bg-gradient-to-br from-red-900/30 to-red-950/30 border border-red-800/30 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-white mb-2">Prometheus</h4>
                      <p className="text-sm text-slate-400">
                        Metrics collection: DAGI Router, Telegram Gateway, Docker, PostgreSQL, NATS
                      </p>
                    </div>
                    <a
                      href="http://144.76.224.179:9090"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      Відкрити Prometheus ↗
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400">
                  Grafana доступна тільки на NODE1
                </p>
              </div>
            )}
          </div>

          {/* Metrics Overview */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Ключові метрики</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="text-sm text-slate-400 mb-1">Total Requests</div>
                <div className="text-2xl font-bold text-white">12,450</div>
                <div className="text-xs text-green-400">+15% from last hour</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="text-sm text-slate-400 mb-1">Avg Latency</div>
                <div className="text-2xl font-bold text-white">245ms</div>
                <div className="text-xs text-green-400">-8% from last hour</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="text-sm text-slate-400 mb-1">Error Rate</div>
                <div className="text-2xl font-bold text-white">0.02%</div>
                <div className="text-xs text-green-400">Excellent</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-green-400" />
              Логи ноди
            </h3>
            <button className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-sm text-white rounded-lg">
              Очистити
            </button>
          </div>
          <div className="bg-slate-950 rounded-xl p-4 font-mono text-sm space-y-1 max-h-96 overflow-y-auto">
            <div className="text-green-400">[INFO] Node started successfully</div>
            <div className="text-blue-400">[INFO] Connected to registry</div>
            <div className="text-green-400">[INFO] Heartbeat sent</div>
            <div className="text-slate-500">[DEBUG] System metrics collected</div>
            <div className="text-green-400">[INFO] Heartbeat sent</div>
            <div className="text-slate-400 text-center py-8">... більше логів буде додано пізніше ...</div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Налаштування ноди</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Назва ноди
                </label>
                <input
                  type="text"
                  value={node.node_name}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Роль
                </label>
                <select className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                  <option value="worker">Worker</option>
                  <option value="development">Development</option>
                  <option value="production">Production</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-red-900/20 border border-red-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-red-400 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Небезпечна зона
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Ці дії незворотні. Будьте обережні.
            </p>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2">
                <Power className="w-4 h-4" />
                Вимкнути ноду
              </button>
              <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors">
                Видалити з мережі
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
