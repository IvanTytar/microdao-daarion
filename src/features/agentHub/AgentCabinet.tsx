import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAgentDashboard } from './hooks/useAgentDashboard';
import { VisibilityCard } from './components/VisibilityCard';
import { AgentChatWidget } from './components/AgentChatWidget';
import { MicroDaoWizard } from './components/MicroDaoWizard';

export function AgentCabinet() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { dashboard, loading, error, refetch } = useAgentDashboard(agentId!);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <div className="text-gray-600">Loading Agent Cabinet...</div>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-red-900 mb-2">Agent Not Found</h2>
          <button
            onClick={() => navigate('/agent-hub')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ← Back to Agent Hub
          </button>
        </div>
      </div>
    );
  }

  const { profile, node, primary_city_room, system_prompts, public_profile, microdao_memberships } = dashboard;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/agent-hub')}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
          >
            ← Back to Agent Hub
          </button>

          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover rounded-lg" />
              ) : (
                profile.display_name.charAt(0).toUpperCase()
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{profile.display_name}</h1>
                <span className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wide ${
                  profile.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {profile.status}
                </span>
                {profile.is_public && (
                  <span className="px-2 py-1 rounded text-xs font-medium uppercase tracking-wide bg-purple-100 text-purple-800">
                    Public Citizen
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <span>🤖</span>
                  <span className="font-medium">{profile.kind}</span>
                </div>
                {node && (
                  <div className="flex items-center gap-1">
                    <span>🖥️</span>
                    <span className="font-medium">{node.name}</span>
                    <span className="text-xs text-gray-400">({node.status})</span>
                  </div>
                )}
                {profile.primary_microdao_name && (
                  <div className="flex items-center gap-1">
                    <span>🏢</span>
                    <span className="font-medium">{profile.primary_microdao_name}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
               <button
                onClick={refetch}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Identity & System */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* DAIS / System Prompts Block */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🧠 System Prompts (DAIS)</h3>
              <div className="space-y-4">
                {['core', 'safety', 'governance', 'tools'].map((kind) => {
                  const prompt = system_prompts[kind as keyof typeof system_prompts];
                  return (
                    <div key={kind} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-700 uppercase text-xs tracking-wider">{kind} Prompt</span>
                        {prompt && (
                          <span className="text-xs text-gray-500">v{prompt.version} • {new Date(prompt.created_at).toLocaleDateString()}</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-800 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {prompt?.content || <span className="text-gray-400 italic">No prompt defined</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Agent Chat Block */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">💬 Agent Chat</h3>
              {primary_city_room ? (
                <AgentChatWidget roomId={primary_city_room.id} roomName={primary_city_room.name} />
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                  <div className="text-yellow-800 font-medium mb-2">No Primary Chat Room</div>
                  <p className="text-sm text-yellow-600 mb-4">
                    This agent is not assigned to a primary city room.
                  </p>
                  <button className="text-blue-600 hover:underline text-sm">
                    Configure Rooms in MicroDAO
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Visibility & Roles */}
          <div className="space-y-8">
            
            {/* Visibility Card */}
            <VisibilityCard 
              agentId={profile.agent_id} 
              publicProfile={public_profile} 
              onUpdate={refetch} 
            />

            {/* MicroDAO Memberships */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🏢 MicroDAO Memberships</h3>
              {microdao_memberships.length > 0 ? (
                <div className="space-y-3">
                  {microdao_memberships.map((m) => (
                    <div key={m.microdao_id} className="flex items-center justify-between p-3 border border-gray-100 rounded bg-gray-50 hover:bg-white transition-colors">
                      <div className="flex items-center gap-3">
                        {m.logo_url ? (
                          <img src={m.logo_url} alt={m.microdao_name} className="w-8 h-8 rounded-full object-cover bg-gray-200" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                            {m.microdao_name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{m.microdao_name || 'Unknown DAO'}</div>
                          <div className="text-xs text-gray-500">/{m.microdao_slug}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-medium px-2 py-1 rounded ${m.role === 'orchestrator' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                          {m.role || 'member'}
                        </div>
                        {m.is_core && <div className="text-[10px] text-gray-500 mt-1">Core Member</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-sm italic">Not a member of any MicroDAO</div>
              )}
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setIsWizardOpen(true)}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors text-sm font-medium"
                >
                  + Create MicroDAO (Orchestrator)
                </button>
              </div>
            </div>

            {/* Node Info */}
            {node && (
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🖥️ Runtime Node</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Node Name</span>
                    <span className="font-medium">{node.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">ID</span>
                    <span className="font-mono text-xs">{node.node_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Environment</span>
                    <span>{node.environment || 'N/A'}</span>
                  </div>
                  {node.guardian_agent && (
                    <div className="pt-2 mt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-500 block mb-1">Guardian Agent</span>
                      <span className="text-blue-600">{node.guardian_agent.name}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      <MicroDaoWizard 
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        agentId={profile.agent_id}
        onSuccess={refetch}
      />
    </div>
  );
}


