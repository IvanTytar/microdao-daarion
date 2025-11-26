'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Building2, Users, Star, MessageSquare, ArrowRight, Loader2 } from 'lucide-react'
import { api, CityRoom } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useGlobalPresence } from '@/hooks/useGlobalPresence'

export default function CityPage() {
  const [rooms, setRooms] = useState<CityRoom[]>([])
  const [loading, setLoading] = useState(true)
  const { cityOnline, roomsPresence } = useGlobalPresence()

  useEffect(() => {
    async function fetchRooms() {
      try {
        const data = await api.getCityRooms()
        setRooms(data)
      } catch (error) {
        console.error('Failed to fetch city rooms:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchRooms()
  }, [])

  // Use SSE presence data if available, otherwise fallback to API data
  const totalOnline = cityOnline > 0 
    ? cityOnline 
    : rooms.reduce((sum, r) => sum + r.members_online, 0)
  
  const activeRooms = Object.values(roomsPresence).filter(p => p.online > 0).length ||
    rooms.filter(r => r.members_online > 0).length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    )
  }

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
          
          {/* Live indicator */}
          {totalOnline > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-emerald-400 font-medium">
                {totalOnline} у місті зараз
              </span>
            </div>
          )}
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
              <RoomCard 
                key={room.id} 
                room={room} 
                livePresence={roomsPresence[room.id]}
              />
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
              value={totalOnline}
              icon={Users}
              highlight={totalOnline > 0}
            />
            <StatCard
              label="За замовч."
              value={rooms.filter(r => r.is_default).length}
              icon={Star}
            />
            <StatCard
              label="Активних"
              value={activeRooms}
              icon={MessageSquare}
              highlight={activeRooms > 0}
            />
          </div>
        )}
      </div>
    </div>
  )
}

interface RoomCardProps {
  room: CityRoom
  livePresence?: { online: number; typing: number }
}

function RoomCard({ room, livePresence }: RoomCardProps) {
  // Use live presence if available, otherwise fallback to API data
  const onlineCount = livePresence?.online ?? room.members_online
  const typingCount = livePresence?.typing ?? 0
  const isActive = onlineCount > 0

  return (
    <Link
      href={`/city/${room.slug}`}
      className={cn(
        "glass-panel-hover p-5 group block transition-all",
        isActive && "ring-1 ring-emerald-500/30"
      )}
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
            {onlineCount} онлайн
          </span>
          
          {typingCount > 0 && (
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              друкує
            </span>
          )}
        </div>

        <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  )
}

function StatCard({ 
  label, 
  value, 
  icon: Icon,
  highlight = false
}: { 
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  highlight?: boolean
}) {
  return (
    <div className={cn(
      "glass-panel p-4 text-center transition-all",
      highlight && "ring-1 ring-emerald-500/30"
    )}>
      <Icon className={cn(
        "w-5 h-5 mx-auto mb-2",
        highlight ? "text-emerald-400" : "text-cyan-400"
      )} />
      <div className={cn(
        "text-2xl font-bold",
        highlight ? "text-emerald-400" : "text-white"
      )}>
        {value}
      </div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  )
}

