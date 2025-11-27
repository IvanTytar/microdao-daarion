/**
 * NavigationBreadcrumbs Component
 * 
 * Навігація між шарами: Space → City → DAO → Agent
 */

import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface NavigationLevel {
  label: string;
  path: string;
  icon?: string;
}

export function NavigationBreadcrumbs() {
  const location = useLocation();

  // Визначити поточний рівень навігації
  const levels: NavigationLevel[] = [];

  if (location.pathname.startsWith('/space')) {
    levels.push({ label: 'Space', path: '/space', icon: '🌌' });
  }

  if (location.pathname.startsWith('/city') || location.pathname.startsWith('/space')) {
    if (!location.pathname.startsWith('/space')) {
      levels.push({ label: 'City', path: '/city-v2', icon: '🏙️' });
    }
  }

  if (location.pathname.startsWith('/microdao/')) {
    const parts = location.pathname.split('/');
    const daoId = parts[2];
    levels.push(
      { label: 'City', path: '/city-v2', icon: '🏙️' },
      { label: daoId, path: `/microdao/${daoId}`, icon: '🏛️' }
    );
  }

  if (location.pathname.startsWith('/agent/')) {
    const parts = location.pathname.split('/');
    const agentId = parts[2];
    levels.push(
      { label: 'City', path: '/city-v2', icon: '🏙️' },
      { label: agentId, path: `/agent/${agentId}`, icon: '🤖' }
    );
  }

  if (levels.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 border-b border-white/10">
      {levels.map((level, index) => (
        <div key={level.path} className="flex items-center gap-2">
          {index > 0 && (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
          <Link
            to={level.path}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            {level.icon && <span className="text-lg">{level.icon}</span>}
            <span className="text-sm font-medium text-white">
              {level.label}
            </span>
          </Link>
        </div>
      ))}
    </div>
  );
}





