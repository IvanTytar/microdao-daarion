import React from 'react';
import { Globe, Lock } from 'lucide-react';
import { updateTeam } from '../../api/teams';
import { ApiError } from '../../api/client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Team } from '../../types/api';

interface StepSelectModeProps {
  team: Team;
  selectedMode: 'public' | 'confidential';
  onUpdate: (mode: 'public' | 'confidential') => void;
  onNext: (team: Team) => void;
}

export function StepSelectMode({
  team,
  selectedMode,
  onUpdate,
  onNext,
}: StepSelectModeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (selectedMode === team.mode) {
      onNext(team);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const updatedTeam = await updateTeam(team.id, { mode: selectedMode });
      onNext(updatedTeam);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Не вдалося оновити режим спільноти.');
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
        Режим приватності
      </h2>
      <p className="text-slate-600 mb-6">
        Обери, як твоя спільнота буде доступна для інших.
      </p>

      <div className="space-y-4 mb-6">
        {/* Public Option */}
        <button
          type="button"
          onClick={() => onUpdate('public')}
          disabled={loading}
          className={`w-full p-6 border-2 rounded-xl text-left transition-all ${
            selectedMode === 'public'
              ? 'border-slate-900 bg-slate-50'
              : 'border-slate-200 hover:border-slate-300'
          } disabled:opacity-50`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 ${
                selectedMode === 'public'
                  ? 'border-slate-900 bg-slate-900'
                  : 'border-slate-300'
              }`}
            >
              {selectedMode === 'public' && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-5 h-5 text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-900">Public</h3>
              </div>
              <p className="text-sm text-slate-600">
                Є публічний канал, гості можуть читати і реєструватися як глядачі (viewer-type).
              </p>
            </div>
          </div>
        </button>

        {/* Confidential Option */}
        <button
          type="button"
          onClick={() => onUpdate('confidential')}
          disabled={loading}
          className={`w-full p-6 border-2 rounded-xl text-left transition-all ${
            selectedMode === 'confidential'
              ? 'border-slate-900 bg-slate-50'
              : 'border-slate-200 hover:border-slate-300'
          } disabled:opacity-50`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 ${
                selectedMode === 'confidential'
                  ? 'border-slate-900 bg-slate-900'
                  : 'border-slate-300'
              }`}
            >
              {selectedMode === 'confidential' && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-900">Confidential</h3>
              </div>
              <p className="text-sm text-slate-600">
                Тільки запрошені учасники, E2EE для чатів, без публічного індексування.
              </p>
            </div>
          </div>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Продовжити
        </button>
      </div>
    </div>
  );
}

