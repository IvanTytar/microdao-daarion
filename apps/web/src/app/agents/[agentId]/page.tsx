'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAgentDashboard } from '@/hooks/useAgentDashboard';
import {
  AgentSummaryCard,
  AgentDAISCard,
  AgentCityCard,
  AgentMetricsCard,
  AgentSystemPromptsCard,
  AgentPublicProfileCard,
  AgentMicrodaoMembershipCard,
  AgentVisibilityCard,
  CreateMicrodaoCard
} from '@/components/agent-dashboard';
import { api, Agent, AgentInvokeResponse } from '@/lib/api';
import { VisibilityScope, getNodeBadgeLabel } from '@/lib/types/agents';
import { updateAgentVisibility, AgentVisibilityUpdate } from '@/lib/api/agents';
import { ensureOrchestratorRoom } from '@/lib/api/microdao';
import { Bot, Settings, FileText, Building2, Cpu, MessageSquare, BarChart3, Users, Globe, Lock, Eye, EyeOff, ChevronLeft, Loader2, MessageCircle, PlusCircle } from 'lucide-react';
import { CityChatWidget } from '@/components/city/CityChatWidget';
import { Button } from '@/components/ui/button';

// Tab types
type TabId = 'dashboard' | 'prompts' | 'microdao' | 'identity' | 'models' | 'chat';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'prompts', label: 'System Prompts', icon: <FileText className="w-4 h-4" /> },
  { id: 'microdao', label: 'MicroDAO', icon: <Building2 className="w-4 h-4" /> },
  { id: 'identity', label: 'Identity', icon: <Bot className="w-4 h-4" /> },
  { id: 'models', label: 'Models', icon: <Cpu className="w-4 h-4" /> },
  { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" /> },
];

// Chat Message type
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  meta?: {
    tokens_in?: number;
    tokens_out?: number;
    latency_ms?: number;
  };
}

export default function AgentConsolePage() {
  const params = useParams();
  const agentId = params.agentId as string;
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  
  // Dashboard state
  const { dashboard, isLoading: dashboardLoading, error: dashboardError, refresh } = useAgentDashboard(agentId, {
    refreshInterval: 30000
  });
  
  // Chat state
  const [agent, setAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [invoking, setInvoking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  // Load agent for chat
  useEffect(() => {
    async function loadAgent() {
      try {
        const data = await api.getAgent(agentId);
        setAgent(data);
      } catch (error) {
        console.error('Failed to load agent:', error);
      }
    }
    if (activeTab === 'chat') {
      loadAgent();
    }
  }, [agentId, activeTab]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || invoking) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setInvoking(true);

    try {
      const response: AgentInvokeResponse = await api.invokeAgent(agentId, input.trim());
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.reply || 'No response',
        timestamp: new Date(),
        meta: {
          tokens_in: response.tokens_in,
          tokens_out: response.tokens_out,
          latency_ms: response.latency_ms
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setInvoking(false);
    }
  };

  const handleCreateTeamChat = async () => {
    if (!dashboard?.profile.primary_microdao_slug) return;
    
    setIsCreatingTeam(true);
    try {
      await ensureOrchestratorRoom(dashboard.profile.primary_microdao_slug);
      refresh(); // Reload to get new room info if possible (though dashboard might not include it immediately unless updated)
      // Ideally we should fetch the room specifically or wait for refresh
      alert("Командний чат створено! Перезавантажте сторінку, якщо він не з'явився.");
    } catch (e) {
      console.error("Failed to create team chat", e);
      alert("Failed to create team chat");
    } finally {
      setIsCreatingTeam(false);
    }
  };
  
  // Loading state
  if (dashboardLoading && !dashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
              <p className="text-white/70">Loading agent console...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (dashboardError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
            <p className="text-red-400 text-lg mb-2">Failed to load agent console</p>
            <p className="text-white/50 mb-4">{dashboardError.message}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={refresh}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
              >
                Retry
              </button>
              <Link
                href="/agents"
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Back to Agents
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const profile = dashboard?.profile;
  const nodeLabel = profile?.node_id ? getNodeBadgeLabel(profile.node_id) : 'Unknown';
  
  // Check for Orchestrator Team Chat capability
  const showOrchestratorChat = profile?.is_orchestrator && profile?.crew_info?.has_crew_team;
  // We need to know if the room actually exists. 
  // Currently dashboard doesn't return specific team room in profile, 
  // but we can infer it or fetch it.
  // For MVP, let's assume we show "Create" button if not found in a separate check, 
  // or just show the widget and let it handle "not found"? No, widget needs roomSlug.
  
  // Since we don't have the room slug in profile.crew_info (it might be null),
  // we rely on the user clicking "Create" if it's not there, or we try to construct the slug?
  // Backend: `get_or_create` logic creates slug like `{microdao_slug}-team`.
  // We can try to use that slug if `crew_team_key` is present.
  const teamRoomSlug = profile?.primary_microdao_slug ? `${profile.primary_microdao_slug}-team` : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/agents"
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </Link>
              
              {/* Agent Avatar & Name */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full rounded-xl object-cover" />
                  ) : (
                    <Bot className="w-6 h-6 text-cyan-400" />
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {profile?.display_name || agentId}
                  </h1>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-white/50">{profile?.kind || 'agent'}</span>
                    <span className="text-white/30">•</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      nodeLabel === 'НОДА1' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-violet-500/20 text-violet-400'
                    }`}>
                      {nodeLabel}
                    </span>
                    {profile?.is_orchestrator && (
                      <>
                        <span className="text-white/30">•</span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
                          Orchestrator
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Status & Actions */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  profile?.status === 'online' ? 'bg-emerald-500' : 'bg-white/30'
                }`} />
                <span className="text-sm text-white/50">
                  {profile?.status || 'offline'}
                </span>
              </div>
              
              {/* Public/Private Badge */}
              {profile?.is_public ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-sm">
                  <Globe className="w-4 h-4" />
                  Public Citizen
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white/50 text-sm">
                  <Lock className="w-4 h-4" />
                  Private
                </span>
              )}
              
              {/* Link to Citizen Profile if public */}
              {profile?.is_public && profile?.public_slug && (
                <Link
                  href={`/citizens/${profile.public_slug}`}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 text-sm rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Eye className="w-4 h-4" />
                  View Public Profile
                </Link>
              )}
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 mt-4 overflow-x-auto pb-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && dashboard && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-white/50 text-sm mb-1">MicroDAOs</div>
                <div className="text-2xl font-bold text-white">{dashboard.microdao_memberships?.length || 0}</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-white/50 text-sm mb-1">Visibility</div>
                <div className="text-lg font-medium text-white capitalize">
                  {dashboard.public_profile?.visibility_scope || 'city'}
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-white/50 text-sm mb-1">Kind</div>
                <div className="text-lg font-medium text-white capitalize">{profile?.kind}</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-white/50 text-sm mb-1">Status</div>
                <div className={`text-lg font-medium ${profile?.status === 'online' ? 'text-emerald-400' : 'text-white/50'}`}>
                  {profile?.status || 'offline'}
                </div>
              </div>
            </div>
            
            {/* Main Info Cards */}
            <AgentSummaryCard profile={dashboard.profile} runtime={dashboard.runtime} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AgentDAISCard dais={dashboard.profile.dais} />
              <div className="space-y-6">
                <AgentCityCard cityPresence={dashboard.profile.city_presence} />
                <AgentMetricsCard metrics={dashboard.metrics} />
              </div>
            </div>
          </div>
        )}
        
        {/* System Prompts Tab */}
        {activeTab === 'prompts' && dashboard && (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                System Prompts
              </h2>
              <p className="text-white/50 mb-6">
                Configure the agent&apos;s behavior through system prompts. These prompts define how the agent responds and operates.
              </p>
            </div>
            
            <AgentSystemPromptsCard
              agentId={dashboard.profile.agent_id}
              systemPrompts={dashboard.system_prompts}
              canEdit={true}
              onUpdated={refresh}
            />
          </div>
        )}
        
        {/* MicroDAO Tab */}
        {activeTab === 'microdao' && dashboard && (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-cyan-400" />
                MicroDAO Membership
              </h2>
              <p className="text-white/50 mb-4">
                Manage which MicroDAOs this agent belongs to. Every agent must belong to at least one MicroDAO.
              </p>
              
              {/* Primary MicroDAO */}
              {profile?.primary_microdao_id && (
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
                  <div className="text-sm text-cyan-400 mb-1">Primary MicroDAO</div>
                  <Link 
                    href={`/microdao/${profile.primary_microdao_slug}`}
                    className="text-lg font-medium text-white hover:text-cyan-400 transition-colors"
                  >
                    {profile.primary_microdao_name || profile.primary_microdao_slug}
                  </Link>
                </div>
              )}
            </div>
            
            {/* Create MicroDAO / Orchestrator Actions */}
            <CreateMicrodaoCard
              agentId={dashboard.profile.agent_id}
              agentName={profile?.display_name || agentId}
              isOrchestrator={profile?.is_orchestrator ?? false}
              onCreated={refresh}
            />
            
            <AgentMicrodaoMembershipCard
              agentId={dashboard.profile.agent_id}
              memberships={dashboard.microdao_memberships ?? []}
              canEdit={true}
              onUpdated={refresh}
            />
          </div>
        )}
        
        {/* Identity Tab */}
        {activeTab === 'identity' && dashboard && (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Bot className="w-5 h-5 text-cyan-400" />
                Agent Identity & Visibility
              </h2>
              <p className="text-white/50 mb-4">
                Configure how this agent appears to others and whether it&apos;s visible as a public citizen.
              </p>
            </div>
            
            {/* Visibility Settings */}
            <AgentVisibilityCard
              agentId={dashboard.profile.agent_id}
              isPublic={profile?.is_public ?? false}
              visibilityScope={(dashboard.public_profile?.visibility_scope as VisibilityScope) || 'global'}
              isListedInDirectory={dashboard.public_profile?.is_listed_in_directory ?? true}
              onUpdate={async (payload: AgentVisibilityUpdate) => {
                await updateAgentVisibility(dashboard.profile.agent_id, payload);
                refresh();
              }}
            />

            {/* Public Profile Settings */}
            <AgentPublicProfileCard
              agentId={dashboard.profile.agent_id}
              publicProfile={dashboard.public_profile}
              canEdit={true}
              onUpdated={refresh}
            />
          </div>
        )}
        
        {/* Models Tab */}
        {activeTab === 'models' && dashboard && (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                Model Configuration
              </h2>
              <p className="text-white/50 mb-6">
                Configure which AI models this agent uses for different tasks.
              </p>
              
              {/* Current Model */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-4">
                <div className="text-sm text-white/50 mb-1">Current Model</div>
                <div className="text-lg font-medium text-white">
                  {dashboard.profile.model || 'Default (via DAGI Router)'}
                </div>
              </div>
              
              {/* Model Bindings (placeholder) */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-400 mb-2">
                  <Settings className="w-4 h-4" />
                  <span className="font-medium">Model Bindings</span>
                </div>
                <p className="text-white/50 text-sm">
                  Advanced model configuration will be available in a future update. 
                  Currently, models are managed through the DAGI Router.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="space-y-6">
            
            {/* Orchestrator Team Chat */}
            {showOrchestratorChat && (
              <div className="bg-fuchsia-900/10 backdrop-blur-md rounded-2xl border border-fuchsia-500/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-fuchsia-200 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-fuchsia-400" />
                    Командний чат оркестратора
                  </h3>
                  <Link 
                    href={`/microdao/${profile.primary_microdao_slug}`}
                    className="text-xs text-fuchsia-400 hover:text-fuchsia-300 underline"
                  >
                    {profile.primary_microdao_name}
                  </Link>
                </div>
                
                {/* 
                  Here we assume that if has_crew_team is true, the room might exist or we can create it.
                  For simplicity in MVP, we use the known slug format or show button.
                  Actually, if the room is not created yet, CityChatWidget will error or show loading forever?
                  CityChatWidget handles 404 gracefully?
                  
                  Better approach: Try to load it. If 404, show Create button.
                  But CityChatWidget doesn't expose "notFound" state easily upwards.
                  
                  Alternative: Just show Create button if not sure, or try to auto-create.
                  Let's try to show the widget with the expected slug.
                */}
                {teamRoomSlug ? (
                  <div className="h-[400px]">
                     <CityChatWidget 
                       roomSlug={teamRoomSlug} 
                       hideTitle 
                       className="border-fuchsia-500/20 h-full"
                     />
                     {/* Fallback for creation if widget fails/empty? 
                         Ideally we should check if room exists via API first.
                         For now, let's add a manual "Ensure Room" button below just in case. 
                     */}
                     <div className="mt-2 flex justify-end">
                        <button 
                          onClick={handleCreateTeamChat}
                          className="text-[10px] text-fuchsia-500/50 hover:text-fuchsia-400"
                        >
                          (Re)Initialize Team Room
                        </button>
                     </div>
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-4">
                    <p className="text-fuchsia-200/70">Команда CrewAI активна, але чат ще не створено.</p>
                    <Button 
                      onClick={handleCreateTeamChat} 
                      disabled={isCreatingTeam}
                      className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white border border-fuchsia-400/50"
                    >
                      {isCreatingTeam ? "Створення..." : "Створити командний чат"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Direct Chat with Agent via DAGI Router */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-cyan-400" />
                  Прямий чат з агентом
                </h3>
                <p className="text-sm text-white/50">Спілкування через DAGI Router</p>
              </div>
              
              {/* Messages */}
              <div className="h-[400px] overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-white/50 py-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Start a conversation with {profile?.display_name || agentId}</p>
                  </div>
                )}
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-xl ${
                        msg.role === 'user'
                          ? 'bg-cyan-500/20 text-white'
                          : 'bg-white/10 text-white'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.meta && (
                        <div className="mt-2 text-xs text-white/30 flex gap-2">
                          {msg.meta.latency_ms && <span>{msg.meta.latency_ms}ms</span>}
                          {msg.meta.tokens_out && <span>{msg.meta.tokens_out} tokens</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {invoking && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 p-3 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
                        <span className="text-white/50">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Input */}
              <div className="border-t border-white/10 p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
                    disabled={invoking}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || invoking}
                    className="px-4 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-white/10 disabled:text-white/30 text-white rounded-xl transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
            
            {/* Matrix City Room Chat */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <MessageCircle className="w-5 h-5 text-purple-400" />
                Публічна кімната агента
              </h3>
              
              {dashboard?.primary_city_room ? (
                <div className="space-y-3">
                  <p className="text-sm text-white/60">
                    Matrix-чат у кімнаті: <span className="text-purple-400">{dashboard.primary_city_room.name}</span>
                  </p>
                  <CityChatWidget roomSlug={dashboard.primary_city_room.slug} />
                </div>
              ) : (
                <div className="text-center py-8 text-white/50">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Для цього агента ще не налаштована публічна кімната.</p>
                  <p className="text-sm mt-2">
                    Прив'яжіть агента до MicroDAO або створіть кімнату в City Service.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
