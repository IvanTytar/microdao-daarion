'use client';

import { AIServices } from '@/lib/node-dashboard';
import { StatusBadge } from './StatusBadge';

interface AIServicesCardProps {
  ai: AIServices;
}

export function AIServicesCard({ ai }: AIServicesCardProps) {
  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>🤖</span> AI Services
      </h3>
      
      <div className="space-y-4">
        {/* Router */}
        <div className="p-3 bg-white/5 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-medium">DAGI Router</span>
            <StatusBadge status={ai.router.status} size="sm" />
          </div>
          {ai.router.status !== 'not_installed' && (
            <div className="text-sm text-white/50 space-y-1">
              <p>Version: {ai.router.version}</p>
              <p>NATS: {ai.router.nats_connected ? '✅ Connected' : '❌ Disconnected'}</p>
              {ai.router.backends.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {ai.router.backends.map(b => (
                    <span 
                      key={b.name}
                      className={`px-1.5 py-0.5 rounded text-xs ${
                        b.status === 'up' ? 'bg-green-500/20 text-green-400' :
                        b.status === 'degraded' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {b.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Swapper */}
        <div className="p-3 bg-white/5 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-medium">Swapper</span>
            <StatusBadge status={ai.swapper.status} size="sm" />
          </div>
          {ai.swapper.status !== 'not_installed' && (
            <div className="text-sm text-white/50">
              {ai.swapper.active_model && (
                <p>Active: <span className="text-cyan-400">{ai.swapper.active_model}</span></p>
              )}
              <p>Models: {ai.swapper.models.length}</p>
            </div>
          )}
        </div>
        
        {/* Ollama */}
        <div className="p-3 bg-white/5 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-medium">Ollama</span>
            <StatusBadge status={ai.ollama.status} size="sm" />
          </div>
          {ai.ollama.status !== 'not_installed' && ai.ollama.models.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {ai.ollama.models.slice(0, 5).map(model => (
                <span 
                  key={model}
                  className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs"
                >
                  {model}
                </span>
              ))}
              {ai.ollama.models.length > 5 && (
                <span className="px-1.5 py-0.5 bg-white/10 text-white/50 rounded text-xs">
                  +{ai.ollama.models.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Other Services */}
        {Object.keys(ai.services).length > 0 && (
          <div className="pt-2 border-t border-white/10">
            <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Other Services</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ai.services).map(([name, svc]) => (
                <div key={name} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <span className="text-white/70 text-sm capitalize">{name}</span>
                  <StatusBadge status={svc.status} size="sm" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

