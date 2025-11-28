'use client';

import { useState } from 'react';
import { Eye, EyeOff, Users, Lock, Globe, Loader2 } from 'lucide-react';
import { VisibilityScope, AgentVisibilityPayload } from '@/lib/types/agents';

interface AgentVisibilityCardProps {
  agentId: string;
  visibilityScope: VisibilityScope;
  isListedInDirectory: boolean;
  onUpdate?: (payload: AgentVisibilityPayload) => Promise<void>;
  readOnly?: boolean;
}

const VISIBILITY_OPTIONS: { value: VisibilityScope; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'city',
    label: 'Публічний',
    description: 'Видимий всім у міських сервісах',
    icon: <Globe className="w-4 h-4" />,
  },
  {
    value: 'microdao',
    label: 'Тільки MicroDAO',
    description: 'Видимий лише членам MicroDAO',
    icon: <Users className="w-4 h-4" />,
  },
  {
    value: 'owner_only',
    label: 'Приватний',
    description: 'Видимий тільки власнику',
    icon: <Lock className="w-4 h-4" />,
  },
];

export function AgentVisibilityCard({
  agentId,
  visibilityScope,
  isListedInDirectory,
  onUpdate,
  readOnly = false,
}: AgentVisibilityCardProps) {
  const [scope, setScope] = useState<VisibilityScope>(visibilityScope);
  const [listed, setListed] = useState(isListedInDirectory);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScopeChange = async (newScope: VisibilityScope) => {
    if (readOnly || saving) return;
    
    setScope(newScope);
    setError(null);
    
    // If changing to non-city, auto-unlist from directory
    const newListed = newScope === 'city' ? listed : false;
    if (newScope !== 'city') {
      setListed(false);
    }
    
    if (onUpdate) {
      setSaving(true);
      try {
        await onUpdate({ visibility_scope: newScope, is_listed_in_directory: newListed });
      } catch (e) {
        setError('Не вдалося зберегти');
        setScope(visibilityScope);
        setListed(isListedInDirectory);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleListedChange = async (checked: boolean) => {
    if (readOnly || saving || scope !== 'city') return;
    
    setListed(checked);
    setError(null);
    
    if (onUpdate) {
      setSaving(true);
      try {
        await onUpdate({ visibility_scope: scope, is_listed_in_directory: checked });
      } catch (e) {
        setError('Не вдалося зберегти');
        setListed(isListedInDirectory);
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Eye className="w-5 h-5 text-blue-400" />
          Видимість
        </h3>
        {saving && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {VISIBILITY_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => handleScopeChange(option.value)}
            disabled={readOnly || saving}
            className={`w-full p-3 rounded-lg border transition-all text-left flex items-start gap-3 ${
              scope === option.value
                ? 'bg-blue-500/20 border-blue-500/50 text-white'
                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
            } ${readOnly || saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className={`mt-0.5 ${scope === option.value ? 'text-blue-400' : 'text-white/50'}`}>
              {option.icon}
            </div>
            <div>
              <div className="font-medium">{option.label}</div>
              <div className="text-xs text-white/50">{option.description}</div>
            </div>
            {scope === option.value && (
              <div className="ml-auto">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Citizens Directory toggle - only for city visibility */}
      {scope === 'city' && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={listed}
              onChange={(e) => handleListedChange(e.target.checked)}
              disabled={readOnly || saving}
              className="w-4 h-4 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-500/50"
            />
            <div>
              <div className="text-white font-medium flex items-center gap-2">
                {listed ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-white/50" />}
                Показувати в каталозі Громадян
              </div>
              <div className="text-xs text-white/50">
                {listed
                  ? 'Агент відображається на сторінці /citizens'
                  : 'Агент прихований з публічного каталогу'}
              </div>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}

