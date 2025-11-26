'use client'

import { WifiOff, RefreshCw, Sparkles } from 'lucide-react'

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-cyan-400" />
          </div>
        </div>

        {/* Offline Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
            <WifiOff className="w-8 h-8 text-amber-400" />
          </div>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-white mb-3">
          Ви офлайн
        </h1>
        <p className="text-slate-400 mb-8">
          Перевірте підключення до інтернету та спробуйте ще раз.
          Деякі раніше відвідані сторінки можуть бути доступні з кешу.
        </p>

        {/* Retry Button */}
        <button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20"
        >
          <RefreshCw className="w-5 h-5" />
          Спробувати знову
        </button>

        {/* Info */}
        <p className="mt-8 text-sm text-slate-500">
          DAARION.city працює краще з інтернет-з&apos;єднанням
        </p>
      </div>
    </div>
  )
}

