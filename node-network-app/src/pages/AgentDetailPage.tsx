import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Activity,
  Gauge,
  ShieldCheck,
  Brain,
  Zap,
  AlertTriangle,
} from 'lucide-react';

export default function AgentDetailPage() {
  const { agentId } = useParams();
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const res = await fetch(`/api/agents/${agentId}`);
        if (!res.ok) {
          throw new Error('Agent not found');
        }
        const data = await res.json();
        setAgent(data);
      } catch (error) {
        console.error('Failed to fetch agent profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [agentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Завантажуємо дані агента...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400 text-lg mb-4">Агент не знайдений</p>
        <Link to="/agents" className="text-purple-400 hover:text-purple-300">
          ← Повернутися до списку
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/agents"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Назад до агентів
      </Link>

      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Users className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-1">{agent.name}</h1>
            <p className="text-slate-400 text-sm">{agent.role}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs bg-slate-800 text-slate-300">
              {agent.node_id}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs ${
                agent.status === 'healthy'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-300'
              }`}
            >
              {agent.status.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-400">
          <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-300">
            Команда: {agent.team}
          </span>
          <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-300">
            Модель: {agent.model}
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300">
            Owner: {agent.owner}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <Activity className="w-5 h-5 text-purple-400 mb-2" />
          <p className="text-xs text-slate-400">Calls / 24h</p>
          <p className="text-3xl font-bold text-white">{agent.metrics.calls_24h}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <Zap className="w-5 h-5 text-emerald-400 mb-2" />
          <p className="text-xs text-slate-400">Tokens</p>
          <p className="text-lg font-bold text-white">
            {agent.metrics.tokens_in.toLocaleString('uk-UA')} /{' '}
            {agent.metrics.tokens_out.toLocaleString('uk-UA')}
          </p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <Gauge className="w-5 h-5 text-yellow-300 mb-2" />
          <p className="text-xs text-slate-400">Latency p95</p>
          <p className="text-3xl font-bold text-white">{agent.metrics.latency_p95_ms} мс</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-red-300 mb-2" />
          <p className="text-xs text-slate-400">Error rate</p>
          <p className="text-3xl font-bold text-white">
            {agent.metrics.error_rate_percent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Usage */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-blue-400" />
          <h3 className="text-xl font-bold text-white">Usage (останні 24 год)</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-400 mb-2">Calls per hour</p>
            <div className="space-y-2 text-xs">
              {agent.usage_chart.calls_series.slice(-8).map((item: any) => (
                <div key={`calls-${item.hour}`} className="flex items-center gap-2">
                  <span className="w-8 text-slate-500">{item.hour}h</span>
                  <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-purple-500"
                      style={{ width: `${Math.min(item.calls, 120)}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-white">{item.calls}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-2">Latency trend</p>
            <div className="space-y-2 text-xs">
              {agent.usage_chart.latency_series_ms.slice(-8).map((item: any) => (
                <div key={`lat-${item.hour}`} className="flex items-center gap-2">
                  <span className="w-8 text-slate-500">{item.hour}h</span>
                  <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${Math.min(item.latency / 15, 100)}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-white">{Math.round(item.latency)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quality & Memory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="w-5 h-5 text-green-400" />
            <h3 className="text-xl font-bold text-white">Quality</h3>
          </div>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex items-center justify-between">
              <span>Timeouts</span>
              <span className="font-semibold">{agent.quality.timeouts}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Model errors</span>
              <span className="font-semibold">{agent.quality.model_errors}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tool errors</span>
              <span className="font-semibold">{agent.quality.tool_errors}</span>
            </div>
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-5 h-5 text-pink-400" />
            <h3 className="text-xl font-bold text-white">Context & Memory</h3>
          </div>
          <p className="text-xs text-slate-400 mb-2">Scopes</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {agent.memory.scopes.map((scope: string) => (
              <span key={scope} className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs">
                {scope}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-400 mb-1">Документів в пам'яті</p>
          <p className="text-2xl font-bold text-white">{agent.memory.documents_indexed}</p>
        </div>
      </div>

      {/* Security & Controls */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="w-5 h-5 text-blue-400" />
          <h3 className="text-xl font-bold text-white">Security & Controls</h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {agent.security.scopes.map((scope: string) => (
            <span key={scope} className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs">
              {scope}
            </span>
          ))}
        </div>
        <p className="text-xs text-slate-400 mb-4">
          External API access: {agent.security.external_api_access ? 'дозволено' : 'заборонено'}
        </p>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-yellow-600/40 border border-yellow-500/40 rounded-lg text-yellow-100 text-sm hover:bg-yellow-600/60 transition-colors">
            Pause agent
          </button>
          <button className="px-4 py-2 bg-red-600/40 border border-red-500/40 rounded-lg text-red-100 text-sm hover:bg-red-600/60 transition-colors">
            Clear cache
          </button>
        </div>
      </div>
    </div>
  );
}

