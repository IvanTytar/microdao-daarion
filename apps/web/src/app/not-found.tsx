'use client'

import Link from 'next/link'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-gradient mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Сторінку не знайдено
        </h2>
        <p className="text-slate-400 mb-8 max-w-md mx-auto">
          Вибачте, але сторінка, яку ви шукаєте, не існує або була переміщена.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-medium hover:from-cyan-400 hover:to-blue-500 transition-all"
          >
            <Home className="w-5 h-5" />
            На головну
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 glass-panel hover:bg-white/10 transition-all font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Назад
          </button>
        </div>
      </div>
    </div>
  )
}

