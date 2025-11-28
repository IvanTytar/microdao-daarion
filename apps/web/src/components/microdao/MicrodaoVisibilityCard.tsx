'use client';

import { useState } from 'react';
import { Eye, Globe, Lock, Layers, Loader2, Settings } from 'lucide-react';
import { updateMicrodaoVisibility } from '@/lib/api/microdao';

interface MicrodaoVisibilityCardProps {
  microdaoId: string;
  isPublic: boolean;
  isPlatform: boolean;
  isOrchestrator: boolean;  // Only orchestrator can edit
  onUpdated?: () => void;
}

export function MicrodaoVisibilityCard({
  microdaoId,
  isPublic,
  isPlatform,
  isOrchestrator,
  onUpdated,
}: MicrodaoVisibilityCardProps) {
  const [publicState, setPublicState] = useState(isPublic);
  const [platformState, setPlatformState] = useState(isPlatform);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePublicToggle = async (checked: boolean) => {
    if (!isOrchestrator || saving) return;
    
    setPublicState(checked);
    setError(null);
    setSaving(true);
    
    try {
      await updateMicrodaoVisibility(microdaoId, {
        is_public: checked,
        is_platform: platformState,
      });
      onUpdated?.();
    } catch (e) {
      setError('Не вдалося зберегти');
      setPublicState(isPublic);
    } finally {
      setSaving(false);
    }
  };

  const handlePlatformToggle = async (checked: boolean) => {
    if (!isOrchestrator || saving) return;
    
    setPlatformState(checked);
    setError(null);
    setSaving(true);
    
    try {
      await updateMicrodaoVisibility(microdaoId, {
        is_public: publicState,
        is_platform: checked,
      });
      onUpdated?.();
    } catch (e) {
      setError('Не вдалося зберегти');
      setPlatformState(isPlatform);
    } finally {
      setSaving(false);
    }
  };

  if (!isOrchestrator) {
    return null; // Don't show settings to non-orchestrators
  }

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          Налаштування видимості
        </h2>
        {saving && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />}
      </div>

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Public toggle */}
        <div className="bg-slate-900/50 border border-slate-700/30 rounded-lg p-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-slate-200 font-medium flex items-center gap-2">
                {publicState ? <Globe className="w-4 h-4 text-cyan-400" /> : <Lock className="w-4 h-4 text-slate-500" />}
                Публічний MicroDAO
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {publicState
                  ? 'Видимий у списку MicroDAO та на City Map'
                  : 'Прихований від публічного доступу'}
              </div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={publicState}
                onChange={(e) => handlePublicToggle(e.target.checked)}
                disabled={saving}
                className="sr-only peer"
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${
                publicState ? 'bg-cyan-500' : 'bg-slate-600'
              } peer-focus:ring-2 peer-focus:ring-cyan-500/50`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  publicState ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </div>
          </label>
        </div>

        {/* Platform toggle */}
        <div className="bg-slate-900/50 border border-slate-700/30 rounded-lg p-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-slate-200 font-medium flex items-center gap-2">
                <Layers className={`w-4 h-4 ${platformState ? 'text-amber-400' : 'text-slate-500'}`} />
                Платформа / District
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {platformState
                  ? 'Може мати дочірні MicroDAO, виділяється на City Map'
                  : 'Звичайний MicroDAO без дочірніх структур'}
              </div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={platformState}
                onChange={(e) => handlePlatformToggle(e.target.checked)}
                disabled={saving}
                className="sr-only peer"
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${
                platformState ? 'bg-amber-500' : 'bg-slate-600'
              } peer-focus:ring-2 peer-focus:ring-amber-500/50`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  platformState ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

