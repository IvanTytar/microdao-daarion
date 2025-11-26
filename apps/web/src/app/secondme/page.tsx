import { User, Brain, MessageSquare, Target, Sparkles, Activity, Clock } from 'lucide-react'
import { api, SecondMeProfile } from '@/lib/api'
import { formatRelativeTime } from '@/lib/utils'

// Force dynamic rendering - don't prerender at build time
export const dynamic = 'force-dynamic'

async function getProfile(): Promise<SecondMeProfile | null> {
  try {
    return await api.getSecondMeProfile()
  } catch (error) {
    console.error('Failed to fetch SecondMe profile:', error)
    return null
  }
}

export default async function SecondMePage() {
  const profile = await getProfile()

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20">
              <User className="w-8 h-8 text-violet-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Second Me</h1>
              <p className="text-slate-400">Ваш персональний цифровий двійник</p>
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <div className="glass-panel p-6 sm:p-8 mb-8 glow-accent">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 border-4 border-slate-900 flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold text-white mb-2">
                {profile?.user_id || 'Гість'}
              </h2>
              <p className="text-slate-400 mb-4">
                Агент: <span className="text-violet-400 font-mono">{profile?.agent_id || 'N/A'}</span>
              </p>
              
              <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
                <StatBadge
                  icon={MessageSquare}
                  label="Взаємодій"
                  value={profile?.total_interactions ?? 0}
                />
                <StatBadge
                  icon={Clock}
                  label="Остання"
                  value={profile?.last_interaction ? formatRelativeTime(profile.last_interaction) : 'Ніколи'}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Feature Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Memory Section */}
          <FeatureCard
            icon={Brain}
            title="Памʼять"
            description="Ваш цифровий двійник запамʼятовує ваші вподобання, стиль спілкування та контекст розмов"
            status="coming"
          />

          {/* Tasks Section */}
          <FeatureCard
            icon={Target}
            title="Задачі"
            description="Second Me допомагає відстежувати ваші задачі та нагадує про важливі справи"
            status="coming"
          />

          {/* Agents Section */}
          <FeatureCard
            icon={Sparkles}
            title="Агенти"
            description="Координація з іншими AI-агентами системи для виконання складних завдань"
            status="coming"
          />
        </div>

        {/* Chat with Second Me */}
        <div className="mt-8">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-violet-400" />
              Поговорити з Second Me
            </h3>

            <div className="bg-slate-800/30 rounded-xl p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-500/20 flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-violet-400" />
              </div>
              <h4 className="text-white font-medium mb-2">
                Чат скоро буде доступний
              </h4>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Функція спілкування з вашим цифровим двійником буде додана в наступному оновленні. 
                Second Me зможе відповідати на питання, допомагати з задачами та навчатися від вас.
              </p>
            </div>

            {/* Input placeholder */}
            <div className="mt-4 flex gap-3">
              <input
                type="text"
                placeholder="Напишіть повідомлення Second Me..."
                disabled
                className="flex-1 px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                disabled
                className="px-6 py-3 bg-violet-500/20 text-violet-400 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Надіслати
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBadge({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-xl">
      <Icon className="w-4 h-4 text-violet-400" />
      <span className="text-sm text-slate-400">{label}:</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  status,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  status: 'active' | 'coming'
}) {
  return (
    <div className="glass-panel p-6 relative overflow-hidden">
      {status === 'coming' && (
        <div className="absolute top-3 right-3">
          <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full">
            Скоро
          </span>
        </div>
      )}
      
      <div className="mb-4 inline-flex p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20">
        <Icon className="w-6 h-6 text-violet-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </div>
  )
}

