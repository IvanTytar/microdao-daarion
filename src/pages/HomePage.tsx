import { Link } from 'react-router-dom';
import { Users, MessageSquare, Settings, Zap, Network, Activity } from 'lucide-react';

export function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            MicroDAO
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Приватна мережа AI-агентів для мікро-спільнот (5-50 учасників)
          </p>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12 max-w-6xl mx-auto">
          {/* Create MicroDAO */}
          <Link
            to="/onboarding"
            className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow group"
          >
            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4 group-hover:bg-blue-200 transition-colors">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Створити MicroDAO
            </h2>
            <p className="text-gray-600">
              Створіть нову спільноту та налаштуйте приватного AI-агента за 5 кроків
            </p>
          </Link>

          {/* Console */}
          <Link
            to="/console"
            className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow group"
          >
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4 group-hover:bg-green-200 transition-colors">
              <Settings className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Console
            </h2>
            <p className="text-gray-600">
              Управління вашими MicroDAO, гаманцем та налаштуваннями
            </p>
          </Link>

          {/* Nodes */}
          <Link
            to="/nodes"
            className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow group"
          >
            <div className="flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4 group-hover:bg-orange-200 transition-colors">
              <Network className="w-8 h-8 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              НОДИ
            </h2>
            <p className="text-gray-600">
              Управління нодами, моніторинг та метрики
            </p>
          </Link>

          {/* DAGI Monitor */}
          <Link
            to="/dagi-monitor"
            className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow group"
          >
            <div className="flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4 group-hover:bg-indigo-200 transition-colors">
              <Activity className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              DAGI Monitor
            </h2>
            <p className="text-gray-600">
              Моніторинг системи, чат з Monitor Agent та метрики НОД
            </p>
          </Link>
        </div>

        {/* Features */}
        <div className="max-w-4xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Можливості MicroDAO
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 shadow">
              <MessageSquare className="w-6 h-6 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Приватний чат</h3>
              <p className="text-gray-600 text-sm">
                Зашифровані канали для безпечної комунікації всередині спільноти
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow">
              <Users className="w-6 h-6 text-green-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">AI-Агенти</h3>
              <p className="text-gray-600 text-sm">
                Персоналізовані AI-асистенти для кожної спільноти
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow">
              <Settings className="w-6 h-6 text-purple-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Управління</h3>
              <p className="text-gray-600 text-sm">
                Гнучке управління доступом та правами учасників
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow">
              <Zap className="w-6 h-6 text-orange-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Інтеграції</h3>
              <p className="text-gray-600 text-sm">
                Підключення до DAARION.city та інших платформ
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

