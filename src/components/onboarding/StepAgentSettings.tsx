import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createAgent } from '../../api/agents';
import { ApiError } from '../../api/client';
import type { Team, Agent } from '../../types/api';

interface StepAgentSettingsProps {
  team: Team;
  agentEnabled: boolean;
  agentLanguage: 'uk' | 'en';
  agentFocus: 'general' | 'business' | 'it' | 'creative';
  useCoMemory: boolean;
  onUpdate: (updates: {
    agentEnabled: boolean;
    agentLanguage: 'uk' | 'en';
    agentFocus: 'general' | 'business' | 'it' | 'creative';
    useCoMemory: boolean;
  }) => void;
  onNext: (agent: Agent | null) => void;
}

export function StepAgentSettings({
  team,
  agentEnabled,
  agentLanguage,
  agentFocus,
  useCoMemory,
  onUpdate,
  onNext,
}: StepAgentSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    if (!agentEnabled) {
      onNext(null);
      return;
    }

    setLoading(true);
    try {
      const agent = await createAgent({
        team_id: team.id,
        name: 'Team Assistant',
        role: agentFocus,
        language: agentLanguage,
        focus: agentFocus,
        use_co_memory: useCoMemory,
      });
      onNext(agent);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Не вдалося створити агента. Спробуйте ще раз.');
      } else {
        setError('Сталася помилка. Спробуйте ще раз.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">
        Агенти та пам'ять
      </h2>
      <p className="text-slate-600 mb-6">
        Налаштуй свого приватного агента для цієї спільноти.
      </p>

      <div className="space-y-6">
        {/* Enable Agent */}
        <div className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg">
          <input
            type="checkbox"
            id="agentEnabled"
            checked={agentEnabled}
            onChange={(e) => onUpdate({
              agentEnabled: e.target.checked,
              agentLanguage,
              agentFocus,
              useCoMemory,
            })}
            className="mt-1"
            disabled={loading}
          />
          <label htmlFor="agentEnabled" className="flex-1 cursor-pointer">
            <div className="font-medium text-slate-900">Увімкнути мого приватного агента в цій спільноті</div>
          </label>
        </div>

        {agentEnabled && (
          <>
            {/* Language & Focus */}
            <div className="space-y-4">
              <div>
                <label htmlFor="agentLanguage" className="block text-sm font-medium text-slate-700 mb-2">
                  Мова
                </label>
                <select
                  id="agentLanguage"
                  value={agentLanguage}
                  onChange={(e) => onUpdate({
                    agentEnabled,
                    agentLanguage: e.target.value as 'uk' | 'en',
                    agentFocus,
                    useCoMemory,
                  })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="uk">Українська</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div>
                <label htmlFor="agentFocus" className="block text-sm font-medium text-slate-700 mb-2">
                  Фокус агента
                </label>
                <select
                  id="agentFocus"
                  value={agentFocus}
                  onChange={(e) => onUpdate({
                    agentEnabled,
                    agentLanguage,
                    agentFocus: e.target.value as 'general' | 'business' | 'it' | 'creative',
                    useCoMemory,
                  })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="general">Загальний</option>
                  <option value="business">Бізнес</option>
                  <option value="it">IT</option>
                  <option value="creative">Креатив</option>
                </select>
              </div>
            </div>

            {/* Co-Memory Toggle */}
            <div className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg">
              <input
                type="checkbox"
                id="useCoMemory"
                checked={useCoMemory}
                onChange={(e) => onUpdate({
                  agentEnabled,
                  agentLanguage,
                  agentFocus,
                  useCoMemory: e.target.checked,
                })}
                className="mt-1"
                disabled={loading}
              />
              <label htmlFor="useCoMemory" className="flex-1 cursor-pointer">
                <div className="font-medium text-slate-900">
                  Дозволити агенту використовувати Co-Memory цієї спільноти для відповідей
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  Co-Memory = файли, посилання, wiki, які команда додає
                </div>
              </label>
            </div>

            {/* Explanation */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">
                Агент допомагає в чатах, читає контекст та Co-Memory, пропонує підсумки та фоллоу-апи.
              </p>
              <p className="text-sm text-slate-600 mt-2">
                У майбутньому ти зможеш навчати агента й заробляти токени 1T.
              </p>
            </div>
          </>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
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
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}

