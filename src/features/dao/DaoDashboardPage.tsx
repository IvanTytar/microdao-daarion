/**
 * DAO Dashboard Page with Tabs
 * Phase 8: DAO Dashboard
 */
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  getDao, getDaoProposals, castVote,
  type DaoOverview, type ProposalRead, type ProposalWithVotes,
  getProposal, createProposal, type ProposalCreate
} from '../../api/dao';

type TabKey = 'overview' | 'proposals' | 'treasury' | 'members' | 'activity';

export function DaoDashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [dao, setDao] = useState<DaoOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    loadDao();
  }, [slug]);

  async function loadDao() {
    if (!slug) return;
    try {
      setLoading(true);
      const data = await getDao(slug);
      setDao(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Завантаження DAO...</div>
      </div>
    );
  }

  if (error || !dao) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Помилка: {error || 'DAO не знайдено'}
        </div>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'overview', label: 'Огляд', icon: '📊' },
    { key: 'proposals', label: 'Пропозиції', icon: '📝' },
    { key: 'treasury', label: 'Казна', icon: '💰' },
    { key: 'members', label: 'Члени', icon: '👥' },
    { key: 'activity', label: 'Активність', icon: '📈' },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{dao.dao.name}</h1>
        <p className="text-gray-600 mt-1">{dao.dao.description}</p>
        <div className="flex gap-4 mt-3 text-sm text-gray-600">
          <span>📋 {dao.total_proposals_count} пропозицій</span>
          <span>👥 {dao.members_count} членів</span>
          <span>🗳️ {dao.dao.governance_model}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 px-2 border-b-2 transition ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {activeTab === 'overview' && <OverviewTab dao={dao} />}
        {activeTab === 'proposals' && <ProposalsTab daoSlug={slug!} />}
        {activeTab === 'treasury' && <TreasuryTab dao={dao} />}
        {activeTab === 'members' && <MembersTab dao={dao} />}
        {activeTab === 'activity' && <ActivityTab />}
      </div>
    </div>
  );
}

// ============================================================================
// Overview Tab
// ============================================================================

function OverviewTab({ dao }: { dao: DaoOverview }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-900">{dao.members_count}</div>
          <div className="text-blue-700 text-sm">Всього членів</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-900">{dao.active_proposals_count}</div>
          <div className="text-green-700 text-sm">Активних пропозицій</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-900">{dao.treasury_items.length}</div>
          <div className="text-purple-700 text-sm">Токенів в казні</div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Налаштування Governance</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Модель голосування</div>
            <div className="font-medium">{dao.dao.governance_model}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Quorum</div>
            <div className="font-medium">{dao.dao.quorum_percent}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Період голосування</div>
            <div className="font-medium">{dao.dao.voting_period_seconds / 86400} днів</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Proposals Tab
// ============================================================================

function ProposalsTab({ daoSlug }: { daoSlug: string }) {
  const [proposals, setProposals] = useState<ProposalRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<ProposalWithVotes | null>(null);

  useEffect(() => {
    loadProposals();
  }, [daoSlug]);

  async function loadProposals() {
    try {
      setLoading(true);
      const data = await getDaoProposals(daoSlug);
      setProposals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProposal(data: ProposalCreate) {
    try {
      await createProposal(daoSlug, data);
      setShowCreate(false);
      loadProposals();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleVote(proposalSlug: string, voteValue: 'yes' | 'no' | 'abstain') {
    try {
      await castVote(daoSlug, proposalSlug, voteValue);
      alert('Голос прийнято!');
      // Reload proposal details
      const updated = await getProposal(daoSlug, proposalSlug);
      setSelectedProposal(updated);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  if (loading) return <div className="text-center py-8">Завантаження...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Пропозиції</h3>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Нова пропозиція
        </button>
      </div>

      {proposals.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Поки немає пропозицій
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map((proposal) => (
            <button
              key={proposal.id}
              onClick={async () => {
                const details = await getProposal(daoSlug, proposal.slug);
                setSelectedProposal(details);
              }}
              className="w-full text-left border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{proposal.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{proposal.description}</p>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full ${
                  proposal.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : proposal.status === 'passed'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {proposal.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Proposal Detail Modal */}
      {selectedProposal && (
        <ProposalDetailDialog
          proposal={selectedProposal}
          onClose={() => setSelectedProposal(null)}
          onVote={handleVote}
        />
      )}

      {/* Create Proposal Dialog */}
      {showCreate && (
        <CreateProposalDialog
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateProposal}
        />
      )}
    </div>
  );
}

// ============================================================================
// Treasury Tab
// ============================================================================

function TreasuryTab({ dao }: { dao: DaoOverview }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Казна DAO</h3>
      {dao.treasury_items.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Казна порожня
        </div>
      ) : (
        <div className="space-y-3">
          {dao.treasury_items.map((item) => (
            <div key={item.token_symbol} className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
              <div>
                <div className="font-semibold text-gray-900">{item.token_symbol}</div>
                {item.contract_address && (
                  <div className="text-xs text-gray-500 font-mono">{item.contract_address}</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-gray-900">{parseFloat(item.balance).toFixed(2)}</div>
                <div className="text-sm text-gray-500">{item.token_symbol}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Members Tab
// ============================================================================

function MembersTab({ dao }: { dao: DaoOverview }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Члени DAO ({dao.members_count})</h3>
      <div className="text-gray-500">
        Список членів завантажується...
      </div>
    </div>
  );
}

// ============================================================================
// Activity Tab
// ============================================================================

function ActivityTab() {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Активність</h3>
      <div className="text-gray-500">
        Історія подій DAO...
      </div>
    </div>
  );
}

// ============================================================================
// Proposal Detail Dialog
// ============================================================================

interface ProposalDetailDialogProps {
  proposal: ProposalWithVotes;
  onClose: () => void;
  onVote: (proposalSlug: string, voteValue: 'yes' | 'no' | 'abstain') => void;
}

function ProposalDetailDialog({ proposal, onClose, onVote }: ProposalDetailDialogProps) {
  const totalVotes = proposal.votes_yes + proposal.votes_no + proposal.votes_abstain;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{proposal.title}</h2>
              <p className="text-gray-600 mt-2">{proposal.description}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Vote Stats */}
          <div>
            <h3 className="font-semibold mb-3">Результати голосування</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>✅ За</span>
                <span className="font-semibold">{proposal.votes_yes} ({totalVotes > 0 ? Math.round(proposal.votes_yes / totalVotes * 100) : 0}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>❌ Проти</span>
                <span className="font-semibold">{proposal.votes_no} ({totalVotes > 0 ? Math.round(proposal.votes_no / totalVotes * 100) : 0}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>⚪ Утримався</span>
                <span className="font-semibold">{proposal.votes_abstain}</span>
              </div>
            </div>
          </div>

          {/* Vote Buttons */}
          {proposal.status === 'active' && (
            <div>
              <h3 className="font-semibold mb-3">Ваш голос</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => onVote(proposal.slug, 'yes')}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  ✅ За
                </button>
                <button
                  onClick={() => onVote(proposal.slug, 'no')}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  ❌ Проти
                </button>
                <button
                  onClick={() => onVote(proposal.slug, 'abstain')}
                  className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                >
                  ⚪ Утриматись
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>Статус: <span className="font-semibold">{proposal.status}</span></div>
            <div>Quorum: <span className="font-semibold">{proposal.quorum_reached ? '✅ Досягнуто' : '❌ Не досягнуто'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Create Proposal Dialog
// ============================================================================

interface CreateProposalDialogProps {
  onClose: () => void;
  onCreate: (data: ProposalCreate) => Promise<void>;
}

function CreateProposalDialog({ onClose, onCreate }: CreateProposalDialogProps) {
  const [formData, setFormData] = useState<ProposalCreate>({
    slug: '',
    title: '',
    description: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onCreate(formData);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Нова пропозиція</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Назва *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
            <input
              type="text"
              required
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Опис</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              rows={4}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            >
              Скасувати
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Створити
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

