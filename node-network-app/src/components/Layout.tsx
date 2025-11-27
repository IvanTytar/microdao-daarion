import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Network, Users, Layers, Plus, BarChart3, Settings } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/nodes', label: 'Ноди', icon: Network },
    { path: '/agents', label: 'Агенти', icon: Users },
    { path: '/stack', label: 'Stack', icon: Layers },
    { path: '/connect', label: 'Підключити', icon: Plus },
    { path: '/metrics', label: 'Метрики', icon: BarChart3 },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 flex items-center justify-center transition-transform group-hover:scale-110">
                <img 
                  src="/logo.svg" 
                  alt="DAGI Network Logo" 
                  className="w-12 h-12 drop-shadow-lg"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">
                  DAGI Network
                </h1>
                <p className="text-xs text-slate-400">Decentralized AI Node Network</p>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      isActive(item.path)
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800">
        <div className="flex items-center justify-around py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                  isActive(item.path)
                    ? 'text-purple-400'
                    : 'text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

