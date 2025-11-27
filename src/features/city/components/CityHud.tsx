/**
 * CityHud Component
 * 
 * Верхній HUD для City Dashboard
 */

import { useNavigate } from 'react-router-dom';
import type { CitySnapshot } from '../types/city';

interface CityHudProps {
  snapshot: CitySnapshot;
}

export function CityHud({ snapshot }: CityHudProps) {
  const navigate = useNavigate();
  const { user, microdao, metrics, nodes } = snapshot;

  const chips = [
    { label: 'City Uptime', value: '3d 11:22', color: 'text-green-400' },
    { 
      label: 'microDAO Health', 
      value: microdao ? '● good' : '● N/A', 
      color: microdao ? 'text-green-400' : 'text-gray-400' 
    },
    { 
      label: 'Nodes Online', 
      value: `${nodes.filter(n => n.status === 'healthy').length}/${nodes.length}`,
      color: 'text-cyan-400' 
    },
    { 
      label: 'Active Agents', 
      value: snapshot.agents.filter(a => a.status === 'online').length.toString(),
      color: 'text-purple-400' 
    },
    { 
      label: 'Activity Index', 
      value: metrics.activityIndex.toFixed(1),
      color: 'text-yellow-400' 
    },
  ];

  return (
    <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-white/10 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: User Info */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold">
            {user.handle.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{user.handle}</div>
            {microdao && (
              <div className="text-xs text-cyan-400">{microdao.name}</div>
            )}
          </div>
          <div className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-medium">
            {user.archetype}
          </div>
        </div>

        {/* Right: Metrics Chips + Navigation */}
        <div className="flex items-center gap-3">
          {chips.map((chip, idx) => (
            <div
              key={idx}
              className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur"
            >
              <span className="text-xs text-gray-400 mr-2">{chip.label}:</span>
              <span className={`text-xs font-semibold ${chip.color}`}>{chip.value}</span>
            </div>
          ))}
          <button
            onClick={() => navigate('/space')}
            className="px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold hover:bg-purple-500/30 transition-colors"
          >
            🌌 Go to Space
          </button>
        </div>
      </div>
    </div>
  );
}

