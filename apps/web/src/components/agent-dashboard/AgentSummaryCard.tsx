'use client';

import { AgentProfile, AgentRuntime, getAgentKindIcon, getAgentStatusColor } from '@/lib/agent-dashboard';
import { StatusBadge } from '@/components/node-dashboard';

interface AgentSummaryCardProps {
  profile: AgentProfile;
  runtime?: AgentRuntime;
}

export function AgentSummaryCard({ profile, runtime }: AgentSummaryCardProps) {
  const kindIcon = getAgentKindIcon(profile.kind);
  
  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative">
          {profile.dais.vis?.avatar_url ? (
            <img 
              src={profile.dais.vis.avatar_url} 
              alt={profile.display_name}
              className="w-20 h-20 rounded-xl object-cover"
            />
          ) : (
            <div 
              className="w-20 h-20 rounded-xl flex items-center justify-center text-4xl"
              style={{ backgroundColor: profile.dais.vis?.color_primary || '#22D3EE' + '30' }}
            >
              {kindIcon}
            </div>
          )}
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
            profile.status === 'online' ? 'bg-green-500' : 
            profile.status === 'training' ? 'bg-yellow-500' : 'bg-gray-500'
          }`} />
        </div>
        
        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-white">{profile.display_name}</h2>
            <StatusBadge status={profile.status} size="sm" />
          </div>
          
          <p className="text-white/50 text-sm mb-2">{profile.agent_id}</p>
          
          {profile.dais.core.bio && (
            <p className="text-white/70 text-sm mb-3">{profile.dais.core.bio}</p>
          )}
          
          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            <span 
              className="px-2 py-1 rounded-md text-sm font-medium"
              style={{ 
                backgroundColor: (profile.dais.vis?.color_primary || '#22D3EE') + '30',
                color: profile.dais.vis?.color_primary || '#22D3EE'
              }}
            >
              {kindIcon} {profile.kind}
            </span>
            {profile.roles.map(role => (
              <span 
                key={role}
                className="px-2 py-1 bg-white/10 text-white/70 rounded-md text-sm"
              >
                {role}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      {/* Runtime info */}
      {runtime && (
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              runtime.health === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'
            }`} />
            <span className="text-white/50 text-sm">
              {runtime.health === 'healthy' ? 'Healthy' : 'Degraded'}
            </span>
          </div>
          {profile.node_id && (
            <span className="text-white/30 text-sm">
              📍 {profile.node_id}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

