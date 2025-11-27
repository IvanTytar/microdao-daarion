/**
 * AgentCreateDialog Component
 * Phase 6: Create new agent UI
 */
import { useState, useEffect } from 'react';
import { useCreateAgent } from './hooks/useCreateAgent';
import { getBlueprints, type AgentBlueprint, type AgentKind } from '@/api/agents';
import { useActor } from '@/store/authStore';

interface AgentCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AGENT_KINDS: { value: AgentKind; label: string }[] = [
  { value: 'assistant', label: 'Асистент' },
  { value: 'analyst', label: 'Аналітик' },
  { value: 'guardian', label: 'Захисник' },
  { value: 'node', label: 'Нода' },
  { value: 'quest', label: 'Квест' },
  { value: 'system', label: 'Система' },
];

export function AgentCreateDialog({ isOpen, onClose, onSuccess }: AgentCreateDialogProps) {
  const actor = useActor();
  const { createNewAgent, creating, error, success } = useCreateAgent();
  
  const [blueprints, setBlueprints] = useState<AgentBlueprint[]>([]);
  const [loadingBlueprints, setLoadingBlueprints] = useState(true);
  
  const [name, setName] = useState('');
  const [kind, setKind] = useState<AgentKind>('assistant');
  const [blueprintCode, setBlueprintCode] = useState('');
  const [description, setDescription] = useState('');
  const [microdaoId, setMicrodaoId] = useState('');

  // Load blueprints
  useEffect(() => {
    if (isOpen) {
      loadBlueprints();
    }
  }, [isOpen]);

  const loadBlueprints = async () => {
    try {
      setLoadingBlueprints(true);
      const data = await getBlueprints();
      setBlueprints(data);
      
      // Select first blueprint by default
      if (data.length > 0) {
        setBlueprintCode(data[0].code);
      }
    } catch (err) {
      console.error('Failed to load blueprints:', err);
    } finally {
      setLoadingBlueprints(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !blueprintCode) {
      return;
    }

    const agent = await createNewAgent({
      name,
      kind,
      description: description || undefined,
      blueprint_code: blueprintCode,
      microdao_id: microdaoId || undefined,
      owner_user_id: actor?.actor_id || undefined,
    });

    if (agent) {
      // Success!
      onSuccess();
      handleClose();
    }
  };

  const handleClose = () => {
    // Reset form
    setName('');
    setKind('assistant');
    setDescription('');
    setMicrodaoId('');
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            🤖 Створити агента
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              ❌ Помилка: {error.message}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
              ✅ Агент успішно створено!
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ім'я агента *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Наприклад: Sofia, Alex, Guardian"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Kind */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Тип агента *
            </label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as AgentKind)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {AGENT_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>

          {/* Blueprint */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Шаблон (Blueprint) *
            </label>
            {loadingBlueprints ? (
              <div className="text-gray-500">Завантаження...</div>
            ) : (
              <select
                value={blueprintCode}
                onChange={(e) => setBlueprintCode(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {blueprints.map((bp) => (
                  <option key={bp.code} value={bp.code}>
                    {bp.name} ({bp.default_model})
                  </option>
                ))}
              </select>
            )}
            
            {/* Show blueprint description */}
            {blueprintCode && blueprints.find(bp => bp.code === blueprintCode)?.description && (
              <div className="mt-2 text-sm text-gray-600">
                {blueprints.find(bp => bp.code === blueprintCode)?.description}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Опис (необов'язково)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Короткий опис агента..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* MicroDAO ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              MicroDAO ID (необов'язково)
            </label>
            <input
              type="text"
              value={microdaoId}
              onChange={(e) => setMicrodaoId(e.target.value)}
              placeholder="microdao:daarion"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-1 text-xs text-gray-500">
              Якщо не вказано, агент буде загальний
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={creating}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={creating || !name || !blueprintCode}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {creating ? 'Створення...' : 'Створити агента'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

