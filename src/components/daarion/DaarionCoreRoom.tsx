import { useState } from 'react';
import { Users, MessageSquare, Send, Loader2, Bot, Crown, Sparkles, RefreshCw, CheckCircle2, XCircle, AlertCircle, FolderPlus, Briefcase } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNode2Agents, type Node2Agent } from '../../api/node2Agents';
import { getWorkspaces, createWorkspace, type Workspace } from '../../api/workspaces';

interface ChatMessage {
  id: string;
  agent_id: string;
  agent_name: string;
  content: string;
  timestamp: string;
  role: 'user' | 'assistant';
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.microdao.xyz';

export function DaarionCoreRoom() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeChat, setActiveChat] = useState<'sofia' | 'solarius'>('sofia');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'core' | 'rnd'>('all');
  const queryClient = useQueryClient();

  // Отримуємо всіх агентів з НОДА2
  const { data: agentsData, isLoading: agentsLoading, refetch: refetchAgents } = useQuery({
    queryKey: ['node2-agents'],
    queryFn: getNode2Agents,
    refetchInterval: 30000, // Оновлюємо кожні 30 секунд
  });

  // Отримуємо робочі простори
  const { data: workspaces, isLoading: workspacesLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: getWorkspaces,
    staleTime: 60000,
  });

  // Мутація для створення workspace
  const createWorkspaceMutation = useMutation({
    mutationFn: createWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });

  const agents = agentsData?.items || [];
  
  // Фільтруємо агентів за категорією
  const filteredAgents = agents.filter((agent) => {
    if (selectedCategory === 'core') {
      return agent.workspace === 'core_founders_room' || agent.department === 'System' || agent.department === 'Leadership';
    }
    if (selectedCategory === 'rnd') {
      return agent.workspace === 'r_and_d_lab' || agent.department === 'R&D';
    }
    return true;
  });

  const sofiaAgent = agents.find(a => a.id === 'agent-sofia');
  const solariusAgent = agents.find(a => a.id === 'agent-solarius');

  // Перевіряємо чи існує workspace з Sofia та Solarius
  const daarionWorkspace = workspaces?.find(w => w.id === 'daarion_sofia_solarius');
  const hasWorkspace = !!daarionWorkspace;

  // Функція для створення workspace з Sofia та Solarius
  const handleCreateWorkspace = async () => {
    if (!sofiaAgent || !solariusAgent) {
      alert('Sofia або Solarius не знайдено');
      return;
    }

    try {
      await createWorkspaceMutation.mutateAsync({
        name: 'DAARION Sofia & Solarius',
        description: 'Робочий простір з Sofia та Solarius для DAARION мікроДАО',
        participant_ids: ['agent-sofia', 'agent-solarius'],
      });
    } catch (error) {
      console.error('Failed to create workspace:', error);
    }
  };

  const handleSendMessage = async (agentId: string, agentName: string) => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      agent_id: agentId,
      agent_name: agentName,
      content: input.trim(),
      timestamp: new Date().toISOString(),
      role: 'user',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/agent/${agentId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          message: userMessage.content,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        agent_id: agentId,
        agent_name: agentName,
        content: data.response || data.message || 'Немає відповіді',
        timestamp: new Date().toISOString(),
        role: 'assistant',
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error(`Error sending message to ${agentName}:`, error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        agent_id: agentId,
        agent_name: agentName,
        content: `❌ Помилка: ${error instanceof Error ? error.message : 'Невідома помилка'}`,
        timestamp: new Date().toISOString(),
        role: 'assistant',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'highest':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'high':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'medium':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const currentAgent = activeChat === 'sofia' ? sofiaAgent : solariusAgent;
  const currentMessages = messages.filter(
    (msg) => msg.agent_id === (activeChat === 'sofia' ? 'agent-sofia' : 'agent-solarius')
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Crown className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">DAARION Core</h2>
              <p className="text-purple-100 text-sm">
                Команда агентів DAARION з НОДА2 • Всього: {agents.length} агентів
              </p>
              {hasWorkspace && (
                <p className="text-purple-200 text-xs mt-1 flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  Робочий простір: {daarionWorkspace?.name} ({daarionWorkspace?.participants.length} учасників)
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!hasWorkspace && sofiaAgent && solariusAgent && (
              <button
                onClick={handleCreateWorkspace}
                disabled={createWorkspaceMutation.isPending}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <FolderPlus className="w-4 h-4" />
                {createWorkspaceMutation.isPending ? 'Створення...' : 'Створити workspace'}
              </button>
            )}
            <button
              onClick={() => refetchAgents()}
              disabled={agentsLoading}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${agentsLoading ? 'animate-spin' : ''}`} />
              Оновити
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Всі ({agents.length})
          </button>
          <button
            onClick={() => setSelectedCategory('core')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              selectedCategory === 'core'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Core ({agents.filter(a => a.workspace === 'core_founders_room' || a.department === 'System' || a.department === 'Leadership').length})
          </button>
          <button
            onClick={() => setSelectedCategory('rnd')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              selectedCategory === 'rnd'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            R&D Lab ({agents.filter(a => a.workspace === 'r_and_d_lab' || a.department === 'R&D').length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agents List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Команда агентів ({filteredAgents.length})
            </h3>
            {agentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-gray-900">{agent.name}</span>
                        {agent.priority === 'highest' && (
                          <Crown className="w-4 h-4 text-purple-600" />
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-1 rounded text-xs font-semibold border ${
                          agent.status === 'active' || agent.status === 'deployed'
                            ? 'bg-green-100 text-green-700 border-green-300'
                            : agent.status === 'not_deployed'
                            ? 'bg-red-100 text-red-700 border-red-300'
                            : 'bg-gray-100 text-gray-700 border-gray-300'
                        }`}>
                          {agent.status === 'deployed' ? 'Деплой' : 
                           agent.status === 'not_deployed' ? 'Не деплой' :
                           agent.status === 'active' ? 'Активний' : 'Неактивний'}
                        </span>
                        {agent.deployment_status && (
                          <div className="flex items-center gap-1">
                            {agent.deployment_status.health_check === 'healthy' ? (
                              <CheckCircle2 className="w-3 h-3 text-green-600" title="Healthy" />
                            ) : agent.deployment_status.health_check === 'unhealthy' ? (
                              <XCircle className="w-3 h-3 text-red-600" title="Unhealthy" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-yellow-600" title="Unknown" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{agent.role}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`px-2 py-1 rounded text-xs border ${getPriorityColor(agent.priority)}`}>
                        {agent.priority}
                      </span>
                      <span className="text-xs text-gray-500">{agent.model}</span>
                      {agent.backend && (
                        <span className="text-xs text-gray-400">({agent.backend})</span>
                      )}
                    </div>
                    {agent.workspace && (
                      <div className="mt-1">
                        <span className="text-xs text-gray-400">Workspace: {agent.workspace}</span>
                      </div>
                    )}
                  </div>
                ))}
                {filteredAgents.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Немає агентів у цій категорії</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow flex flex-col h-[700px]">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveChat('sofia')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                      activeChat === 'sofia'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    Sofia
                  </button>
                  <button
                    onClick={() => setActiveChat('solarius')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                      activeChat === 'solarius'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Crown className="w-4 h-4" />
                    Solarius
                  </button>
                </div>
              </div>
              {currentAgent && (
                <div className="text-sm text-gray-600">
                  <span className="font-semibold">{currentAgent.role}</span>
                  <span className="mx-2">•</span>
                  <span>{currentAgent.model}</span>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {currentMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Почніть розмову з {currentAgent?.name}</p>
                  </div>
                </div>
              ) : (
                currentMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-1">
                          <Bot className="w-4 h-4" />
                          <span className="text-xs font-semibold">{message.agent_name}</span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {new Date(message.timestamp).toLocaleTimeString('uk-UA', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (activeChat && currentAgent) {
                    handleSendMessage(currentAgent.id, currentAgent.name);
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Написати повідомлення ${currentAgent?.name}...`}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading || !activeChat}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading || !activeChat}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

