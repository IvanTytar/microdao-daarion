/**
 * AgentHubPage Component
 * Main page for Agent Hub — browse all agents
 */
import { useState } from 'react';
import { useAgents } from './hooks/useAgents';
import { AgentGallery } from './AgentGallery';
import { AgentCreateDialog } from './AgentCreateDialog';
import { useActor } from '@/store/authStore';

export function AgentHubPage() {
  const actor = useActor();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMicroDao, setSelectedMicroDao] = useState<string | undefined>(undefined);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const { agents, loading, error, refetch } = useAgents(selectedMicroDao);
  
  const handleCreateSuccess = () => {
    refetch();
  };

  // Filter agents by search query
  const filteredAgents = agents.filter((agent) => {
    const matchesSearch = 
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🤖 Agent Hub
              </h1>
              <p className="text-gray-600 mt-1">
                Керуйте агентами вашого MicroDAO
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setCreateDialogOpen(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                ➕ Створити агента
              </button>
              <button
                onClick={refetch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                🔄 Оновити
              </button>
            </div>
          </div>

          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Пошук агентів..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="
                  w-full px-4 py-2 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                "
              />
            </div>

            {/* MicroDAO filter */}
            <div className="sm:w-64">
              <select
                value={selectedMicroDao || ''}
                onChange={(e) => setSelectedMicroDao(e.target.value || undefined)}
                className="
                  w-full px-4 py-2 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                "
              >
                <option value="">Всі MicroDAO</option>
                <option value="microdao:daarion">DAARION</option>
                <option value="microdao:7">MicroDAO #7</option>
                <option value="microdao:greenfood">GreenFood</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-900">
                {filteredAgents.length}
              </div>
              <div className="text-sm text-blue-600">Знайдено агентів</div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-900">
                {filteredAgents.filter(a => a.status === 'active').length}
              </div>
              <div className="text-sm text-green-600">Активних</div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-900">
                {actor?.microdao_ids.length || 0}
              </div>
              <div className="text-sm text-purple-600">Ваших MicroDAO</div>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AgentGallery agents={filteredAgents} loading={loading} error={error} />
      </div>
      
      {/* Create Dialog */}
      <AgentCreateDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}

