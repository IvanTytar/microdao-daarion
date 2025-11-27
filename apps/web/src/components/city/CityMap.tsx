'use client'

import { useRouter } from 'next/navigation'
import { useCityMap, CityMapRoom } from '@/hooks/useCityMap'
import { useGlobalPresence } from '@/hooks/useGlobalPresence'
import { cn } from '@/lib/utils'
import { 
  MessageSquare, 
  Zap, 
  FlaskConical, 
  Hammer, 
  HandMetal,
  Users,
  Bot,
  Loader2
} from 'lucide-react'
import { AgentPresence } from '@/lib/global-presence'

// Icon mapping
const iconMap: Record<string, React.ElementType> = {
  'message-square': MessageSquare,
  'zap': Zap,
  'flask-conical': FlaskConical,
  'hammer': Hammer,
  'hand-wave': HandMetal,
}

// Color mapping to Tailwind classes
const colorMap: Record<string, string> = {
  cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 hover:border-cyan-400/50',
  green: 'from-green-500/20 to-green-600/10 border-green-500/30 hover:border-green-400/50',
  orange: 'from-orange-500/20 to-orange-600/10 border-orange-500/30 hover:border-orange-400/50',
  purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 hover:border-purple-400/50',
  yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 hover:border-yellow-400/50',
  blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 hover:border-blue-400/50',
}

const textColorMap: Record<string, string> = {
  cyan: 'text-cyan-400',
  green: 'text-green-400',
  orange: 'text-orange-400',
  purple: 'text-purple-400',
  yellow: 'text-yellow-400',
  blue: 'text-blue-400',
}

interface RoomTileProps {
  room: CityMapRoom
  online: number
  typing: number
  agents: AgentPresence[]
  cellSize: number
  onClick: () => void
}

function RoomTile({ room, online, typing, agents, cellSize, onClick }: RoomTileProps) {
  const Icon = iconMap[room.icon || 'message-square'] || MessageSquare
  const colorClass = colorMap[room.color || 'cyan'] || colorMap.cyan
  const textColor = textColorMap[room.color || 'cyan'] || textColorMap.cyan
  
  // Calculate brightness based on online count
  const brightness = Math.min(1, 0.3 + (online * 0.15))
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute rounded-xl border transition-all duration-300',
        'bg-gradient-to-br backdrop-blur-sm',
        'hover:scale-[1.02] hover:shadow-lg cursor-pointer',
        'flex flex-col items-center justify-center gap-1 p-2',
        colorClass
      )}
      style={{
        left: room.x * cellSize,
        top: room.y * cellSize,
        width: room.w * cellSize - 8,
        height: room.h * cellSize - 8,
        opacity: brightness,
      }}
      title={`${room.name} - ${online} online`}
    >
      <Icon className={cn('w-6 h-6', textColor)} />
      <span className="text-xs font-medium text-white truncate max-w-full">
        {room.name}
      </span>
      
      {/* Online count */}
      <div className="flex items-center gap-1">
        <Users className="w-3 h-3 text-slate-400" />
        <span className={cn(
          'text-xs font-bold',
          online > 0 ? 'text-green-400' : 'text-slate-500'
        )}>
          {online}
        </span>
        
        {/* Typing indicator */}
        {typing > 0 && (
          <span className="text-xs text-cyan-400 animate-pulse">...</span>
        )}
      </div>
      
      {/* Agent badges */}
      {agents.length > 0 && (
        <div className="flex items-center gap-1 mt-1">
          {agents.slice(0, 3).map((agent) => (
            <div
              key={agent.agent_id}
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center',
                'bg-slate-800/80 border',
                agent.status === 'online' ? 'border-green-500/50' : 'border-orange-500/50'
              )}
              title={`${agent.display_name} (${agent.status})`}
            >
              <Bot className={cn(
                'w-3 h-3',
                textColorMap[agent.color || 'cyan'] || 'text-cyan-400'
              )} />
            </div>
          ))}
          {agents.length > 3 && (
            <span className="text-xs text-slate-400">+{agents.length - 3}</span>
          )}
        </div>
      )}
    </button>
  )
}

export function CityMap() {
  const router = useRouter()
  const { config, rooms, loading, error } = useCityMap()
  const { cityOnline, roomsPresence, agents } = useGlobalPresence()

  if (loading) {
    return (
      <div className="glass-panel p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="ml-3 text-slate-400">Завантаження мапи...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-panel p-8 text-center">
        <p className="text-red-400">Помилка завантаження мапи: {error}</p>
      </div>
    )
  }

  if (!config || rooms.length === 0) {
    return (
      <div className="glass-panel p-8 text-center">
        <p className="text-slate-400">Мапа міста порожня</p>
      </div>
    )
  }

  const cellSize = config.cell_size
  const mapWidth = config.grid_width * cellSize
  const mapHeight = config.grid_height * cellSize

  // Count online agents
  const onlineAgents = agents.filter(a => a.status === 'online' || a.status === 'busy')

  return (
    <div className="glass-panel p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Мапа Міста</h2>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-green-400" />
            <span className="text-green-400 font-medium">{cityOnline}</span>
            <span className="text-slate-400">онлайн</span>
          </div>
          <div className="flex items-center gap-1">
            <Bot className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 font-medium">{onlineAgents.length}</span>
            <span className="text-slate-400">агентів</span>
          </div>
        </div>
      </div>

      {/* Map container */}
      <div 
        className="relative bg-slate-900/50 rounded-xl overflow-hidden"
        style={{ 
          width: mapWidth, 
          height: mapHeight,
          maxWidth: '100%',
        }}
      >
        {/* Grid background */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: `${cellSize}px ${cellSize}px`,
          }}
        />

        {/* Room tiles */}
        {rooms.map((room) => {
          const presence = roomsPresence[room.id]
          const roomAgents = agents.filter(a => a.room_id === room.id)
          
          return (
            <RoomTile
              key={room.id}
              room={room}
              online={presence?.online || 0}
              typing={presence?.typing || 0}
              agents={roomAgents}
              cellSize={cellSize}
              onClick={() => router.push(`/city/${room.slug}`)}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-cyan-500/40 to-cyan-600/20" />
          <span>Public</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-green-500/40 to-green-600/20" />
          <span>Social</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-purple-500/40 to-purple-600/20" />
          <span>Science</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-orange-500/40 to-orange-600/20" />
          <span>Builders</span>
        </div>
      </div>
    </div>
  )
}

