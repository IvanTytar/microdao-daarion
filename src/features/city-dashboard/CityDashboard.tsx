/**
 * CityDashboard - Головна панель DAARION.city
 *
 * Інтегрує CityMap, CityStats, MicroDAOGrid та інші компоненти
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCityStats } from './hooks/useCityStats';
import { CityMap } from './components/CityMap';
import { CityStats } from './components/CityStats';
import { MicroDAOGrid } from './components/MicroDAOGrid';
import { NodesOverview } from './components/NodesOverview';
import { AgentsGrid } from './components/AgentsGrid';
import { EventsFeed } from './components/EventsFeed';
import { useNodes } from './hooks/useNodes';
import { useAgents } from './hooks/useAgents';
import { useCityEvents } from './hooks/useCityEvents';
import { useMicroDAOs } from './hooks/useMicroDAOs';
import type { CityZone } from './types/city';

export function CityDashboard() {
  const navigate = useNavigate();
  const { stats, zones, loading: statsLoading, error: statsError } = useCityStats();
  const { items: nodes, loading: nodesLoading, error: nodesError } = useNodes();
  const { items: microDaos, loading: daoLoading, error: daoError } = useMicroDAOs();
  const {
    items: agents,
    loading: agentsLoading,
    error: agentsError,
    filters: agentFilters,
    setFilters: setAgentFilters,
  } = useAgents();
  const {
    events,
    loading: eventsLoading,
    error: eventsError,
    isConnected: eventsConnected,
    connect: connectEvents,
  } = useCityEvents();
  const [selectedZone, setSelectedZone] = useState<CityZone | null>(null);

  const handleZoneSelect = (zone: CityZone | null) => {
    setSelectedZone(zone);
  };

  const handleZoneClick = (zone: CityZone) => {
    console.log('Zone clicked:', zone);
    // TODO: Навігація до деталей зони
  };

  const handleDAOClick = (daoId: string) => {
    navigate(`/microdao/${daoId}`);
  };

  const handleCreateDAO = () => {
    navigate('/console'); // TODO: Створити окремий маршрут для створення DAO
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                🌟 DAARION.city
              </h1>
              <p className="text-xl text-gray-600">
                Місто AI-агентів та автономних спільнот
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Час у місті</div>
                <div className="text-lg font-semibold text-gray-900">
                  {new Date().toLocaleTimeString('uk-UA', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Europe/Kiev'
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* City Stats */}
        <div className="mb-8">
          <CityStats stats={stats} loading={statsLoading} />
        </div>

        {/* Error Display */}
        {statsError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <span className="text-xl">⚠️</span>
              <span className="font-medium">Помилка завантаження статистики: {statsError}</span>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* City Map - Left Side */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  🗺️ Карта міста
                </h2>
                <p className="text-gray-600">
                  Інтерактивна карта зон DAARION.city
                </p>
              </div>
              <div className="h-[600px]">
                <CityMap
                  zones={zones}
                  selectedZone={selectedZone}
                  onZoneSelect={handleZoneSelect}
                  onZoneClick={handleZoneClick}
                />
              </div>
            </div>
          </div>

          {/* Side Panel - Right Side */}
          <div className="space-y-6">
            {/* Zone Details */}
            {selectedZone && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {zones.find(z => z.id === selectedZone)?.name}
                </h3>
                <p className="text-gray-600 mb-4">
                  {zones.find(z => z.id === selectedZone)?.description}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Елементів:</span>
                    <span className="font-semibold">
                      {zones.find(z => z.id === selectedZone)?.count}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Статус:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      zones.find(z => z.id === selectedZone)?.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : zones.find(z => z.id === selectedZone)?.status === 'building'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {zones.find(z => z.id === selectedZone)?.status === 'active' ? 'Активна' :
                       zones.find(z => z.id === selectedZone)?.status === 'building' ? 'Будується' : 'Заплановано'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                ⚡ Швидкі дії
              </h3>
              <div className="space-y-3">
                <button
                  onClick={handleCreateDAO}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <span>🏛️</span>
                  Створити MicroDAO
                </button>
                <button
                  onClick={() => navigate('/nodes')}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <span>🖥️</span>
                  Переглянути ноди
                </button>
                <button
                  onClick={() => navigate('/agents')}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <span>🤖</span>
                  Керувати агентами
                </button>
              </div>
            </div>
            {/* Nodes Overview */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  🖥️ Обчислювальні ноди ({nodes.length})
                </h3>
                <button
                  onClick={() => navigate('/nodes')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Всі ноди →
                </button>
              </div>

              {nodesError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  Помилка завантаження нод: {nodesError}
                </div>
              )}

              <NodesOverview
                nodes={nodes}
                loading={nodesLoading}
                onNodeClick={(nodeId) => navigate(`/nodes/${nodeId}`)}
              />
            </div>
          </div>
        </div>

        {/* MicroDAO Section */}
        <div className="mt-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <MicroDAOGrid
              items={microDaos}
              loading={daoLoading}
              error={daoError}
              onDAOClick={handleDAOClick}
              onCreateClick={handleCreateDAO}
            />
          </div>
        </div>

        {/* Agents Section */}
        <div className="mt-8">
          <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-1">🤖 Агенти</h2>
                <p className="text-gray-600">
                  Огляд активних агентів і їх продуктивності
                </p>
              </div>
              <button
                onClick={() => navigate('/agents')}
                className="self-start px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Відкрити кабінет агентів →
              </button>
            </div>

            {agentsError && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                {agentsError}
              </div>
            )}

            <AgentsGrid
              agents={agents}
              loading={agentsLoading}
              filters={agentFilters}
              onFiltersChange={setAgentFilters}
              onAgentClick={(agentId) => navigate(`/agent/${agentId}`)}
            />
          </div>
        </div>

        {/* Events & Alerts Section */}
        <div className="mt-8">
          <EventsFeed
            events={events}
            loading={eventsLoading}
            error={eventsError}
            isConnected={eventsConnected}
            onReconnect={connectEvents}
          />
        </div>
      </div>
    </div>
  );
}

