/**
 * CityQuestPanel Component
 * 
 * Панель для відображення активних квестів
 */

import type { CityQuestSummary } from '../types/city';

interface CityQuestPanelProps {
  quests: CityQuestSummary[];
}

function QuestItem({ quest }: { quest: CityQuestSummary }) {
  return (
    <div className="p-3 rounded-lg bg-slate-800/40 border border-white/10">
      <div className="text-sm font-medium text-white mb-2">{quest.label}</div>
      <div className="w-full bg-slate-700 rounded-full h-1.5">
        <div
          className="bg-gradient-to-r from-cyan-500 to-purple-500 h-1.5 rounded-full transition-all"
          style={{ width: `${quest.progress * 100}%` }}
        />
      </div>
      <div className="text-xs text-gray-400 mt-1">{(quest.progress * 100).toFixed(0)}%</div>
    </div>
  );
}

export function CityQuestPanel({ quests }: CityQuestPanelProps) {
  const activeQuests = quests.slice(0, 3);

  return (
    <div className="h-full rounded-2xl border border-white/10 bg-slate-900/40 p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-white/90 mb-4">
        Today in DAARION
      </h3>

      {activeQuests.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32">
          <div className="text-3xl mb-2">🎯</div>
          <p className="text-sm text-gray-400 text-center">No active quests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeQuests.map((quest) => (
            <QuestItem key={quest.id} quest={quest} />
          ))}
        </div>
      )}
    </div>
  );
}




