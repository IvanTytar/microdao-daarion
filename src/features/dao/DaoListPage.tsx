/**
 * DAO List Page
 * Phase 8: DAO Dashboard
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyDaos, createDao, type DaoRead, type DaoCreate } from '../../api/dao';

export function DaoListPage() {
  const [daos, setDaos] = useState<DaoRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    loadDaos();
  }, []);

  async function loadDaos() {
    try {
      setLoading(true);
      const data = await getMyDaos();
      setDaos(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDao(data: DaoCreate) {
    try {
      await createDao(data);
      setShowCreateDialog(false);
      loadDaos();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Завантаження DAO...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Помилка: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🗳️ DAO Governance</h1>
          <p className="text-gray-600 mt-2">
            Керуйте децентралізованими організаціями через голосування
          </p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Створити DAO
        </button>
      </div>

      {/* DAO Cards */}
      {daos.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-5xl mb-4">🗳️</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            У вас поки немає DAO
          </h3>
          <p className="text-gray-500 mb-6">
            Створіть свою першу децентралізовану організацію
          </p>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Створити DAO
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {daos.map((dao) => (
            <Link
              key={dao.id}
              to={`/dao/${dao.slug}`}
              className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">{dao.name}</h3>
                <span className={`px-3 py-1 text-xs rounded-full ${
                  dao.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {dao.is_active ? 'Активний' : 'Неактивний'}
                </span>
              </div>

              {dao.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {dao.description}
                </p>
              )}

              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-500">
                  <span className="font-medium">{dao.governance_model}</span>
                  {' '}
                  • Quorum: {dao.quorum_percent}%
                </div>
                <div className="text-blue-600 font-medium">
                  Переглянути →
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      {showCreateDialog && (
        <CreateDaoDialog
          onClose={() => setShowCreateDialog(false)}
          onCreate={handleCreateDao}
        />
      )}
    </div>
  );
}

// ============================================================================
// Create DAO Dialog
// ============================================================================

interface CreateDaoDialogProps {
  onClose: () => void;
  onCreate: (data: DaoCreate) => Promise<void>;
}

function CreateDaoDialog({ onClose, onCreate }: CreateDaoDialogProps) {
  const [formData, setFormData] = useState<DaoCreate>({
    slug: '',
    name: '',
    description: '',
    microdao_id: 'temp-microdao-id', // TODO: Get from user's microDAO
    governance_model: 'simple',
    voting_period_seconds: 604800, // 7 days
    quorum_percent: 20,
  });

  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCreate(formData);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Створити DAO</h2>
          <p className="text-gray-600 mt-1">
            Налаштуйте децентралізовану організацію
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Назва DAO *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="DAARION Governance"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug (URL) *
            </label>
            <input
              type="text"
              required
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="daarion-governance"
            />
            <p className="text-xs text-gray-500 mt-1">
              URL: /dao/{formData.slug || 'slug'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Опис
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Опис вашого DAO"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Модель голосування
            </label>
            <select
              value={formData.governance_model}
              onChange={(e) => setFormData({ ...formData, governance_model: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="simple">Simple — Кожен голос має вагу 1</option>
              <option value="quadratic">Quadratic — √(токенів)</option>
              <option value="delegated">Delegated — З делегуванням</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quorum (%)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.quorum_percent}
                onChange={(e) => setFormData({ ...formData, quorum_percent: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Період голосування (днів)
              </label>
              <input
                type="number"
                min="1"
                value={(formData.voting_period_seconds || 604800) / 86400}
                onChange={(e) => setFormData({ ...formData, voting_period_seconds: parseInt(e.target.value) * 86400 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {submitting ? 'Створення...' : 'Створити DAO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

