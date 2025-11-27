/**
 * MicrodaoConsolePage Component  
 * Phase 7: microDAO Console (MVP)
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getMicrodao, getMembers, getTreasury, type MicrodaoRead, type MicrodaoMember, type TreasuryItem } from '@/api/microdao';
import { getAgents, type AgentListItem } from '@/api/agents';

type TabType = 'overview' | 'members' | 'agents' | 'treasury';

export function MicrodaoConsolePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  const [microdao, setMicrodao] = useState<MicrodaoRead | null>(null);
  const [members, setMembers] = useState<MicrodaoMember[]>([]);
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [treasury, setTreasury] = useState<TreasuryItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      loadData();
    }
  }, [slug]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const daoData = await getMicrodao(slug!);
      setMicrodao(daoData);
      
      // Load additional data based on tab
      const [membersData, treasuryData] = await Promise.all([
        getMembers(slug!).catch(() => []),
        getTreasury(slug!).catch(() => []),
      ]);
      
      setMembers(membersData);
      setTreasury(treasuryData);
      
      // Load agents (if microDAO has external_id)
      if (daoData.external_id) {
        try {
          const agentsData = await getAgents(daoData.external_id);
          setAgents(agentsData);
        } catch (err) {
          console.error('Failed to load agents:', err);
        }
      }
    } catch (err) {
      console.error('Failed to load microDAO:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <div className="text-gray-600">Завантаження microDAO...</div>
        </div>
      </div>
    );
  }

  if (error || !microdao) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-red-900 mb-2">
            MicroDAO не знайдено
          </h2>
          <p className="text-red-600 mb-4">{error || 'MicroDAO не існує'}</p>
          <button
            onClick={() => navigate('/microdao')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ← Назад до списку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/microdao')}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
          >
            ← Назад до списку
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {microdao.name}
              </h1>
              {microdao.description && (
                <p className="text-gray-600 mt-1">{microdao.description}</p>
              )}
              <div className="mt-2 text-sm text-gray-500">
                <span className="font-mono">{microdao.slug}</span> · {microdao.external_id}
              </div>
            </div>
            <div>
              <Link
                to={`/dao/${microdao.slug}-governance`}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition flex items-center gap-2 shadow-md"
              >
                <span className="text-xl">🗳️</span>
                <span className="font-semibold">DAO Governance</span>
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200 mt-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Огляд
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'members'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              👥 Учасники ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('agents')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'agents'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🤖 Агенти ({agents.length})
            </button>
            <button
              onClick={() => setActiveTab('treasury')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'treasury'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              💰 Казна
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="text-3xl font-bold text-blue-900">{members.length}</div>
                <div className="text-sm text-gray-600">Учасників</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="text-3xl font-bold text-green-900">{agents.length}</div>
                <div className="text-sm text-gray-600">Агентів</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="text-3xl font-bold text-purple-900">{treasury.length}</div>
                <div className="text-sm text-gray-600">Токенів</div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Швидкі дії</h3>
              <div className="space-y-3">
                <Link
                  to={`/agent-hub?microdao=${microdao.external_id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  🤖 Відкрити Agent Hub
                </Link>
                <Link
                  to={`/messenger?microdao=${microdao.slug}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  💬 Відкрити Messenger
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Учасники microDAO</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {members.map((member) => (
                <div key={member.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{member.user_id}</div>
                    <div className="text-sm text-gray-500">
                      Роль: {member.role} · Приєднався: {new Date(member.joined_at).toLocaleDateString('uk-UA')}
                    </div>
                  </div>
                </div>
              ))}
              {members.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  Немає учасників
                </div>
              )}
            </div>
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Агенти microDAO</h3>
              <Link
                to="/agent-hub"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Відкрити Agent Hub
              </Link>
            </div>
            <div className="divide-y divide-gray-200">
              {agents.map((agent) => (
                <Link
                  key={agent.id}
                  to={`/agent/${agent.id}`}
                  className="p-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div>
                    <div className="font-medium">{agent.name}</div>
                    <div className="text-sm text-gray-500">
                      {agent.kind} · {agent.model}
                    </div>
                  </div>
                  <div className="text-blue-600">→</div>
                </Link>
              ))}
              {agents.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  Немає агентів
                </div>
              )}
            </div>
          </div>
        )}

        {/* Treasury Tab */}
        {activeTab === 'treasury' && (
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Казна microDAO</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {treasury.map((item) => (
                <div key={item.token_symbol} className="p-4 flex items-center justify-between">
                  <div className="font-medium">{item.token_symbol}</div>
                  <div className="text-xl font-bold">{item.balance.toLocaleString()}</div>
                </div>
              ))}
              {treasury.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  Казна пуста
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

