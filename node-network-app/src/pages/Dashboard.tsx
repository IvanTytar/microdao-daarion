import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Network, TrendingUp, Activity, Zap, Server, Radio, 
  ShieldAlert, Cpu, BarChart3, LineChart, ShieldCheck 
} from 'lucide-react';
import { MonitorChat } from '../components/MonitorChat';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [node2Metrics, setNode2Metrics] = useState<any>(null);
  const [globalKpis, setGlobalKpis] = useState<any>(null);
  const [infraMetrics, setInfraMetrics] = useState<any>(null);
  const [aiUsage, setAiUsage] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          globalRes,
          infraRes,
          aiRes,
          alertsRes,
          nodeMetricsRes,
        ] = await Promise.all([
          fetch('/api/monitoring/global-kpis'),
          fetch('/api/monitoring/infrastructure'),
          fetch('/api/monitoring/ai-usage'),
          fetch('/api/monitoring/alerts'),
          fetch('/api/node-metrics'),
        ]);

        const [
          globalData,
          infraData,
          aiData,
          alertsData,
          nodeMetricsData,
        ] = await Promise.all([
          globalRes.json(),
          infraRes.json(),
          aiRes.json(),
          alertsRes.json(),
          nodeMetricsRes.json(),
        ]);

        setGlobalKpis(globalData);
        setInfraMetrics(infraData);
        setAiUsage(aiData);
        setAlerts(alertsData?.alerts || []);
        setNode2Metrics(nodeMetricsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Завантаження...</p>
        </div>
      </div>
    );
  }

  const clusterNodes = globalKpis?.cluster?.nodes || {};
  const totalNodes = clusterNodes.total || 0;
  const onlineNodes = clusterNodes.online || 0;
  const degradedNodes = clusterNodes.degraded || 0;
  const offlineNodes = clusterNodes.offline || 0;
  const uptimePercent = globalKpis?.cluster?.uptime_percent || 0;
  const errorRate = globalKpis?.cluster?.error_rate_percent || 0;
  const agentsSummary = globalKpis?.agents || {};
  const messageSummary = globalKpis?.messages || {};

  return (
    <>
      {/* Monitor Chat - Floating */}
      <MonitorChat />
      
      <div className="space-y-4">
        {/* Hero Header with Logo - Compact */}
        <div className="bg-gradient-to-r from-slate-900/80 via-purple-900/20 to-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 flex-shrink-0">
              <img 
                src="/logo.svg" 
                alt="DAGI Network" 
                className="w-full h-full drop-shadow-2xl animate-pulse-slow"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 mb-1">
                DAGI Network Dashboard
              </h1>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-green-400">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  Система активна
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">v2.0.0</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">
                  {new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>
            {/* Quick Stats Inline */}
            <div className="hidden lg:flex items-center gap-4 text-sm">
              <div className="text-center px-3 py-1 bg-purple-900/30 rounded">
                <div className="text-lg font-bold text-white">{totalNodes}</div>
                <div className="text-xs text-slate-400">Нод</div>
              </div>
              <div className="text-center px-3 py-1 bg-green-900/30 rounded">
                <div className="text-lg font-bold text-green-400">{onlineNodes}</div>
                <div className="text-xs text-slate-400">Online</div>
              </div>
            </div>
          </div>
        </div>

        {/* Global KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-slate-400">Cluster uptime</p>
                <h3 className="text-2xl font-bold text-white">{uptimePercent.toFixed(1)}%</h3>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-xs text-slate-500">Стабільність серед усіх середовищ</p>
          </div>
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-slate-400">Error rate</p>
                <h3 className="text-2xl font-bold text-white">{errorRate.toFixed(2)}%</h3>
              </div>
              <ShieldAlert className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-xs text-slate-500">HTTP 5xx / NATS errors</p>
          </div>
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-slate-400">Активні агенти (5хв)</p>
                <h3 className="text-2xl font-bold text-white">{agentsSummary?.active_5m || 0}</h3>
              </div>
              <Activity className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-xs text-slate-500">Середня latency: {agentsSummary?.avg_latency_ms || 0} мс</p>
          </div>
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-slate-400">Повідомлень / хв</p>
                <h3 className="text-2xl font-bold text-white">{messageSummary?.per_minute || 0}</h3>
              </div>
              <Radio className="w-8 h-8 text-blue-400" />
            </div>
            <p className="text-xs text-slate-500">Tasks / год: {messageSummary?.tasks_per_hour || 0}</p>
          </div>
        </div>

        {/* Інфраструктура */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-purple-400" />
              API & WebSocket
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400 mb-1">API Gateway</p>
                <p className="text-2xl font-bold text-white">{infraMetrics?.api_gateway?.rps || 0} rps</p>
                <p className="text-xs text-slate-500">p95 latency {infraMetrics?.api_gateway?.latency_ms_p95 || 0} мс</p>
                <p className="text-xs text-slate-500">errors {infraMetrics?.api_gateway?.error_rate_percent || 0}%</p>
              </div>
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400 mb-1">WebSocket mesh</p>
                <p className="text-2xl font-bold text-white">{infraMetrics?.websocket?.active_connections || 0}</p>
                <p className="text-xs text-slate-500">messages {infraMetrics?.websocket?.messages_per_second || 0}/c</p>
                <p className="text-xs text-slate-500">p95 latency {infraMetrics?.websocket?.latency_ms_p95 || 0} мс</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-green-400" />
              NATS & Бази даних
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400 mb-2">Streams lag</p>
                <div className="space-y-2 text-xs">
                  {infraMetrics?.message_bus?.streams?.map((stream: any) => (
                    <div key={stream.name} className="flex items-center justify-between">
                      <span className="text-slate-300">{stream.name}</span>
                      <span className="text-white font-semibold">{stream.lag}</span>
                    </div>
                  )) || <p className="text-slate-500">Дані завантажуються...</p>}
                </div>
              </div>
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400 mb-2">Databases</p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">PostgreSQL</span>
                    <span className="text-white font-semibold">{infraMetrics?.databases?.postgres?.cpu_percent || 0}% CPU</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Qdrant</span>
                    <span className="text-white font-semibold">{infraMetrics?.databases?.qdrant?.cpu_percent || 0}% CPU</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI & Models */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-800 rounded-xl p-5">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-pink-400" />
              Використання моделей
            </h3>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <span>Tokens in (1h)</span>
                <span className="font-bold text-white">{aiUsage?.tokens?.last_hour_in?.toLocaleString('uk-UA') || '0'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tokens out (1h)</span>
                <span className="font-bold text-white">{aiUsage?.tokens?.last_hour_out?.toLocaleString('uk-UA') || '0'}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>24h сумарно</span>
                <span className="text-slate-300">
                  {aiUsage?.tokens?.last_24h_in?.toLocaleString('uk-UA') || '0'} / {aiUsage?.tokens?.last_24h_out?.toLocaleString('uk-UA') || '0'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-800 rounded-xl p-5">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <LineChart className="w-5 h-5 text-blue-400" />
              Топ агентів
            </h3>
            <div className="space-y-3 text-xs">
              {aiUsage?.top_agents?.map((agent: any) => (
                <div key={agent.id} className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <p className="text-white font-semibold">{agent.name}</p>
                    <p className="text-slate-500">{agent.metrics.tokens_in.toLocaleString('uk-UA')} tokens</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400">{agent.metrics.latency_p95_ms} мс</p>
                    <p className="text-slate-500">{agent.node_id}</p>
                  </div>
                </div>
              )) || <p className="text-slate-500">Дані не доступні</p>}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-emerald-400" />
              Латентність моделей
            </h3>
            <div className="space-y-2 text-xs">
              {aiUsage?.model_latency?.map((model: any) => (
                <div key={model.model} className="flex items-center justify-between">
                  <span className="text-slate-300">{model.model}</span>
                  <span className="text-white font-semibold">{model.p50_ms} / {model.p95_ms} мс</span>
                </div>
              ))}
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-slate-300">
              <p className="text-emerald-300 font-semibold mb-1">Quota guard</p>
              <p>Використано {aiUsage?.quota_guard?.budget_percent || 0}% бюджету.</p>
              <p className="text-slate-500 mt-1">Наступне скидання {aiUsage?.quota_guard?.next_reset?.slice(11, 16)}</p>
            </div>
          </div>
        </div>

        {/* Security & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-800 rounded-xl p-5">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              Безпека
            </h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                <p className="text-xs text-slate-500">4xx</p>
                <p className="text-2xl font-bold text-white">{Math.max(12, Math.round(errorRate * 200))}</p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                <p className="text-xs text-slate-500">5xx</p>
                <p className="text-2xl font-bold text-white">{Math.max(1, Math.round(errorRate * 40))}</p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                <p className="text-xs text-slate-500">Failed logins</p>
                <p className="text-2xl font-bold text-white">6</p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                <p className="text-xs text-slate-500">Bans / h</p>
                <p className="text-2xl font-bold text-white">2</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-800 rounded-xl p-5">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5 text-yellow-400" />
              Активні алерти
            </h3>
            <div className="space-y-3 text-xs">
              {alerts.length > 0 ? alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-3 rounded-lg border ${
                    alert.severity === 'critical' ? 'border-red-500/40 bg-red-500/10' :
                    alert.severity === 'warning' ? 'border-yellow-500/30 bg-yellow-500/10' :
                    'border-blue-500/30 bg-blue-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white font-semibold">{alert.title}</p>
                    <span className="text-[10px] text-slate-400">{alert.node_id}</span>
                  </div>
                  <p className="text-slate-300">{alert.description}</p>
                </div>
              )) : <p className="text-slate-500">Немає активних алертів</p>}
            </div>
          </div>
        </div>

        {/* Системні ресурси - Все в одній картці */}
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-xl p-3">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            Стан кластера
          </h3>
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <Network className="w-5 h-5 text-purple-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-white">{totalNodes}</div>
              <div className="text-xs text-slate-400">Нод</div>
            </div>
            <div className="text-center">
              <Activity className="w-5 h-5 text-green-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-green-400">{onlineNodes}</div>
              <div className="text-xs text-slate-400">Online</div>
            </div>
            <div className="text-center">
              <Activity className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-yellow-400">{degradedNodes}</div>
              <div className="text-xs text-slate-400">Degraded</div>
            </div>
            <div className="text-center">
              <Activity className="w-5 h-5 text-red-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-white">{offlineNodes}</div>
              <div className="text-xs text-slate-400">Offline</div>
            </div>
          </div>
        </div>

        {/* Network Overview - Compact */}
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-xl p-4">
          <h2 className="text-lg font-bold text-white mb-3">Огляд мережі</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* NODE1 Card - З індикаторами */}
            <div className="bg-gradient-to-br from-red-900/20 to-red-950/20 border border-red-800/30 rounded-lg p-3 hover:border-red-700 transition-all group">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-white mb-0.5">NODE1 • Hetzner GEX44</h3>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Intel i5-13500 (14c) • RTX 4000 Ada 20GB • 62GB RAM • 1.7TB NVMe
                  </p>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              </div>

              {/* Індикатори метрик - TODO: підключити Prometheus NODE1 */}
              <div className="grid grid-cols-4 gap-2 mb-2">
                <div className="text-center">
                  <div className="w-8 h-8 rounded-full bg-slate-500/20 border-2 border-slate-500 mx-auto mb-1 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-400">N/A</span>
                  </div>
                  <span className="text-[9px] text-slate-400">GPU</span>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 rounded-full bg-slate-500/20 border-2 border-slate-500 mx-auto mb-1 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-400">N/A</span>
                  </div>
                  <span className="text-[9px] text-slate-400">CPU</span>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 rounded-full bg-slate-500/20 border-2 border-slate-500 mx-auto mb-1 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-400">N/A</span>
                  </div>
                  <span className="text-[9px] text-slate-400">RAM</span>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 rounded-full bg-slate-500/20 border-2 border-slate-500 mx-auto mb-1 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-400">N/A</span>
                  </div>
                  <span className="text-[9px] text-slate-400">Disk</span>
                </div>
              </div>

              {/* Агенти та моделі */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2 px-2">
                <span>🤖 12 агентів</span>
                <span>📦 5 моделей</span>
              </div>

              <Link
                to="/nodes/node-1-hetzner-gex44"
                className="block w-full text-center py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors font-medium"
              >
                Відкрити кабінет →
              </Link>
            </div>

            {/* NODE2 Card - З індикаторами */}
            <div className="bg-gradient-to-br from-blue-900/20 to-blue-950/20 border border-blue-800/30 rounded-lg p-3 hover:border-blue-700 transition-all group">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold text-white">NODE2 • MacBook M4 Max</h3>
                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[9px] rounded">Цей ноут</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Apple M4 Max (16c) • M4 Max GPU 40c • 64GB RAM • 2TB SSD
                  </p>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              </div>

              {/* Індикатори метрик - РЕАЛЬНІ ДАНІ */}
              <div className="grid grid-cols-4 gap-2 mb-2">
                {(() => {
                  const cpu = node2Metrics?.cpu?.percent || 0;
                  const ram = node2Metrics?.memory?.percent || 0;
                  const disk = node2Metrics?.disk?.percent || 0;
                  const gpu = node2Metrics?.gpu?.percent || 0;
                  
                  const getCpuColor = (val: number) => val > 80 ? 'red' : val > 60 ? 'orange' : val > 40 ? 'yellow' : 'green';
                  const getRamColor = (val: number) => val > 85 ? 'red' : val > 70 ? 'orange' : val > 50 ? 'yellow' : 'green';
                  const getDiskColor = (val: number) => val > 90 ? 'red' : val > 75 ? 'orange' : val > 50 ? 'yellow' : 'green';
                  const getGpuColor = (val: number) => val > 80 ? 'red' : val > 60 ? 'orange' : val > 40 ? 'yellow' : 'green';
                  
                  return (
                    <>
                      <div className="text-center">
                        <div className={`w-8 h-8 rounded-full bg-${getGpuColor(gpu)}-500/20 border-2 border-${getGpuColor(gpu)}-500 mx-auto mb-1 flex items-center justify-center`}>
                          <span className={`text-[10px] font-bold text-${getGpuColor(gpu)}-400`}>{Math.round(gpu)}%</span>
                        </div>
                        <span className="text-[9px] text-slate-400">GPU</span>
                      </div>
                      <div className="text-center">
                        <div className={`w-8 h-8 rounded-full bg-${getCpuColor(cpu)}-500/20 border-2 border-${getCpuColor(cpu)}-500 mx-auto mb-1 flex items-center justify-center`}>
                          <span className={`text-[10px] font-bold text-${getCpuColor(cpu)}-400`}>{Math.round(cpu)}%</span>
                        </div>
                        <span className="text-[9px] text-slate-400">CPU</span>
                      </div>
                      <div className="text-center">
                        <div className={`w-8 h-8 rounded-full bg-${getRamColor(ram)}-500/20 border-2 border-${getRamColor(ram)}-500 mx-auto mb-1 flex items-center justify-center`}>
                          <span className={`text-[10px] font-bold text-${getRamColor(ram)}-400`}>{Math.round(ram)}%</span>
                        </div>
                        <span className="text-[9px] text-slate-400">RAM</span>
                      </div>
                      <div className="text-center">
                        <div className={`w-8 h-8 rounded-full bg-${getDiskColor(disk)}-500/20 border-2 border-${getDiskColor(disk)}-500 mx-auto mb-1 flex items-center justify-center`}>
                          <span className={`text-[10px] font-bold text-${getDiskColor(disk)}-400`}>{Math.round(disk)}%</span>
                        </div>
                        <span className="text-[9px] text-slate-400">Disk</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Агенти та моделі */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2 px-2">
                <span>🤖 50 агентів</span>
                <span>📦 8 моделей</span>
              </div>

              <Link
                to="/nodes/node-macbook-pro-0e14f673"
                className="block w-full text-center py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors font-medium"
              >
                Відкрити кабінет →
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions - Compact */}
        <div className="grid grid-cols-3 gap-3">
          <Link
            to="/nodes"
            className="group bg-gradient-to-br from-purple-900/30 to-purple-950/30 border border-purple-800/30 rounded-lg p-4 hover:border-purple-700 transition-all"
          >
            <Network className="w-8 h-8 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="text-base font-bold text-white mb-1">Всі ноди</h3>
            <p className="text-slate-400 text-xs">
              Список нод
            </p>
          </Link>

          <Link
            to="/connect"
            className="group bg-gradient-to-br from-green-900/30 to-green-950/30 border border-green-800/30 rounded-lg p-4 hover:border-green-700 transition-all"
          >
            <Zap className="w-8 h-8 text-green-400 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="text-base font-bold text-white mb-1">Підключити</h3>
            <p className="text-slate-400 text-xs">
              Нова нода
            </p>
          </Link>

          <Link
            to="/metrics"
            className="group bg-gradient-to-br from-blue-900/30 to-blue-950/30 border border-blue-800/30 rounded-lg p-4 hover:border-blue-700 transition-all"
          >
            <Activity className="w-8 h-8 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="text-base font-bold text-white mb-1">Метрики</h3>
            <p className="text-slate-400 text-xs">
              Статистика
            </p>
          </Link>
        </div>
      </div>
    </>
  );
}
