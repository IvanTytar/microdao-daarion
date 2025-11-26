import Link from 'next/link'
import { Building2, Users, Star, MessageSquare, ArrowRight } from 'lucide-react'
import { api, CityRoom } from '@/lib/api'
import { cn } from '@/lib/utils'

// Force dynamic rendering - don't prerender at build time
export const dynamic = 'force-dynamic'

async function getCityRooms(): Promise<CityRoom[]> {
  try {
    return await api.getCityRooms()
  } catch (error) {
    console.error('Failed to fetch city rooms:', error)
    return []
  }
}

export default async function CityPage() {
  const rooms = await getCityRooms()

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20">
              <Building2 className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Кімнати Міста</h1>
              <p className="text-slate-400">Оберіть кімнату для спілкування</p>
            </div>
          </div>
        </div>

        {/* Rooms Grid */}
        {rooms.length === 0 ? (
          <div className="glass-panel p-12 text-center">
            <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Кімнати не знайдено
            </h2>
            <p className="text-slate-400">
              API недоступний або кімнати ще не створені
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        )}

        {/* Stats Section */}
        {rooms.length > 0 && (
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Кімнат"
              value={rooms.length}
              icon={Building2}
            />
            <StatCard
              label="Онлайн"
              value={rooms.reduce((sum, r) => sum + r.members_online, 0)}
              icon={Users}
            />
            <StatCard
              label="За замовч."
              value={rooms.filter(r => r.is_default).length}
              icon={Star}
            />
            <StatCard
              label="Активних"
              value={rooms.filter(r => r.members_online > 0).length}
              icon={MessageSquare}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function RoomCard({ room }: { room: CityRoom }) {
  const isActive = room.members_online > 0

  return (
    <Link
      href={`/city/${room.slug}`}
      className="glass-panel-hover p-5 group block"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
          {room.name}
        </h3>
        <div className="flex items-center gap-2">
          {room.is_default && (
            <span className="px-2 py-0.5 text-xs font-medium bg-cyan-500/20 text-cyan-400 rounded-full">
              Default
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-400 mb-4 line-clamp-2">
        {room.description || 'Без опису'}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className={cn(
            'flex items-center gap-1.5',
            isActive ? 'text-emerald-400' : 'text-slate-500'
          )}>
            <span className={cn(
              'w-2 h-2 rounded-full',
              isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
            )} />
            {room.members_online} онлайн
          </span>
        </div>

        <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  )
}

function StatCard({ 
  label, 
  value, 
  icon: Icon 
}: { 
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="glass-panel p-4 text-center">
      <Icon className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  )
}

