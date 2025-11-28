'use client';

import { NodeInfo, ModuleStatus } from '@/lib/node-dashboard';

interface NodeStandardComplianceCardProps {
  node: NodeInfo;
}

// DAOS Standard v1 — обов'язкові модулі для кожної ноди
const DAOS_REQUIRED_MODULES = [
  { id: 'core.node', name: 'Core Node', description: 'Node identity and status' },
  { id: 'core.health', name: 'Health Check', description: 'System health monitoring' },
];

// DAOS Standard v1 — рекомендовані модулі за роллю
const DAOS_ROLE_MODULES: Record<string, { id: string; name: string; description: string }[]> = {
  core: [
    { id: 'infra.postgres', name: 'PostgreSQL', description: 'Primary database' },
    { id: 'infra.redis', name: 'Redis', description: 'Cache and pub/sub' },
    { id: 'infra.nats', name: 'NATS', description: 'Message bus' },
  ],
  gateway: [
    { id: 'dagi.gateway', name: 'DAGI Gateway', description: 'API gateway' },
    { id: 'dagi.rbac', name: 'RBAC Service', description: 'Access control' },
  ],
  matrix: [
    { id: 'matrix.synapse', name: 'Synapse', description: 'Matrix homeserver' },
    { id: 'matrix.gateway', name: 'Matrix Gateway', description: 'Matrix API bridge' },
    { id: 'matrix.presence', name: 'Presence Aggregator', description: 'Real-time presence' },
  ],
  agents: [
    { id: 'daarion.agents', name: 'Agents Service', description: 'Agent management' },
    { id: 'daarion.city', name: 'City Service', description: 'City rooms and presence' },
  ],
  gpu: [
    { id: 'ai.ollama', name: 'Ollama', description: 'Local LLM runtime' },
    { id: 'ai.router', name: 'DAGI Router', description: 'AI request routing' },
  ],
  ai_runtime: [
    { id: 'ai.swapper', name: 'Swapper', description: 'Dynamic model loading' },
    { id: 'ai.stt', name: 'STT Service', description: 'Speech-to-text' },
    { id: 'ai.vision', name: 'Vision Service', description: 'Image/video analysis' },
  ],
  monitoring: [
    { id: 'monitoring.prometheus', name: 'Prometheus', description: 'Metrics collection' },
    { id: 'monitoring.grafana', name: 'Grafana', description: 'Dashboards' },
  ],
};

function getModuleStatus(modules: ModuleStatus[], moduleId: string): ModuleStatus | undefined {
  return modules.find(m => m.id === moduleId);
}

export function NodeStandardComplianceCard({ node }: NodeStandardComplianceCardProps) {
  const allModuleIds = node.modules.map(m => m.id);
  
  // Обчислюємо очікувані модулі на основі ролей
  const expectedModules: { id: string; name: string; description: string; required: boolean }[] = [
    ...DAOS_REQUIRED_MODULES.map(m => ({ ...m, required: true })),
  ];
  
  // Додаємо модулі за ролями
  (node.roles || []).forEach(role => {
    const roleModules = DAOS_ROLE_MODULES[role] || [];
    roleModules.forEach(m => {
      if (!expectedModules.find(e => e.id === m.id)) {
        expectedModules.push({ ...m, required: false });
      }
    });
  });
  
  // Обчислюємо статистику
  const present = expectedModules.filter(m => allModuleIds.includes(m.id));
  const missing = expectedModules.filter(m => !allModuleIds.includes(m.id));
  const extra = node.modules.filter(m => !expectedModules.find(e => e.id === m.id));
  
  const compliancePercent = expectedModules.length > 0 
    ? Math.round((present.length / expectedModules.length) * 100) 
    : 100;
  
  const getComplianceColor = (percent: number) => {
    if (percent >= 90) return 'text-green-400';
    if (percent >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  const getComplianceBg = (percent: number) => {
    if (percent >= 90) return 'bg-green-500';
    if (percent >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>📋</span> DAOS Standard Compliance
      </h3>
      
      {/* Compliance Score */}
      <div className="mb-6 p-4 bg-white/5 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/70">Compliance Score</span>
          <span className={`text-2xl font-bold ${getComplianceColor(compliancePercent)}`}>
            {compliancePercent}%
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getComplianceBg(compliancePercent)} transition-all duration-300`}
            style={{ width: `${compliancePercent}%` }}
          />
        </div>
        <p className="text-white/40 text-xs mt-2">
          {present.length} of {expectedModules.length} expected modules present
        </p>
      </div>
      
      {/* Missing Modules */}
      {missing.length > 0 && (
        <div className="mb-4">
          <p className="text-red-400 text-xs uppercase tracking-wider mb-2 flex items-center gap-1">
            <span>❌</span> Missing ({missing.length})
          </p>
          <div className="space-y-1">
            {missing.map(m => (
              <div 
                key={m.id}
                className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg"
              >
                <div>
                  <span className="text-white text-sm">{m.name}</span>
                  {m.required && (
                    <span className="ml-2 text-xs text-red-400">required</span>
                  )}
                </div>
                <span className="text-white/30 text-xs">{m.id}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Present Modules */}
      {present.length > 0 && (
        <div className="mb-4">
          <p className="text-green-400 text-xs uppercase tracking-wider mb-2 flex items-center gap-1">
            <span>✅</span> Present ({present.length})
          </p>
          <div className="grid grid-cols-2 gap-1">
            {present.map(m => {
              const status = getModuleStatus(node.modules, m.id);
              return (
                <div 
                  key={m.id}
                  className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg"
                >
                  <span className={`w-2 h-2 rounded-full ${
                    status?.status === 'up' ? 'bg-green-500' :
                    status?.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <span className="text-white text-sm truncate">{m.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Extra Modules */}
      {extra.length > 0 && (
        <div>
          <p className="text-blue-400 text-xs uppercase tracking-wider mb-2 flex items-center gap-1">
            <span>➕</span> Additional ({extra.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {extra.map(m => (
              <span 
                key={m.id}
                className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs"
              >
                {m.id}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Node Roles */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Node Roles</p>
        <div className="flex flex-wrap gap-2">
          {(node.roles || []).map(role => (
            <span 
              key={role}
              className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-md text-sm"
            >
              {role}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

