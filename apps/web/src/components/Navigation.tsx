'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, Home, Building2, User, Sparkles, Bot, Wallet, LogOut, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

const navItems = [
  { href: '/', label: 'Головна', icon: Home },
  { href: '/city', label: 'Місто', icon: Building2 },
  { href: '/agents', label: 'Агенти', icon: Bot },
  { href: '/governance', label: 'DAO', icon: Wallet },
  { href: '/secondme', label: 'Second Me', icon: User },
]

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    router.push('/')
    setIsOpen(false)
  }

  // Don't show navigation on auth pages
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    return null
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      {/* Glassmorphism navbar */}
      <div className="glass-panel mx-4 mt-4 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center gap-2 group"
          >
            <div className="relative">
              <Sparkles className="w-8 h-8 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
              <div className="absolute inset-0 blur-lg bg-cyan-400/30 group-hover:bg-cyan-300/40 transition-colors" />
            </div>
            <span className="text-xl font-bold text-gradient hidden sm:block">
              DAARION
            </span>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || 
                (item.href !== '/' && pathname.startsWith(item.href))
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200',
                    isActive 
                      ? 'bg-white/10 text-cyan-400' 
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Auth buttons (desktop) */}
          <div className="hidden md:flex items-center gap-3">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center">
                    <span className="text-sm font-medium text-cyan-400">
                      {user.display_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-slate-300 max-w-[120px] truncate">
                    {user.display_name || user.email}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                  title="Вийти"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Link 
                  href="/login"
                  className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
                >
                  Увійти
                </Link>
                <Link 
                  href="/register"
                  className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all duration-200 shadow-lg shadow-cyan-500/20"
                >
                  Приєднатися
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-slate-300 hover:text-white transition-colors"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile navigation */}
        {isOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-white/10">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || 
                  (item.href !== '/' && pathname.startsWith(item.href))
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                      isActive 
                        ? 'bg-white/10 text-cyan-400' 
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                )
              })}
              
              <div className="mt-4 pt-4 border-t border-white/10">
                {isAuthenticated && user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 px-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center">
                        <span className="font-medium text-cyan-400">
                          {user.display_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {user.display_name || 'User'}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 py-3 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Вийти
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Link 
                      href="/login"
                      onClick={() => setIsOpen(false)}
                      className="flex-1 py-3 text-sm text-center text-slate-300 hover:text-white transition-colors rounded-xl hover:bg-white/5"
                    >
                      Увійти
                    </Link>
                    <Link 
                      href="/register"
                      onClick={() => setIsOpen(false)}
                      className="flex-1 py-3 text-sm text-center font-medium bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl"
                    >
                      Приєднатися
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
