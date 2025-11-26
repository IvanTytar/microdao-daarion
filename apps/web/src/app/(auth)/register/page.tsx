'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, User, Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

export default function RegisterPage() {
  const router = useRouter()
  const { register, isAuthenticated } = useAuth()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push('/')
    return null
  }

  const passwordRequirements = [
    { met: password.length >= 8, text: 'Мінімум 8 символів' },
    { met: /[A-Z]/.test(password), text: 'Одна велика літера' },
    { met: /[a-z]/.test(password), text: 'Одна мала літера' },
    { met: /[0-9]/.test(password), text: 'Одна цифра' },
  ]

  const isPasswordValid = passwordRequirements.every(r => r.met)
  const doPasswordsMatch = password === confirmPassword && password.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isPasswordValid) {
      setError('Пароль не відповідає вимогам')
      return
    }

    if (!doPasswordsMatch) {
      setError('Паролі не співпадають')
      return
    }

    setLoading(true)

    try {
      await register(email, password, displayName || undefined)
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Sparkles className="w-10 h-10 text-cyan-400" />
            <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              DAARION
            </span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-white">Створити акаунт</h1>
          <p className="mt-2 text-slate-400">
            Приєднуйтесь до DAARION.city
          </p>
        </div>

        {/* Form */}
        <div className="glass-panel p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-slate-300 mb-2">
                Ім&apos;я (опційно)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ваше ім'я"
                  maxLength={100}
                  className={cn(
                    'w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl',
                    'text-white placeholder-slate-500',
                    'focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20',
                    'transition-all'
                  )}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className={cn(
                    'w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl',
                    'text-white placeholder-slate-500',
                    'focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20',
                    'transition-all'
                  )}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Пароль *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={cn(
                    'w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl',
                    'text-white placeholder-slate-500',
                    'focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20',
                    'transition-all'
                  )}
                />
              </div>
              
              {/* Password requirements */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  {passwordRequirements.map((req, i) => (
                    <div key={i} className={cn(
                      'flex items-center gap-2 text-xs',
                      req.met ? 'text-emerald-400' : 'text-slate-500'
                    )}>
                      <CheckCircle2 className={cn('w-3 h-3', !req.met && 'opacity-50')} />
                      {req.text}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                Підтвердіть пароль *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={cn(
                    'w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl',
                    'text-white placeholder-slate-500',
                    'focus:outline-none focus:ring-1 transition-all',
                    confirmPassword.length > 0 && (
                      doPasswordsMatch 
                        ? 'border-emerald-500/50 focus:border-emerald-500/50 focus:ring-emerald-500/20'
                        : 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
                    ),
                    confirmPassword.length === 0 && 'border-white/10 focus:border-cyan-500/50 focus:ring-cyan-500/20'
                  )}
                />
              </div>
              {confirmPassword.length > 0 && !doPasswordsMatch && (
                <p className="mt-1 text-xs text-red-400">Паролі не співпадають</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !isPasswordValid || !doPasswordsMatch}
              className={cn(
                'w-full py-3 rounded-xl font-medium transition-all',
                'bg-gradient-to-r from-cyan-500 to-blue-600 text-white',
                'hover:from-cyan-400 hover:to-blue-500',
                'shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 mx-auto animate-spin" />
              ) : (
                'Зареєструватися'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-sm text-slate-500">або</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Login link */}
          <p className="text-center text-slate-400">
            Вже маєте акаунт?{' '}
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">
              Увійти
            </Link>
          </p>
        </div>

        {/* Back to home */}
        <p className="mt-6 text-center">
          <Link href="/" className="text-slate-500 hover:text-slate-400 text-sm">
            ← Повернутися на головну
          </Link>
        </p>
      </div>
    </div>
  )
}

