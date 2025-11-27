import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Activity, Search, Filter, Zap, Gauge } from 'lucide-react';

interface AgentItem {
  id: string;
  name: string;
  node_id: string;
  team: string;
  role: string;
  model: string;
  status: string;
  metrics: {
    calls_24h: number;
    tokens_in: number;
    tokens_out: number;
    latency_p95_ms: number;
    error_rate_percent: number;
  };
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [nodeFilter, setNodeFilter] = useState('all');

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/agents');
        const data = await res.json();
        setAgents(data.agents || []);
      } catch (error) {
        console.error('Failed to load agents registry:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  const nodeOptions = useMemo(() => {
    const nodes = new Set<string>();
    agents.forEach((agent) => nodes.add(agent.node_id));
    return Array.from(nodes);
  }, [agents]);

  const teamOptions = useMemo(() => {
    const teams = new Set<string>();
    agents.forEach((agent) => teams.add(agent.team));
    return Array.from(teams).sort();
  }, [agents]);

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(search.toLowerCase()) ||
      agent.role.toLowerCase().includes(search.toLowerCase()) ||
      agent.model.toLowerCase().includes(search.toLowerCase());
    const matchesNode = nodeFilter === 'all' || agent.node_id === nodeFilter;
    const matchesTeam = teamFilter === 'all' || agent.team === teamFilter;
    return matchesSearch && matchesNode && matchesTeam;
  });

  const summary = useMemo(() => {
    const total = agents.length;
    const healthy = agents.filter((agent) => agent.status === 'healthy').length;
    const slow = agents.filter((agent) => agent.status === 'slow').length;
    const avgLatency =
      total > 0
        ? Math.round(
            agents.reduce((sum, agent) => sum + agent.metrics.latency_p95_ms, 0) / total,
          )
        : 0;
    return { total, healthy, slow, avgLatency };
  }, [agents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Завантажуємо агентів...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Реєстр агентів</h1>
          <p className="text-slate-400 text-sm">
            Центральний огляд усіх агентів DAGI / MicroDAO з метриками та статусом
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400">Всього агентів</p>
          <p className="text-3xl font-bold text-white">{summary.total}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400">Healthy</p>
          <p className="text-3xl font-bold text-green-400">{summary.healthy}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400">Slow</p>
          <p className="text-3xl font-bold text-amber-300">{summary.slow}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400">Avg latency</p>
          <p className="text-3xl font-bold text-white">{summary.avgLatency} мс</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Пошук за назвою, роллю або моделлю..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex-1 flex gap-3">
          <div className="flex-1 relative">
            <Filter className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
              value={nodeFilter}
              onChange={(e) => setNodeFilter(e.target.value)}
            >
              <option value="all">Всі ноди</option>
              {nodeOptions.map((node) => (
                <option key={node} value={node}>
                  {node}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 relative">
            <Users className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="all">Всі команди</option>
              {teamOptions.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-9 gap-4 text-xs text-slate-500 uppercase tracking-wide px-6 py-3 border-b border-slate-800">
          <span>Агент</span>
          <span>Нода</span>
          <span>Команда</span>
          <span>Модель</span>
          <span>Виклики (24h)</span>
          <span>Tokens</span>
          <span>Latency</span>
          <span>Error rate</span>
          <span></span>
        </div>
        {filteredAgents.length === 0 && (
          <div className="text-center py-12 text-slate-500">Агентів не знайдено</div>
        )}
        {filteredAgents.map((agent) => (
          <div
            key={agent.id}
            className="grid grid-cols-9 gap-4 px-6 py-4 border-b border-slate-800 text-sm items-center hover:bg-slate-900/80 transition-colors"
          >
            <div>
              <p className="text-white font-semibold">{agent.name}</p>
              <p className="text-slate-500 text-xs">{agent.role}</p>
            </div>
            <div>
              <span className="text-xs px-2 py-1 rounded bg-indigo-500/10 text-indigo-300">
                {agent.node_id}
              </span>
            </div>
            <div className="text-slate-300">{agent.team}</div>
            <div className="text-slate-300 font-mono text-xs">{agent.model}</div>
            <div className="text-white font-semibold">
              {agent.metrics.calls_24h.toLocaleString('uk-UA')}
            </div>
            <div className="text-slate-300 text-xs">
              <div>in: {agent.metrics.tokens_in.toLocaleString('uk-UA')}</div>
              <div>out: {agent.metrics.tokens_out.toLocaleString('uk-UA')}</div>
            </div>
            <div className="text-slate-300">{agent.metrics.latency_p95_ms} мс</div>
            <div
              className={
                agent.metrics.error_rate_percent > 2
                  ? 'text-red-300 font-semibold'
                  : 'text-green-300'
              }
            >
              {agent.metrics.error_rate_percent.toFixed(2)}%
            </div>
            <div className="text-right">
              <Link
                to={`/agents/${agent.id}`}
                className="text-xs px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              >
                Деталі
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

