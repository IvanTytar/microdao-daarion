import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createChannel } from '../../api/channels';
import { ApiError } from '../../api/client';
import type { Team, Channel } from '../../types/api';

interface StepCreateChannelProps {
  team: Team;
  channelName: string;
  channelType: 'public' | 'group';
  onUpdate: (updates: { channelName: string; channelType: 'public' | 'group' }) => void;
  onNext: (channel: Channel) => void;
}

export function StepCreateChannel({
  team,
  channelName,
  channelType,
  onUpdate,
  onNext,
}: StepCreateChannelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!channelName.trim()) {
      setError('Назва каналу обов\'язкова');
      return;
    }

    setLoading(true);
    try {
      const channel = await createChannel({
        team_id: team.id,
        name: channelName.trim().replace(/^#/, ''), // Remove # if user added it
        type: channelType,
      });
      onNext(channel);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Не вдалося створити канал. Спробуйте ще раз.');
      } else {
        setError('Сталася помилка. Спробуйте ще раз.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">
        Перший канал
      </h2>
      <p className="text-slate-600 mb-6">
        Створи свій перший канал для спілкування в спільноті.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="channelName" className="block text-sm font-medium text-slate-700 mb-2">
            Назва каналу <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">#</span>
            <input
              id="channelName"
              type="text"
              value={channelName}
              onChange={(e) => onUpdate({ channelName: e.target.value, channelType })}
              placeholder="general"
              className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              disabled={loading}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Тип каналу
          </label>
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="channelType"
                value="public"
                checked={channelType === 'public'}
                onChange={(e) => onUpdate({ channelName, channelType: e.target.value as 'public' | 'group' })}
                className="mt-1"
                disabled={loading}
              />
              <div>
                <div className="font-medium text-slate-900">Публічний канал спільноти</div>
                <div className="text-sm text-slate-600">Як landing / стрічка для всіх учасників</div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="channelType"
                value="group"
                checked={channelType === 'group'}
                onChange={(e) => onUpdate({ channelName, channelType: e.target.value as 'public' | 'group' })}
                className="mt-1"
                disabled={loading}
              />
              <div>
                <div className="font-medium text-slate-900">Приватна кімната команди</div>
                <div className="text-sm text-slate-600">Тільки для запрошених учасників</div>
              </div>
            </label>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading || !channelName.trim()}
            className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Створити канал
          </button>
        </div>
      </form>
    </div>
  );
}

