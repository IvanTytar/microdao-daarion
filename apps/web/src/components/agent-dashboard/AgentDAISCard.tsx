'use client';

import { DAIS } from '@/lib/agent-dashboard';

interface AgentDAISCardProps {
  dais: DAIS;
}

export function AgentDAISCard({ dais }: AgentDAISCardProps) {
  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>🧬</span> DAIS Profile
      </h3>
      
      <div className="space-y-4">
        {/* CORE */}
        <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
          <p className="text-purple-400 text-xs uppercase tracking-wider mb-2">CORE — Identity</p>
          <p className="text-white font-medium">{dais.core.title || 'Untitled'}</p>
          {dais.core.bio && (
            <p className="text-white/50 text-sm mt-1">{dais.core.bio}</p>
          )}
          {dais.core.version && (
            <p className="text-white/30 text-xs mt-2">v{dais.core.version}</p>
          )}
        </div>
        
        {/* COG */}
        {dais.cog && (
          <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
            <p className="text-cyan-400 text-xs uppercase tracking-wider mb-2">COG — Brain</p>
            <div className="space-y-1">
              {dais.cog.base_model && (
                <p className="text-white text-sm">
                  <span className="text-white/50">Model:</span> {dais.cog.base_model}
                </p>
              )}
              {dais.cog.provider && (
                <p className="text-white text-sm">
                  <span className="text-white/50">Provider:</span> {dais.cog.provider}
                </p>
              )}
              {dais.cog.node_id && (
                <p className="text-white text-sm">
                  <span className="text-white/50">Node:</span> {dais.cog.node_id}
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* ACT */}
        {dais.act && (
          <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20">
            <p className="text-green-400 text-xs uppercase tracking-wider mb-2">ACT — Capabilities</p>
            {dais.act.tools && Array.isArray(dais.act.tools) && dais.act.tools.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {dais.act.tools.map((tool, idx) => (
                  <span 
                    key={idx}
                    className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-xs"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            )}
            {dais.act.matrix?.user_id && (
              <p className="text-white/50 text-sm mt-2">
                Matrix: {dais.act.matrix.user_id}
              </p>
            )}
          </div>
        )}
        
        {/* VIS */}
        {dais.vis && (
          <div className="p-3 bg-pink-500/10 rounded-xl border border-pink-500/20">
            <p className="text-pink-400 text-xs uppercase tracking-wider mb-2">VIS — Appearance</p>
            <div className="flex items-center gap-2">
              {dais.vis.color_primary && (
                <div 
                  className="w-6 h-6 rounded-full border border-white/20"
                  style={{ backgroundColor: dais.vis.color_primary }}
                />
              )}
              {dais.vis.avatar_style && (
                <span className="text-white/50 text-sm">{dais.vis.avatar_style}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

