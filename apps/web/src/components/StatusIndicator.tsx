'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

export function StatusIndicator() {
  const [status, setStatus] = useState<'loading' | 'online' | 'offline'>('loading')

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const isHealthy = await api.checkHealth()
        setStatus(isHealthy ? 'online' : 'offline')
      } catch {
        setStatus('offline')
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 30000) // Check every 30s
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={cn(
      'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium',
      status === 'loading' && 'bg-slate-700/50 text-slate-300',
      status === 'online' && 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      status === 'offline' && 'bg-red-500/20 text-red-400 border border-red-500/30',
    )}>
      {status === 'loading' && (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Перевірка...</span>
        </>
      )}
      {status === 'online' && (
        <>
          <CheckCircle2 className="w-4 h-4" />
          <span>API Online</span>
        </>
      )}
      {status === 'offline' && (
        <>
          <XCircle className="w-4 h-4" />
          <span>API Offline</span>
        </>
      )}
    </div>
  )
}

