'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Home, Building2, User, Sparkles, Bot, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

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
            <button className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">
              Увійти
            </button>
            <button className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all duration-200 shadow-lg shadow-cyan-500/20">
              Приєднатися
            </button>
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
              
              <div className="flex gap-3 mt-4 pt-4 border-t border-white/10">
                <button className="flex-1 py-3 text-sm text-slate-300 hover:text-white transition-colors rounded-xl hover:bg-white/5">
                  Увійти
                </button>
                <button className="flex-1 py-3 text-sm font-medium bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl">
                  Приєднатися
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

