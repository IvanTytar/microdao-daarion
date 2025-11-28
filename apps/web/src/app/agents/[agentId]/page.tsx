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
  AgentMicrodaoMembershipCard
} from '@/components/agent-dashboard';
import { api, Agent, AgentInvokeResponse } from '@/lib/api';

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

export default function AgentPage() {
  const params = useParams();
  const agentId = params.agentId as string;
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat'>('dashboard');
  
  // Dashboard state
  const { dashboard, isLoading: dashboardLoading, error: dashboardError, refresh } = useAgentDashboard(agentId, {
    refreshInterval: 30000
  });
  
  // Chat state
  const [agent, setAgent] = useState<Agent | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [invoking, setInvoking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load agent for chat
  useEffect(() => {
    async function loadAgent() {
      try {
        setChatLoading(true);
        const data = await api.getAgent(agentId);
        setAgent(data);
      } catch (error) {
        console.error('Failed to load agent:', error);
      } finally {
        setChatLoading(false);
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
  
  // Loading state
  if (dashboardLoading && !dashboard && activeTab === 'dashboard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-white/70">Loading agent dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (dashboardError && activeTab === 'dashboard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
            <p className="text-red-400 text-lg mb-2">Failed to load agent dashboard</p>
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
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/agents"
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {dashboard?.profile.display_name || agent?.name || agentId}
              </h1>
              <p className="text-white/50 text-sm">Agent Cabinet</p>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'dashboard' 
                  ? 'bg-cyan-500/20 text-cyan-400' 
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'chat' 
                  ? 'bg-cyan-500/20 text-cyan-400' 
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              💬 Chat
            </button>
          </div>
        </div>
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && dashboard && (
          <div className="space-y-6">
            <AgentSummaryCard profile={dashboard.profile} runtime={dashboard.runtime} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AgentDAISCard dais={dashboard.profile.dais} />
              <div className="space-y-6">
                <AgentCityCard cityPresence={dashboard.profile.city_presence} />
                <AgentMetricsCard metrics={dashboard.metrics} />
              </div>
            </div>
            {/* System Prompts - Full Width */}
            <AgentSystemPromptsCard
              agentId={dashboard.profile.agent_id}
              systemPrompts={dashboard.system_prompts}
              canEdit={true}  // TODO: Check user role
              onUpdated={refresh}
            />
            
            {/* Public Profile Settings */}
            <AgentPublicProfileCard
              agentId={dashboard.profile.agent_id}
              publicProfile={dashboard.public_profile}
              canEdit={true}  // TODO: Check user role
              onUpdated={refresh}
            />

            <AgentMicrodaoMembershipCard
              agentId={dashboard.profile.agent_id}
              memberships={dashboard.microdao_memberships ?? []}
              canEdit={true}
              onUpdated={refresh}
            />
          </div>
        )}
        
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
            {/* Messages */}
            <div className="h-[500px] overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-white/50 py-8">
                  <p className="text-4xl mb-2">💬</p>
                  <p>Start a conversation with {dashboard?.profile.display_name || agent?.name || agentId}</p>
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
                      <div className="animate-spin w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full" />
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
        )}
      </div>
    </div>
  );
}

