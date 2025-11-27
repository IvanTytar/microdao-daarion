/**
 * CityStats Component
 *
 * Статистика міста з метриками та трендами
 */

import React from 'react';
import type { CityStats } from '../types/city';

interface CityStatsProps {
  stats: CityStats | null;
  loading?: boolean;
}

export function CityStats({ stats, loading = false }: CityStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-4 shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8 text-gray-500">
        Не вдалося завантажити статистику міста
      </div>
    );
  }

  const metrics = [
    {
      label: 'MicroDAO',
      value: stats.microdaos.toString(),
      trend: stats.trends.microdaos,
      icon: '🏛️',
      color: 'blue',
    },
    {
      label: 'Агенти',
      value: stats.agents.toString(),
      trend: stats.trends.agents,
      icon: '🤖',
      color: 'purple',
    },
    {
      label: 'Ноди',
      value: stats.nodes.toString(),
      trend: null,
      icon: '🖥️',
      color: 'green',
    },
    {
      label: 'Активні користувачі',
      value: stats.activeUsers.toString(),
      trend: stats.trends.users,
      icon: '👥',
      color: 'orange',
    },
    {
      label: 'Транзакцій (24h)',
      value: stats.transactions24h.toLocaleString(),
      trend: stats.trends.transactions,
      icon: '💸',
      color: 'teal',
    },
    {
      label: 'Баланс DAAR',
      value: stats.daarBalance,
      trend: null,
      icon: '💎',
      color: 'pink',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      purple: 'bg-purple-50 border-purple-200 text-purple-700',
      green: 'bg-green-50 border-green-200 text-green-700',
      orange: 'bg-orange-50 border-orange-200 text-orange-700',
      teal: 'bg-teal-50 border-teal-200 text-teal-700',
      pink: 'bg-pink-50 border-pink-200 text-pink-700',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getTrendIcon = (trend: number | null) => {
    if (trend === null) return null;
    if (trend > 0) return <span className="text-green-500 ml-1">↗️</span>;
    if (trend < 0) return <span className="text-red-500 ml-1">↘️</span>;
    return <span className="text-gray-500 ml-1">→</span>;
  };

  const formatTrend = (trend: number | null) => {
    if (trend === null) return '';
    const sign = trend > 0 ? '+' : '';
    return `${sign}${trend}`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className={`rounded-lg border p-4 transition-all hover:shadow-md ${getColorClasses(metric.color)}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">{metric.icon}</span>
            {getTrendIcon(metric.trend)}
          </div>

          <div className="text-2xl font-bold mb-1">
            {metric.value}
          </div>

          <div className="text-sm font-medium mb-1">
            {metric.label}
          </div>

          {metric.trend !== null && (
            <div className={`text-xs ${
              metric.trend > 0 ? 'text-green-600' :
              metric.trend < 0 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {formatTrend(metric.trend)} від вчора
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

