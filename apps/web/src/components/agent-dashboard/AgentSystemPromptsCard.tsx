'use client';

import { useState } from 'react';
import { 
  AgentSystemPrompts, 
  PromptKind, 
  updateAgentPrompt 
} from '@/lib/agent-dashboard';

interface AgentSystemPromptsCardProps {
  agentId: string;
  systemPrompts?: AgentSystemPrompts;
  canEdit?: boolean;
  onUpdated?: () => void;
}

const PROMPT_KINDS: { id: PromptKind; label: string; icon: string; description: string }[] = [
  { 
    id: 'core', 
    label: 'Core', 
    icon: '🧬',
    description: 'Основна особистість і стиль агента'
  },
  { 
    id: 'safety', 
    label: 'Safety', 
    icon: '🛡️',
    description: 'Обмеження безпеки та заборонені дії'
  },
  { 
    id: 'governance', 
    label: 'Governance', 
    icon: '⚖️',
    description: 'Правила взаємодії з DAO та іншими агентами'
  },
  { 
    id: 'tools', 
    label: 'Tools', 
    icon: '🔧',
    description: 'Налаштування використання інструментів'
  }
];

export function AgentSystemPromptsCard({ 
  agentId, 
  systemPrompts, 
  canEdit = false,
  onUpdated 
}: AgentSystemPromptsCardProps) {
  const [activeTab, setActiveTab] = useState<PromptKind>('core');
  const [editedContent, setEditedContent] = useState<Record<PromptKind, string>>({
    core: systemPrompts?.core?.content || '',
    safety: systemPrompts?.safety?.content || '',
    governance: systemPrompts?.governance?.content || '',
    tools: systemPrompts?.tools?.content || ''
  });
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  
  const currentPrompt = systemPrompts?.[activeTab];
  const currentContent = editedContent[activeTab];
  const hasChanges = currentContent !== (currentPrompt?.content || '');
  
  const handleSave = async () => {
    if (!hasChanges || saving) return;
    
    setSaving(true);
    setSaveStatus('idle');
    setError(null);
    
    try {
      await updateAgentPrompt(agentId, activeTab, currentContent);
      setSaveStatus('success');
      onUpdated?.();
      
      // Reset success status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setSaveStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>📝</span> System Prompts
        </h3>
        <p className="text-white/50 text-sm mt-1">
          Системні промти визначають базову поведінку агента у DAARION City
        </p>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {PROMPT_KINDS.map(kind => {
          const prompt = systemPrompts?.[kind.id];
          const isActive = activeTab === kind.id;
          const hasContent = !!prompt?.content;
          
          return (
            <button
              key={kind.id}
              onClick={() => setActiveTab(kind.id)}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors
                ${isActive 
                  ? 'bg-cyan-500/20 text-cyan-400' 
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
                }
              `}
            >
              <span>{kind.icon}</span>
              <span>{kind.label}</span>
              {hasContent && (
                <span className="w-2 h-2 rounded-full bg-green-500" />
              )}
            </button>
          );
        })}
      </div>
      
      {/* Active Tab Description */}
      <p className="text-white/40 text-xs mb-3">
        {PROMPT_KINDS.find(k => k.id === activeTab)?.description}
      </p>
      
      {/* Content */}
      <div className="space-y-3">
        {/* Version info */}
        {currentPrompt && (
          <div className="flex items-center gap-3 text-xs text-white/40">
            <span>v{currentPrompt.version}</span>
            <span>•</span>
            <span>{new Date(currentPrompt.updated_at).toLocaleString()}</span>
            {currentPrompt.updated_by && (
              <>
                <span>•</span>
                <span>by {currentPrompt.updated_by}</span>
              </>
            )}
          </div>
        )}
        
        {/* Textarea */}
        <textarea
          value={currentContent}
          onChange={(e) => setEditedContent(prev => ({
            ...prev,
            [activeTab]: e.target.value
          }))}
          placeholder={`Enter ${activeTab} prompt...`}
          disabled={!canEdit}
          className={`
            w-full h-48 p-3 rounded-xl text-sm font-mono
            bg-white/5 border border-white/10
            text-white placeholder-white/30
            focus:outline-none focus:border-cyan-500/50
            resize-none
            ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}
          `}
        />
        
        {/* Actions */}
        {canEdit && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {saveStatus === 'success' && (
                <span className="text-green-400 text-sm flex items-center gap-1">
                  <span>✓</span> Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-red-400 text-sm">
                  {error || 'Failed to save'}
                </span>
              )}
            </div>
            
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${hasChanges && !saving
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-white'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
                }
              `}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
        
        {!canEdit && (
          <p className="text-white/30 text-xs text-center">
            🔒 Only Architects and Admins can edit system prompts
          </p>
        )}
      </div>
    </div>
  );
}

