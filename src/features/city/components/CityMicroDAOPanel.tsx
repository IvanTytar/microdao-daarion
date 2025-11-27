/**
 * CityMicroDAOPanel Component
 * 
 * Панель для відображення інформації про microDAO користувача
 */

import type { CityMicroDAO } from '../types/city';

interface CityMicroDAOPanelProps {
  microdao: CityMicroDAO | null;
}

export function CityMicroDAOPanel({ microdao }: CityMicroDAOPanelProps) {
  if (!microdao) {
    return (
      <div className="h-full rounded-2xl border border-white/10 bg-slate-900/40 p-6 flex flex-col items-center justify-center">
        <div className="text-4xl mb-3">🏛️</div>
        <h3 className="text-lg font-semibold text-white/90 mb-2">
          No MicroDAO
        </h3>
        <p className="text-sm text-gray-400 text-center mb-4">
          You're not part of any microDAO yet.
        </p>
        <button className="px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-sm font-medium transition-colors">
          Create or Join
        </button>
      </div>
    );
  }

  return (
    <div className="h-full rounded-2xl border border-white/10 bg-slate-900/40 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-white/90">
          Your microDAO
        </h3>
        <div className="px-2 py-1 rounded-lg bg-green-500/20 text-green-300 text-xs font-medium">
          Active
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-xl font-bold text-white mb-1">{microdao.name}</h4>
        <div className="text-sm text-gray-400">ID: {microdao.id}</div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="text-xs text-gray-400 mb-1">Members</div>
          <div className="text-lg font-semibold text-white">
            {microdao.members}
            <span className="text-xs text-gray-500 ml-1">
              ({microdao.humans}h + {microdao.agents}a)
            </span>
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-400 mb-1">Balance</div>
          <div className="text-lg font-semibold text-cyan-400">
            {microdao.balanceDcr.toLocaleString()} DCR
          </div>
        </div>

        <div className="col-span-2">
          <div className="text-xs text-gray-400 mb-1">Activity (24h)</div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full"
              style={{ width: `${Math.min(microdao.activity24h * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <button className="w-full px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors border border-white/10">
        Open microDAO Console
      </button>
    </div>
  );
}




