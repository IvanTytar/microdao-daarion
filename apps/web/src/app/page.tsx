import Link from 'next/link'
import { ArrowRight, Building2, Bot, Users, Zap, Shield, Globe } from 'lucide-react'
import { StatusIndicator } from '@/components/StatusIndicator'

const features = [
  {
    icon: Building2,
    title: 'Віртуальне Місто',
    description: 'Кімнати для спілкування, колаборації та спільних проєктів',
  },
  {
    icon: Bot,
    title: 'AI Агенти',
    description: 'Персональні та командні агенти для автоматизації задач',
  },
  {
    icon: Users,
    title: 'MicroDAO',
    description: 'Децентралізоване управління для малих спільнот',
  },
  {
    icon: Shield,
    title: 'Приватність',
    description: 'Ваші дані залишаються під вашим контролем',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative px-4 pt-12 pb-20 sm:pt-20 sm:pb-32">
        <div className="max-w-6xl mx-auto">
          {/* Status badge */}
          <div className="flex justify-center mb-8">
            <StatusIndicator />
          </div>

          {/* Main heading */}
          <div className="text-center space-y-6 mb-12">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
              <span className="text-white">Ласкаво просимо до</span>
              <br />
              <span className="text-gradient">DAARION</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Децентралізована платформа для мікро-спільнот, 
              де AI-агенти допомагають будувати майбутнє разом
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                href="/city"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105"
              >
                <Building2 className="w-5 h-5" />
                Увійти в Місто
                <ArrowRight className="w-5 h-5" />
              </Link>
              
              <Link
                href="/secondme"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold glass-panel hover:bg-white/10 transition-all duration-300"
              >
                <Bot className="w-5 h-5" />
                Мій Second Me
              </Link>
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="glass-panel-hover p-6 group"
                >
                  <div className="mb-4 inline-flex p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 group-hover:from-cyan-500/30 group-hover:to-blue-600/30 transition-colors">
                    <Icon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="px-4 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="glass-panel p-8 sm:p-12 glow-accent">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-8 h-8 text-cyan-400" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Місто Дарів
              </h2>
            </div>
            
            <div className="space-y-4 text-slate-300 leading-relaxed">
              <p>
                <strong className="text-white">DAARION</strong> — це експериментальна платформа 
                для побудови децентралізованих мікро-спільнот нового покоління.
              </p>
              
              <ul className="space-y-3 mt-6">
                <li className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong className="text-white">AI-First:</strong> Кожен учасник має персонального 
                    цифрового двійника (Second Me), який навчається та допомагає
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong className="text-white">Малі спільноти:</strong> Оптимізовано для груп 
                    5–50 людей з глибокою колаборацією
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong className="text-white">Децентралізація:</strong> MicroDAO для прозорого 
                    управління та розподілу ресурсів
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
              <Link
                href="/city"
                className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
              >
                Дослідити кімнати міста
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>© 2024 DAARION. Місто Дарів.</p>
          <p>MVP v1.0 — Phase 1-3</p>
        </div>
      </footer>
    </div>
  )
}

