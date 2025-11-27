/**
 * Demo сторінка для демонстрації розширеного чату з оркестраторами
 */

import React, { useState } from 'react';
import { MessageCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MicroDaoOrchestratorChatEnhanced } from '../components/microdao/MicroDaoOrchestratorChatEnhanced';

const AGENTS = [
  { 
    id: 'helion', 
    name: 'Helion', 
    icon: '⚡', 
    description: 'AI-агент платформи Energy Union',
    color: 'from-yellow-400 to-orange-500'
  },
  { 
    id: 'greenfood', 
    name: 'GREENFOOD', 
    icon: '🌱', 
    description: 'AI-ERP для крафтових виробників',
    color: 'from-green-400 to-emerald-500'
  },
  { 
    id: 'yaromir', 
    name: 'Yaromir', 
    icon: '🧙', 
    description: 'Оркестратор CrewAI команди',
    color: 'from-purple-400 to-pink-500'
  },
  { 
    id: 'daarwizz', 
    name: 'DAARWIZZ', 
    icon: '✨', 
    description: 'Головний AI-агент DAARION.city',
    color: 'from-blue-400 to-cyan-500'
  },
];

export function ChatDemoPage() {
  const navigate = useNavigate();
  const [activeAgent, setActiveAgent] = useState('helion');
  const [layout, setLayout] = useState<'sidebar' | 'tabs' | 'modal'>('tabs');

  const activeAgentData = AGENTS.find(a => a.id === activeAgent) || AGENTS[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Розширений чат з оркестраторами
                  </h1>
                  <p className="text-sm text-gray-600">
                    Демонстрація мультимодальних можливостей
                  </p>
                </div>
              </div>
            </div>

            {/* Layout Selector */}
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setLayout('tabs')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  layout === 'tabs'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Tabs
              </button>
              <button
                onClick={() => setLayout('sidebar')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  layout === 'sidebar'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sidebar
              </button>
              <button
                onClick={() => setLayout('modal')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  layout === 'modal'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Modal
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Features Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 mb-8 text-white shadow-lg">
          <div className="flex items-start gap-4">
            <Sparkles className="h-8 w-8 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold mb-2">Розширені можливості чату</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎤</span>
                  <span>Голосовий ввід (Speech-to-Text)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🖼️</span>
                  <span>Завантаження зображень</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📎</span>
                  <span>Прикріплення файлів</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🌐</span>
                  <span>Веб-пошук</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📚</span>
                  <span>База знань (Vector + Graph DB)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚙️</span>
                  <span>Редагування системного промпту</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💬</span>
                  <span>Telegram інтеграція</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  <span>4 агенти-оркестратори</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Layout: Tabs */}
        {layout === 'tabs' && (
          <div>
            {/* Agent Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setActiveAgent(agent.id)}
                  className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                    activeAgent === agent.id
                      ? `bg-gradient-to-r ${agent.color} text-white shadow-lg scale-105`
                      : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
                  }`}
                >
                  <span className="mr-2 text-xl">{agent.icon}</span>
                  {agent.name}
                </button>
              ))}
            </div>

            {/* Agent Info */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border-l-4 border-purple-600">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{activeAgentData.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{activeAgentData.name}</h3>
                  <p className="text-sm text-gray-600">{activeAgentData.description}</p>
                </div>
              </div>
            </div>

            {/* Chat */}
            <MicroDaoOrchestratorChatEnhanced
              orchestratorAgentId={activeAgent}
            />
          </div>
        )}

        {/* Layout: Sidebar */}
        {layout === 'sidebar' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Agents List */}
            <div className="lg:col-span-1 space-y-2">
              {AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setActiveAgent(agent.id)}
                  className={`w-full p-4 rounded-lg text-left transition-all ${
                    activeAgent === agent.id
                      ? `bg-gradient-to-r ${agent.color} text-white shadow-lg`
                      : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{agent.icon}</span>
                    <span className="font-semibold">{agent.name}</span>
                  </div>
                  <p className={`text-xs ${activeAgent === agent.id ? 'text-white/90' : 'text-gray-600'}`}>
                    {agent.description}
                  </p>
                </button>
              ))}
            </div>

            {/* Chat */}
            <div className="lg:col-span-3">
              <MicroDaoOrchestratorChatEnhanced
                orchestratorAgentId={activeAgent}
              />
            </div>
          </div>
        )}

        {/* Layout: Modal */}
        {layout === 'modal' && (
          <div>
            {/* Agent Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setActiveAgent(agent.id)}
                  className={`p-6 rounded-xl transition-all ${
                    activeAgent === agent.id
                      ? `bg-gradient-to-r ${agent.color} text-white shadow-2xl scale-105`
                      : 'bg-white text-gray-700 hover:bg-gray-50 shadow-lg'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-5xl mb-3">{agent.icon}</div>
                    <h3 className="font-bold mb-1">{agent.name}</h3>
                    <p className={`text-xs ${activeAgent === agent.id ? 'text-white/90' : 'text-gray-600'}`}>
                      {agent.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Chat in Card */}
            <div className="max-w-5xl mx-auto">
              <MicroDaoOrchestratorChatEnhanced
                orchestratorAgentId={activeAgent}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-white mt-12">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>
              💡 <strong>Підказка:</strong> Спробуйте різні layout для кращого досвіду
            </p>
            <p>
              Створено для <strong>DAARION.city</strong> MicroDAO
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}





