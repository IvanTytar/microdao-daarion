'use client';

import { useState } from 'react';
import { Eye, EyeOff, Users, Lock, Globe, Loader2 } from 'lucide-react';
import { VisibilityScope } from '@/lib/types/agents';
import { AgentVisibilityUpdate } from '@/lib/api/agents';

interface AgentVisibilityCardProps {
  agentId: string;
  isPublic: boolean;
  visibilityScope: VisibilityScope;
  isListedInDirectory: boolean;
  onUpdate?: (payload: AgentVisibilityUpdate) => Promise<void>;
  readOnly?: boolean;
}

const VISIBILITY_OPTIONS: { value: VisibilityScope; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'global',
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
    value: 'private',
    label: 'Приватний',
    description: 'Видимий тільки власнику',
    icon: <Lock className="w-4 h-4" />,
  },
];

export function AgentVisibilityCard({
  agentId,
  isPublic,
  visibilityScope,
  isListedInDirectory,
  onUpdate,
  readOnly = false,
}: AgentVisibilityCardProps) {
  const [publicState, setPublicState] = useState(isPublic);
  const [scope, setScope] = useState<VisibilityScope>(visibilityScope);
  const [listed, setListed] = useState(isListedInDirectory);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePublicToggle = async (checked: boolean) => {
    if (readOnly || saving) return;
    
    setPublicState(checked);
    setError(null);
    
    // If making private, also update scope
    const newScope = checked ? scope : 'private';
    if (!checked) {
      setScope('private');
      setListed(false);
    }
    
    if (onUpdate) {
      setSaving(true);
      try {
        await onUpdate({ is_public: checked, visibility_scope: newScope });
      } catch (e) {
        setError('Не вдалося зберегти');
        setPublicState(isPublic);
        setScope(visibilityScope);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleScopeChange = async (newScope: VisibilityScope) => {
    if (readOnly || saving) return;
    
    setScope(newScope);
    setError(null);
    
    // If changing to global, make public
    const newPublic = newScope === 'global' ? true : publicState;
    if (newScope === 'global') {
      setPublicState(true);
    } else if (newScope === 'private') {
      setPublicState(false);
      setListed(false);
    }
    
    if (onUpdate) {
      setSaving(true);
      try {
        await onUpdate({ is_public: newPublic, visibility_scope: newScope });
      } catch (e) {
        setError('Не вдалося зберегти');
        setScope(visibilityScope);
        setPublicState(isPublic);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleListedChange = async (checked: boolean) => {
    if (readOnly || saving || scope !== 'global') return;
    
    setListed(checked);
    setError(null);
    
    // is_listed_in_directory is tied to is_public in the backend
    if (onUpdate) {
      setSaving(true);
      try {
        await onUpdate({ is_public: checked, visibility_scope: scope });
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

      {/* Public Citizen Toggle */}
      <div className="mb-4 p-4 bg-white/5 border border-white/10 rounded-lg">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-white font-medium flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              Публічний громадянин міста
            </div>
            <div className="text-xs text-white/50 mt-1">
              {publicState
                ? 'Агент видимий у /citizens та публічних сервісах'
                : 'Агент прихований від публічного доступу'}
            </div>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={publicState}
              onChange={(e) => handlePublicToggle(e.target.checked)}
              disabled={readOnly || saving}
              className="sr-only peer"
            />
            <div className={`w-11 h-6 rounded-full transition-colors ${
              publicState ? 'bg-cyan-500' : 'bg-white/20'
            } peer-focus:ring-2 peer-focus:ring-cyan-500/50`}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                publicState ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </div>
          </div>
        </label>
      </div>

      <div className="text-sm text-white/50 mb-3">Режим видимості:</div>
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

      {/* Citizens Directory toggle - only for global visibility */}
      {scope === 'global' && (
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

