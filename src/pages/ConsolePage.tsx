import React, { useState } from 'react';
import { WalletInfo } from '../components/console/WalletInfo';
import { CreateMicroDaoForm } from '../components/console/CreateMicroDaoForm';
import { MicroDaoList } from '../components/console/MicroDaoList';
import { InviteMemberForm } from '../components/console/InviteMemberForm';
import type { Team } from '../types/api';

type View = 'list' | 'create' | 'invite';

export function ConsolePage() {
  const [currentView, setCurrentView] = useState<View>('list');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const handleCreateSuccess = (team: Team) => {
    setSelectedTeam(null);
    setCurrentView('list');
    // TODO: Refresh teams list
  };

  const handleInviteSuccess = () => {
    setSelectedTeam(null);
    setCurrentView('list');
  };

  const handleSelectTeam = (team: Team) => {
    setSelectedTeam(team);
    setCurrentView('invite');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Console</h1>
          <p className="text-gray-600 mt-2">Управління MicroDAO та DAARION.city</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Wallet Info */}
          <div className="lg:col-span-1 space-y-6">
            <WalletInfo />
          </div>

          {/* Right Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Navigation */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setCurrentView('list');
                    setSelectedTeam(null);
                  }}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    currentView === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Список MicroDAO
                </button>
                <button
                  onClick={() => {
                    setCurrentView('create');
                    setSelectedTeam(null);
                  }}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    currentView === 'create'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Створити MicroDAO
                </button>
                <button
                  onClick={() => {
                    window.location.href = '/nodes';
                  }}
                  className="px-4 py-2 rounded-md transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  🌐 Nodes
                </button>
              </div>
            </div>

            {/* Content */}
            {currentView === 'list' && (
              <MicroDaoList onSelectTeam={handleSelectTeam} />
            )}

            {currentView === 'create' && (
              <CreateMicroDaoForm
                onSuccess={handleCreateSuccess}
                onCancel={() => setCurrentView('list')}
              />
            )}

            {currentView === 'invite' && selectedTeam && (
              <InviteMemberForm
                team={selectedTeam}
                onSuccess={handleInviteSuccess}
                onCancel={() => {
                  setSelectedTeam(null);
                  setCurrentView('list');
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

