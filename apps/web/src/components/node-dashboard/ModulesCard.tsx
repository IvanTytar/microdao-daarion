'use client';

import { ModuleStatus } from '@/lib/node-dashboard';
import { StatusBadge } from './StatusBadge';

interface ModulesCardProps {
  modules: ModuleStatus[];
}

export function ModulesCard({ modules }: ModulesCardProps) {
  // Group modules by category
  const grouped = modules.reduce((acc, module) => {
    const category = module.id.split('.')[0];
    if (!acc[category]) acc[category] = [];
    acc[category].push(module);
    return acc;
  }, {} as Record<string, ModuleStatus[]>);
  
  const categoryLabels: Record<string, string> = {
    core: '🔧 Core',
    infra: '🏗️ Infrastructure',
    ai: '🤖 AI',
    daarion: '🏛️ DAARION',
    matrix: '💬 Matrix',
    dagi: '⚡ DAGI',
    monitoring: '📈 Monitoring',
    integration: '🔌 Integrations'
  };
  
  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>📦</span> Modules ({modules.length})
      </h3>
      
      <div className="space-y-4">
        {Object.entries(grouped).map(([category, mods]) => (
          <div key={category}>
            <p className="text-white/50 text-xs uppercase tracking-wider mb-2">
              {categoryLabels[category] || category}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {mods.map(module => (
                <div 
                  key={module.id}
                  className="flex items-center justify-between p-2 bg-white/5 rounded-lg"
                >
                  <span className="text-white/70 text-sm truncate">
                    {module.id.split('.')[1]}
                  </span>
                  <StatusBadge status={module.status} size="sm" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

