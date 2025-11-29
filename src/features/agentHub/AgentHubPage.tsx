/**
 * AgentHubPage Component
 * Main page for Agent Hub — browse all agents
 */
import { useState, useEffect } from 'react';
import { useAgentsV2 } from './hooks/useAgentsV2';
import { AgentGallery } from './AgentGallery';
import { AgentCreateDialog } from './AgentCreateDialog';
import { fetchCityNodes, fetchCityMicroDAOs } from '@/api/city';

export function AgentHubPage() {
  const [filters, setFilters] = useState({
    node_id: '',
    microdao_id: '',
    kind: '',
    is_public: undefined as boolean | undefined
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // Data for filters
  const [nodes, setNodes] = useState<{node_id: string, name: string}[]>([]);
  const [microdaos, setMicrodaos] = useState<{id: string, name: string}[]>([]);

  const { agents, loading, error, refetch } = useAgentsV2(filters);

  useEffect(() => {
    // Load filter options
    fetchCityNodes().then(res => setNodes(res.items.map(n => ({ node_id: n.node_id, name: n.name }))));
    fetchCityMicroDAOs().then(res => setMicrodaos(res.items.map(m => ({ id: m.id, name: m.name }))));
  }, []);
  
  const handleCreateSuccess = () => {
    refetch();
  };

  // Filter agents by search query (client-side search for now)
  const filteredAgents = agents.filter((agent) => {
    const q = searchQuery.toLowerCase();
    return (
      agent.display_name.toLowerCase().includes(q) ||
      agent.title?.toLowerCase().includes(q) ||
      agent.tagline?.toLowerCase().includes(q)
    );
  });

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🤖 Agent Console
              </h1>
              <p className="text-gray-600 mt-1">
                Manage and monitor all agents in the city
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setCreateDialogOpen(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <span>➕</span> Create Agent
              </button>
              <button
                onClick={refetch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <span>🔄</span> Refresh
              </button>
            </div>
          </div>

          {/* Search and filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-1">
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Node Filter */}
            <div>
              <select
                value={filters.node_id || ''}
                onChange={(e) => handleFilterChange('node_id', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Nodes</option>
                {nodes.map(node => (
                  <option key={node.node_id} value={node.node_id}>{node.name}</option>
                ))}
              </select>
            </div>

            {/* MicroDAO Filter */}
            <div>
              <select
                value={filters.microdao_id || ''}
                onChange={(e) => handleFilterChange('microdao_id', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All MicroDAOs</option>
                {microdaos.map(dao => (
                  <option key={dao.id} value={dao.id}>{dao.name}</option>
                ))}
              </select>
            </div>

            {/* Kind Filter */}
            <div>
              <select
                value={filters.kind || ''}
                onChange={(e) => handleFilterChange('kind', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Kinds</option>
                <option value="assistant">Assistant</option>
                <option value="node_guardian">Node Guardian</option>
                <option value="node_steward">Node Steward</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-900">
                {filteredAgents.length}
              </div>
              <div className="text-sm text-blue-600">Total Agents</div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-900">
                {filteredAgents.filter(a => a.status === 'online' || a.status === 'active').length}
              </div>
              <div className="text-sm text-green-600">Online / Active</div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-900">
                {filteredAgents.filter(a => a.is_public).length}
              </div>
              <div className="text-sm text-purple-600">Public Citizens</div>
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

