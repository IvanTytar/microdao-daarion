import Link from 'next/link'
import { ArrowLeft, Users, MessageSquare, FileText, Clock, Send } from 'lucide-react'
import { api, CityRoom } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { notFound } from 'next/navigation'

// Force dynamic rendering - don't prerender at build time
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getRoom(slug: string): Promise<CityRoom | null> {
  try {
    return await api.getCityRoom(slug)
  } catch (error) {
    console.error('Failed to fetch room:', error)
    return null
  }
}

export default async function RoomPage({ params }: PageProps) {
  const { slug } = await params
  const room = await getRoom(slug)

  if (!room) {
    notFound()
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-4 py-6 border-b border-white/5">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/city"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад до кімнат
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {room.name}
              </h1>
              <p className="text-slate-400 mt-1">
                {room.description || 'Без опису'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400">{room.members_online} онлайн</span>
              </div>
              {room.is_default && (
                <span className="px-3 py-1 text-xs font-medium bg-cyan-500/20 text-cyan-400 rounded-full">
                  Default Room
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Area */}
          <div className="lg:col-span-2">
            <div className="glass-panel h-[500px] sm:h-[600px] flex flex-col">
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-cyan-400" />
                  <span className="font-medium text-white">Чат кімнати</span>
                </div>
              </div>

              {/* Messages Placeholder */}
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
                    <MessageSquare className="w-8 h-8 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">
                    Чат скоро буде доступний
                  </h3>
                  <p className="text-sm text-slate-400 max-w-sm">
                    Matrix/WebSocket інтеграція буде додана в наступному оновленні. 
                    Поки що ви можете переглядати інформацію про кімнату.
                  </p>
                </div>
              </div>

              {/* Input Placeholder */}
              <div className="px-4 py-4 border-t border-white/10">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Напишіть повідомлення..."
                    disabled
                    className="flex-1 px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    disabled
                    className="px-4 py-3 bg-cyan-500/20 text-cyan-400 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Room Info */}
            <div className="glass-panel p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                Інформація
              </h3>
              
              <div className="space-y-4">
                <InfoRow label="ID" value={room.id} />
                <InfoRow label="Slug" value={room.slug} />
                <InfoRow 
                  label="Створено" 
                  value={formatDate(room.created_at)} 
                />
                <InfoRow 
                  label="Автор" 
                  value={room.created_by || 'Система'} 
                />
              </div>
            </div>

            {/* Online Users */}
            <div className="glass-panel p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                Учасники онлайн
              </h3>
              
              {room.members_online > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: Math.min(room.members_online, 8) }).map((_, i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center text-sm font-medium text-cyan-400"
                    >
                      U{i + 1}
                    </div>
                  ))}
                  {room.members_online > 8 && (
                    <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center text-sm text-slate-400">
                      +{room.members_online - 8}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  Наразі ніхто не онлайн
                </p>
              )}
            </div>

            {/* Co-Memory Placeholder */}
            <div className="glass-panel p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                Co-Memory / Files
              </h3>
              
              <div className="text-center py-6">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800/50 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-slate-600" />
                </div>
                <p className="text-sm text-slate-400">
                  Спільна памʼять та файли будуть доступні скоро
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-white font-mono text-xs bg-slate-800/50 px-2 py-1 rounded">
        {value}
      </span>
    </div>
  )
}

