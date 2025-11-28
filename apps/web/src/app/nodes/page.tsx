'use client';

import Link from 'next/link';
import { Server, Cpu, Users, Activity, ExternalLink } from 'lucide-react';
import { useNodeList } from '@/hooks/useNodes';
import { NodeProfile } from '@/lib/types/nodes';

function getNodeLabel(nodeId: string): string {
  if (nodeId.includes('node-1')) return 'НОДА1';
  if (nodeId.includes('node-2')) return 'НОДА2';
  return 'НОДА';
}

function NodeCard({ node }: { node: NodeProfile }) {
  const isOnline = node.status === 'online';
  const nodeLabel = getNodeLabel(node.node_id);
  const isProduction = node.environment === 'production';

  return (
    <Link
      href={`/nodes/${node.node_id}`}
      className="group bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 hover:border-purple-500/50 transition-all hover:bg-white/10"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isProduction ? 'bg-emerald-500/20' : 'bg-amber-500/20'
          }`}>
            <Server className={`w-6 h-6 ${
              isProduction ? 'text-emerald-400' : 'text-amber-400'
            }`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors">
              {nodeLabel}
            </h3>
            <p className="text-sm text-white/50">{node.name}</p>
          </div>
        </div>
        <span className={`flex items-center gap-1.5 text-xs ${
          isOnline ? 'text-emerald-400' : 'text-red-400'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
          }`} />
          {isOnline ? 'online' : 'offline'}
        </span>
      </div>

      {/* Info */}
      <div className="space-y-3 mb-4">
        {node.hostname && (
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Activity className="w-4 h-4" />
            <span className="font-mono">{node.hostname}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Cpu className="w-4 h-4" />
          <span>{node.environment}</span>
        </div>
      </div>

      {/* Roles */}
      {node.roles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {node.roles.map((role) => (
            <span
              key={role}
              className="px-2 py-0.5 bg-purple-500/10 text-purple-300 rounded text-xs"
            >
              {role}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="pt-4 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm">
            <Users className="w-4 h-4 text-cyan-400" />
            <span className="text-white">{node.agents_total}</span>
            <span className="text-white/40">агентів</span>
          </div>
          <div className="text-sm">
            <span className="text-emerald-400">{node.agents_online}</span>
            <span className="text-white/40"> online</span>
          </div>
        </div>
        <span className="text-purple-400 text-sm group-hover:translate-x-1 transition-transform">
          Open →
        </span>
      </div>
    </Link>
  );
}

export default function NodesPage() {
  const { nodes, total, isLoading, error } = useNodeList();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Server className="w-8 h-8 text-purple-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Node Directory
            </h1>
          </div>
          <p className="text-white/60 text-lg">
            Всі ноди мережі DAARION
          </p>
          <p className="text-purple-400 mt-2">
            Знайдено нод: {total}
          </p>
        </div>

        {/* Legend */}
        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4 mb-8">
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-white/60">Production</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-white/60">Development</span>
            </div>
          </div>
        </div>

        {/* Content */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center mb-8">
            <p className="text-red-400">Помилка завантаження нод</p>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="bg-white/5 rounded-2xl border border-white/10 p-6 animate-pulse"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-white/10 rounded w-1/3" />
                    <div className="h-4 bg-white/10 rounded w-2/3" />
                  </div>
                </div>
                <div className="h-4 bg-white/10 rounded w-full mb-2" />
                <div className="h-4 bg-white/10 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : nodes.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-12 text-center">
            <Server className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Ноди не знайдені
            </h2>
            <p className="text-white/50">
              Наразі немає зареєстрованих нод.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {nodes.map((node) => (
              <NodeCard key={node.node_id} node={node} />
            ))}
          </div>
        )}

        {/* Links */}
        <div className="mt-12 flex flex-wrap gap-4">
          <Link
            href="/agents"
            className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 rounded-lg text-violet-400 transition-colors"
          >
            <Users className="w-4 h-4" />
            Agent Console
            <ExternalLink className="w-3 h-3" />
          </Link>
          <Link
            href="/citizens"
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 transition-colors"
          >
            <Users className="w-4 h-4" />
            Публічні громадяни
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
