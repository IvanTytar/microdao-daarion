/**
 * MicrodaoListPage Component
 * Phase 7: List of user's microDAOs
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMicrodaos } from './hooks/useMicrodaos';
import { createMicrodao, type MicrodaoCreate } from '@/api/microdao';
import { MicrodaoBrandBadge } from './components/MicrodaoBrandBadge';

export function MicrodaoListPage() {
  const navigate = useNavigate();
  const { microdaos, loading, error, refetch } = useMicrodaos();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setCreating(true);
      setCreateError(null);
      
      const data: MicrodaoCreate = {
        name: newName,
        slug: newSlug,
        description: newDescription || undefined,
      };
      
      const microdao = await createMicrodao(data);
      
      // Success
      setCreateDialogOpen(false);
      setNewName('');
      setNewSlug('');
      setNewDescription('');
      refetch();
      
      // Navigate to new microDAO
      navigate(`/microdao/${microdao.slug}`);
    } catch (err) {
      console.error('Failed to create microDAO:', err);
      setCreateError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🏛️ Мої microDAO
              </h1>
              <p className="text-gray-600 mt-1">
                Керуйте вашими спільнотами та організаціями
              </p>
            </div>
            
            <button
              onClick={() => setCreateDialogOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ➕ Створити microDAO
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <div className="text-gray-600">Завантаження...</div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-600 mb-2">❌ Помилка завантаження</div>
            <div className="text-sm text-red-500">{error.message}</div>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && microdaos.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">🏛️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Немає microDAO
            </h3>
            <p className="text-gray-600 mb-4">
              Створіть ваше перше microDAO
            </p>
            <button
              onClick={() => setCreateDialogOpen(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Створити microDAO
            </button>
          </div>
        )}

        {/* List */}
        {!loading && microdaos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {microdaos.map((dao) => (
              <div
                key={dao.id}
                onClick={() => navigate(`/microdao/${dao.slug}`)}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg hover:border-blue-500 transition-all cursor-pointer group relative"
              >
                {/* Banner Background */}
                {dao.banner_url && (
                  <div 
                    className="absolute inset-0 h-32 bg-cover bg-center opacity-10 group-hover:opacity-20 transition-opacity"
                    style={{ backgroundImage: `url(${dao.banner_url})` }}
                  />
                )}

                <div className="p-6 relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <MicrodaoBrandBadge name={dao.name} logoUrl={dao.logo_url} size="md" />
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          {dao.name}
                        </h3>
                        <p className="text-xs text-gray-500">@{dao.slug}</p>
                      </div>
                    </div>
                  </div>
                  
                  {dao.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {dao.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-auto">
                    <div className="flex items-center gap-1">
                      <span>👥</span> {dao.member_count || 0}
                    </div>
                    <div className="flex items-center gap-1">
                      <span>🤖</span> {dao.agent_count || 0}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      {createDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Створити microDAO
              </h2>
              <button
                onClick={() => setCreateDialogOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {createError && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Назва *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  placeholder="DAARION Core"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug (URL) *
                </label>
                <input
                  type="text"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  required
                  placeholder="daarion-core"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Опис
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  placeholder="Короткий опис microDAO..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={creating}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={creating || !newName || !newSlug}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {creating ? 'Створення...' : 'Створити'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

