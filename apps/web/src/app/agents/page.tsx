import Link from 'next/link'
import { Bot, Zap, Clock, CheckCircle2, XCircle, Sparkles } from 'lucide-react'
import { api, Agent } from '@/lib/api'
import { cn } from '@/lib/utils'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

async function getAgents(): Promise<Agent[]> {
  try {
    return await api.getAgents()
  } catch (error) {
    console.error('Failed to fetch agents:', error)
    return []
  }
}

export default async function AgentsPage() {
  const agents = await getAgents()

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20">
              <Bot className="w-8 h-8 text-violet-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Agent Console</h1>
              <p className="text-slate-400">Управління та виклик AI-агентів</p>
            </div>
          </div>
        </div>

        {/* Agents Grid */}
        {agents.length === 0 ? (
          <div className="glass-panel p-12 text-center">
            <Bot className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Агенти не знайдені
            </h2>
            <p className="text-slate-400">
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

        {/* Quick Actions */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            Швидкі дії
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickAction
              icon={Zap}
              title="Швидкий виклик"
              description="Викликати агента одним кліком"
              href="/agents/invoke"
            />
            <QuickAction
              icon={Clock}
              title="Історія"
              description="Переглянути історію викликів"
              href="/agents/history"
            />
            <QuickAction
              icon={Bot}
              title="Створити агента"
              description="Налаштувати нового агента"
              href="/agents/create"
            />
            <QuickAction
              icon={Sparkles}
              title="Blueprints"
              description="Шаблони агентів"
              href="/agents/blueprints"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function AgentCard({ agent }: { agent: Agent }) {
  const isOnline = agent.status === 'active' && agent.is_active

  return (
    <Link
      href={`/agents/${agent.id}`}
      className="glass-panel-hover p-6 group block"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className={cn(
          'w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0',
          'bg-gradient-to-br from-violet-500/30 to-purple-600/30'
        )}>
          {agent.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={agent.avatar_url} 
              alt={agent.name}
              className="w-full h-full rounded-xl object-cover"
            />
          ) : (
            <Bot className="w-7 h-7 text-violet-400" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-white truncate group-hover:text-violet-400 transition-colors">
              {agent.name}
            </h3>
            {isOnline ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
            )}
          </div>
          
          <p className="text-sm text-slate-400 line-clamp-2 mb-3">
            {agent.description || 'Без опису'}
          </p>

          <div className="flex items-center gap-3 text-xs">
            <span className={cn(
              'px-2 py-0.5 rounded-full',
              agent.kind === 'text' && 'bg-cyan-500/20 text-cyan-400',
              agent.kind === 'multimodal' && 'bg-violet-500/20 text-violet-400',
              agent.kind === 'system' && 'bg-amber-500/20 text-amber-400'
            )}>
              {agent.kind}
            </span>
            {agent.model && (
              <span className="text-slate-500 truncate">
                {agent.model}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Capabilities */}
      {agent.capabilities && agent.capabilities.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex flex-wrap gap-1.5">
            {agent.capabilities.slice(0, 3).map((cap, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-xs bg-slate-800/50 text-slate-400 rounded"
              >
                {cap}
              </span>
            ))}
            {agent.capabilities.length > 3 && (
              <span className="px-2 py-0.5 text-xs text-slate-500">
                +{agent.capabilities.length - 3}
              </span>
            )}
          </div>
        </div>
      )}
    </Link>
  )
}

function QuickAction({
  icon: Icon,
  title,
  description,
  href
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="glass-panel p-4 hover:bg-white/5 transition-colors group"
    >
      <Icon className="w-6 h-6 text-violet-400 mb-3 group-hover:scale-110 transition-transform" />
      <h3 className="font-medium text-white mb-1">{title}</h3>
      <p className="text-xs text-slate-400">{description}</p>
    </Link>
  )
}

