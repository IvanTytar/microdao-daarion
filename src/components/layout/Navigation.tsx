import { Link, useLocation } from 'react-router-dom';
import { Home, Settings, Zap, Network, Activity, Users, MessageSquare, Globe, Plus } from 'lucide-react';

export function Navigation() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Головна', icon: Home },
    { path: '/console', label: 'Console', icon: Settings },
    { path: '/nodes', label: 'НОДИ', icon: Network },
    { path: '/space', label: 'КОСМОС', icon: Zap },
    { path: '/network', label: 'МЕРЕЖА', icon: Globe },
    { path: '/connect-node', label: 'ПІДКЛЮЧИТИ', icon: Plus },
    { path: '/dagi-monitor', label: 'DAGI Monitor', icon: Activity },
    { path: '/microdao/daarion', label: 'DAARION', icon: Users },
    { path: '/microdao/greenfood', label: 'GREENFOOD', icon: Users },
    { path: '/microdao/energy-union', label: 'ENERGY UNION', icon: Users },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Network className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">MicroDAO</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path));
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right side - можна додати профіль, налаштування тощо */}
          <div className="flex items-center gap-2">
            {/* Placeholder для майбутніх елементів */}
          </div>
        </div>
      </div>
    </nav>
  );
}

