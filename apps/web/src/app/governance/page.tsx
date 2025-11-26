import Link from 'next/link'
import { Wallet, Users, Vote, FileText, TrendingUp, Shield, ArrowRight } from 'lucide-react'
import { api, MicroDAO } from '@/lib/api'
import { cn } from '@/lib/utils'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

async function getMicroDAOs(): Promise<MicroDAO[]> {
  try {
    return await api.getMicroDAOs()
  } catch (error) {
    console.error('Failed to fetch MicroDAOs:', error)
    return []
  }
}

export default async function GovernancePage() {
  const daos = await getMicroDAOs()

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20">
              <Wallet className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Governance</h1>
              <p className="text-slate-400">MicroDAO управління та голосування</p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users} label="MicroDAOs" value={daos.length.toString()} color="amber" />
          <StatCard icon={Vote} label="Активних пропозицій" value="0" color="cyan" />
          <StatCard icon={FileText} label="Всього пропозицій" value="0" color="violet" />
          <StatCard icon={TrendingUp} label="Участь" value="0%" color="emerald" />
        </div>

        {/* MicroDAOs List */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            Ваші MicroDAO
          </h2>

          {daos.length === 0 ? (
            <div className="glass-panel p-12 text-center">
              <Wallet className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                MicroDAO не знайдено
              </h3>
              <p className="text-slate-400 mb-6">
                Ви ще не є учасником жодного MicroDAO.
              </p>
              <button className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-medium text-white hover:from-amber-400 hover:to-orange-500 transition-all">
                Створити MicroDAO
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {daos.map((dao) => (
                <DAOCard key={dao.id} dao={dao} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Швидкі дії</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ActionCard
              icon={Vote}
              title="Голосувати"
              description="Переглянути активні пропозиції та проголосувати"
              href="/governance/proposals"
            />
            <ActionCard
              icon={FileText}
              title="Створити пропозицію"
              description="Запропонувати зміни для вашого MicroDAO"
              href="/governance/create-proposal"
            />
            <ActionCard
              icon={Users}
              title="Учасники"
              description="Переглянути членів та їх ролі"
              href="/governance/members"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  color: 'amber' | 'cyan' | 'violet' | 'emerald'
}) {
  const colorClasses = {
    amber: 'text-amber-400',
    cyan: 'text-cyan-400',
    violet: 'text-violet-400',
    emerald: 'text-emerald-400'
  }

  return (
    <div className="glass-panel p-4">
      <Icon className={cn('w-5 h-5 mb-2', colorClasses[color])} />
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  )
}

function DAOCard({ dao }: { dao: MicroDAO }) {
  return (
    <Link
      href={`/governance/${dao.id}`}
      className="glass-panel-hover p-6 group block"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-600/30 flex items-center justify-center">
            <Shield className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white group-hover:text-amber-400 transition-colors">
              {dao.name}
            </h3>
            <p className="text-sm text-slate-400">{dao.slug}</p>
          </div>
        </div>
        
        <span className={cn(
          'px-2 py-0.5 text-xs rounded-full',
          dao.is_active 
            ? 'bg-emerald-500/20 text-emerald-400' 
            : 'bg-slate-700/50 text-slate-400'
        )}>
          {dao.is_active ? 'Активний' : 'Неактивний'}
        </span>
      </div>

      <p className="text-sm text-slate-400 mb-4 line-clamp-2">
        {dao.description || 'Без опису'}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            0 учасників
          </span>
          <span className="flex items-center gap-1">
            <Vote className="w-3 h-3" />
            0 пропозицій
          </span>
        </div>
        
        <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  )
}

function ActionCard({
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
      className="glass-panel p-5 hover:bg-white/5 transition-colors group"
    >
      <Icon className="w-8 h-8 text-amber-400 mb-3 group-hover:scale-110 transition-transform" />
      <h3 className="font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </Link>
  )
}

