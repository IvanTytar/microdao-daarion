import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createTeam } from '../../api/teams';
import { ApiError } from '../../api/client';
import type { Team } from '../../types/api';

interface StepCreateTeamProps {
  teamName: string;
  teamDescription: string;
  onUpdate: (updates: { teamName: string; teamDescription: string }) => void;
  onNext: (team: Team) => void;
}

export function StepCreateTeam({
  teamName,
  teamDescription,
  onUpdate,
  onNext,
}: StepCreateTeamProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!teamName.trim()) {
      setError('Назва спільноти обов\'язкова');
      return;
    }

    setLoading(true);
    try {
      const team = await createTeam({
        name: teamName.trim(),
        description: teamDescription.trim() || undefined,
      });
      onNext(team);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Не вдалося створити спільноту. Спробуйте ще раз.');
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
        Створити спільноту
      </h2>
      <p className="text-slate-600 mb-6">
        Спільнота = твоя команда, клуб чи проект. Для кожної спільноти автоматично створюється micro-DAO з власним управлінням і агентами.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="teamName" className="block text-sm font-medium text-slate-700 mb-2">
            Назва спільноти <span className="text-red-500">*</span>
          </label>
          <input
            id="teamName"
            type="text"
            value={teamName}
            onChange={(e) => onUpdate({ teamName: e.target.value, teamDescription })}
            placeholder="Наприклад: Моя команда"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            disabled={loading}
            required
          />
        </div>

        <div>
          <label htmlFor="teamDescription" className="block text-sm font-medium text-slate-700 mb-2">
            Короткий опис <span className="text-slate-400 text-xs">(опційно)</span>
          </label>
          <textarea
            id="teamDescription"
            value={teamDescription}
            onChange={(e) => onUpdate({ teamName, teamDescription: e.target.value })}
            placeholder="Опиши свою спільноту..."
            rows={3}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading || !teamName.trim()}
            className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Продовжити
          </button>
        </div>
      </form>
    </div>
  );
}

