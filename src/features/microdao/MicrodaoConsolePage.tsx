/**
 * MicrodaoConsolePage Component  
 * Phase 7: microDAO Console (MVP)
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getMicrodao, getMembers, getTreasury, uploadAsset, updateMicrodaoBranding, type MicrodaoRead, type MicrodaoMember, type TreasuryItem } from '@/api/microdao';
import { getAgents, type AgentListItem } from '@/api/agents';
import { MicrodaoHero } from './components/MicrodaoHero';
import { MicrodaoBrandBadge } from './components/MicrodaoBrandBadge';

type TabType = 'overview' | 'members' | 'agents' | 'treasury' | 'settings';

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

  const handleUpload = async (file: File | undefined, type: string) => {
    if (!file || !microdao) return;
    try {
      // Optimistic UI update could be done here, but better wait for server
      const { processed_url } = await uploadAsset(file, type);
      
      // Update branding
      const updated = await updateMicrodaoBranding(
        microdao.slug, 
        type === 'microdao_logo' ? processed_url : undefined,
        type === 'microdao_banner' ? processed_url : undefined
      );
      
      setMicrodao(prev => prev ? { ...prev, ...updated } : null);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed');
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
      {/* Hero Header */}
      <MicrodaoHero
        name={microdao.name}
        tagline={microdao.description}
        logoUrl={microdao.logo_url}
        bannerUrl={microdao.banner_url}
      >
        <button
          onClick={() => navigate('/microdao')}
          className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors text-sm"
        >
          ← Список
        </button>
        <Link
          to={`/dao/${microdao.slug}-governance`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md text-sm font-medium"
        >
          <span>🗳️</span>
          <span>Governance</span>
        </Link>
      </MicrodaoHero>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 -mb-px pt-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'overview'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 border-transparent'
              }`}
            >
              📊 Огляд
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'members'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 border-transparent'
              }`}
            >
              👥 Учасники ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('agents')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'agents'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 border-transparent'
              }`}
            >
              🤖 Агенти ({agents.length})
            </button>
            <button
              onClick={() => setActiveTab('treasury')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'treasury'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 border-transparent'
              }`}
            >
              💰 Казна
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'settings'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 border-transparent'
              }`}
            >
              ⚙️ Налаштування
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

        {/* Settings Tab */}
        {activeTab === 'settings' && microdao && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-6">Брендинг</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Логотип (256x256)</label>
                  <div className="flex items-center gap-6">
                    <MicrodaoBrandBadge name={microdao.name} logoUrl={microdao.logo_url} size="xl" />
                    <div className="flex-1">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleUpload(e.target.files?.[0], 'microdao_logo')}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                      />
                      <p className="text-xs text-gray-500 mt-2">PNG, JPG, SVG. Макс 5MB.</p>
                    </div>
                  </div>
                </div>

                {/* Banner Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Банер</label>
                  <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden mb-3 border border-gray-200 group">
                    {microdao.banner_url ? (
                      <img src={microdao.banner_url} className="w-full h-full object-cover" alt="Banner" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">Немає банера</div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handleUpload(e.target.files?.[0], 'microdao_banner')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

