'use client';

import Link from 'next/link';
import { Bot, Users, Building2, Server, ExternalLink } from 'lucide-react';
import { useAgentList } from '@/hooks/useAgents';
import { AgentSummary } from '@/lib/types/agents';

// Kind emoji mapping
const kindEmoji: Record<string, string> = {
  vision: '👁️',
  curator: '🎨',
  security: '🛡️',
  finance: '💰',
  civic: '🏛️',
  oracle: '🔮',
  builder: '🏗️',
  research: '🔬',
  marketing: '📢',
  orchestrator: '🎭',
  mediator: '⚖️',
  assistant: '🤖',
};

function getNodeBadge(nodeId: string | undefined | null): { label: string; color: string } {
  if (!nodeId) return { label: 'Unknown', color: 'bg-gray-500/20 text-gray-400' };
  if (nodeId.includes('node-1')) return { label: 'НОДА1', color: 'bg-emerald-500/20 text-emerald-400' };
  if (nodeId.includes('node-2')) return { label: 'НОДА2', color: 'bg-amber-500/20 text-amber-400' };
  return { label: 'НОДА', color: 'bg-purple-500/20 text-purple-400' };
}

function AgentCard({ agent }: { agent: AgentSummary }) {
  const isOnline = agent.status === 'online';
  const statusColor = isOnline ? 'text-emerald-400' : 'text-white/40';
  const emoji = kindEmoji[agent.kind] || '🤖';
  const nodeBadge = getNodeBadge(agent.home_node?.id);

  return (
    <Link
      href={`/agents/${agent.id}`}
      className="group bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 hover:border-violet-500/50 transition-all hover:bg-white/10"
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500/30 to-purple-600/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {agent.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={agent.avatar_url}
              alt={agent.display_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl">{emoji}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate group-hover:text-violet-400 transition-colors">
            {agent.display_name}
          </h3>
          {agent.public_title && (
            <p className="text-sm text-cyan-400">{agent.public_title}</p>
          )}
          <p className="text-xs text-white/50 mt-1">{agent.kind}</p>
        </div>
      </div>

      {/* District & MicroDAO */}
      <div className="space-y-2 mb-4">
        {agent.district && (
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Building2 className="w-4 h-4" />
            <span>{agent.district}</span>
          </div>
        )}
        {agent.microdao_memberships.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Users className="w-4 h-4" />
            <span>{agent.microdao_memberships[0].microdao_name}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs ${statusColor}`}>
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-500' : 'bg-white/30'
              }`}
            />
            {isOnline ? 'online' : 'offline'}
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${nodeBadge.color}`}>
            {nodeBadge.label}
          </span>
          {agent.is_public && (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-500/20 text-cyan-400">
              Public
            </span>
          )}
        </div>
        <span className="text-violet-400 text-sm group-hover:translate-x-1 transition-transform">
          Open →
        </span>
      </div>
    </Link>
  );
}

export default function AgentsPage() {
  const { agents, total, isLoading, error } = useAgentList({ limit: 100 });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Bot className="w-8 h-8 text-violet-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              Agent Console
            </h1>
          </div>
          <p className="text-white/60 text-lg">
            Всі AI-агенти мережі DAARION
          </p>
          <p className="text-cyan-400 mt-2">
            Знайдено агентів: {total}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 mb-8">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-white/40" />
              <span className="text-sm text-white/60">Фільтр по нодах:</span>
              <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400">
                НОДА1 (Production)
              </span>
              <span className="px-2 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
                НОДА2 (Development)
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center mb-8">
            <p className="text-red-400">Помилка завантаження агентів</p>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white/5 rounded-2xl border border-white/10 p-6 animate-pulse"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-white/10 rounded w-3/4" />
                    <div className="h-4 bg-white/10 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-4 bg-white/10 rounded w-full mb-2" />
                <div className="h-4 bg-white/10 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-12 text-center">
            <Bot className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Агенти не знайдені
            </h2>
            <p className="text-white/50">
              Наразі немає доступних агентів. Спробуйте пізніше.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}

        {/* Links */}
        <div className="mt-12 flex flex-wrap gap-4">
          <Link
            href="/citizens"
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 transition-colors"
          >
            <Users className="w-4 h-4" />
            Публічні громадяни
            <ExternalLink className="w-3 h-3" />
          </Link>
          <Link
            href="/nodes"
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-400 transition-colors"
          >
            <Server className="w-4 h-4" />
            Node Dashboard
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
