/**
 * MicroDAOGrid Component
 *
 * Сітка карточок MicroDAO з фільтрами
 */

import React from 'react';
import type { MicroDAOInfo } from '../types/city';

interface MicroDAOGridProps {
  items: MicroDAOInfo[];
  loading?: boolean;
  error?: string | null;
  onDAOClick: (daoId: string) => void;
  onCreateClick: () => void;
}

export function MicroDAOGrid({ items, loading = false, error, onDAOClick, onCreateClick }: MicroDAOGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-4 shadow animate-pulse">
            <div className="w-12 h-12 bg-gray-200 rounded-full mb-3"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          MicroDAO міста ({items.length})
        </h3>
        <button
          onClick={onCreateClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <span>+</span>
          Створити MicroDAO
        </button>
      </div>

      {error && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          {error}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((dao) => (
          <div
            key={dao.id}
            onClick={() => onDAOClick(dao.id)}
            className="bg-white rounded-lg p-4 shadow hover:shadow-lg transition-all cursor-pointer border border-gray-200 hover:border-blue-300"
          >
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {dao.logo ? (
                  <img src={dao.logo} alt={dao.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  dao.name.charAt(0).toUpperCase()
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 truncate">
                  {dao.name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    dao.type === 'public'
                      ? 'bg-green-100 text-green-800'
                      : dao.type === 'platform'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {dao.type === 'public' ? 'Публічна' :
                     dao.type === 'platform' ? 'Платформа' : 'Приватна'}
                  </span>

                  <span className={`w-2 h-2 rounded-full ${
                    dao.status === 'active' ? 'bg-green-500' :
                    dao.status === 'forming' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`} />
                </div>
              </div>
            </div>

            {/* Description */}
            {dao.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {dao.description}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <span>👥</span>
                <span>{dao.members} учасників</span>
              </div>
              <div className="flex items-center gap-1">
                <span>🤖</span>
                <span>{dao.agents} агентів</span>
              </div>
            </div>

            {/* Last Activity */}
            <div className="mt-3 text-xs text-gray-400">
              Остання активність: {new Date(dao.lastActivity).toLocaleDateString('uk-UA')}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {items.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏛️</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Ще немає MicroDAO
          </h3>
          <p className="text-gray-600 mb-6">
            Створіть першу автономну спільноту у місті
          </p>
          <button
            onClick={onCreateClick}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Створити MicroDAO
          </button>
        </div>
      )}
    </div>
  );
}

