/**
 * AgentSettingsPanel Component
 * Edit agent settings: model, tools, system prompt
 */
import { useState } from 'react';
import { updateAgentModel, updateAgentTools, type AgentDetail } from '@/api/agents';

interface AgentSettingsPanelProps {
  agent: AgentDetail;
  onUpdate: () => void;
}

const AVAILABLE_MODELS = [
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'OpenAI' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI' },
  { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek' },
  { id: 'claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'Anthropic' },
  { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', provider: 'Meta' },
];

const AVAILABLE_TOOLS = [
  { id: 'projects.list', name: 'Список проєктів', category: 'Projects' },
  { id: 'task.create', name: 'Створити задачу', category: 'Tasks' },
  { id: 'task.list', name: 'Список задач', category: 'Tasks' },
  { id: 'memory.search', name: 'Пошук в пам\'яті', category: 'Memory' },
  { id: 'file.read', name: 'Читати файл', category: 'Files' },
  { id: 'web.search', name: 'Пошук в інтернеті', category: 'Web' },
];

export function AgentSettingsPanel({ agent, onUpdate }: AgentSettingsPanelProps) {
  const [selectedModel, setSelectedModel] = useState(agent.model);
  const [selectedTools, setSelectedTools] = useState<string[]>(agent.tools);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSaveModel = async () => {
    if (selectedModel === agent.model) return;

    try {
      setSaving(true);
      setError(null);
      
      await updateAgentModel(agent.id, selectedModel);
      
      setSuccess('Модель успішно оновлено!');
      setTimeout(() => setSuccess(null), 3000);
      onUpdate();
    } catch (err) {
      console.error('Failed to update model:', err);
      setError('Не вдалося оновити модель');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTools = async () => {
    try {
      setSaving(true);
      setError(null);
      
      await updateAgentTools(agent.id, selectedTools);
      
      setSuccess('Інструменти успішно оновлено!');
      setTimeout(() => setSuccess(null), 3000);
      onUpdate();
    } catch (err) {
      console.error('Failed to update tools:', err);
      setError('Не вдалося оновити інструменти');
    } finally {
      setSaving(false);
    }
  };

  const toggleTool = (toolId: string) => {
    setSelectedTools((prev) =>
      prev.includes(toolId)
        ? prev.filter((id) => id !== toolId)
        : [...prev, toolId]
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">⚙️ Налаштування</h3>

      {/* Success message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          ✅ {success}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          ❌ {error}
        </div>
      )}

      {/* Model settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">
          🤖 LLM Модель
        </h4>
        
        <div className="space-y-3">
          {AVAILABLE_MODELS.map((model) => (
            <label
              key={model.id}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="radio"
                name="model"
                value={model.id}
                checked={selectedModel === model.id}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{model.name}</div>
                <div className="text-xs text-gray-500">{model.provider}</div>
              </div>
              {selectedModel === model.id && agent.model === model.id && (
                <span className="text-xs text-green-600 font-medium">Поточна</span>
              )}
            </label>
          ))}
        </div>

        <button
          onClick={handleSaveModel}
          disabled={saving || selectedModel === agent.model}
          className="
            mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg
            hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
            transition-colors
          "
        >
          {saving ? 'Збереження...' : 'Зберегти модель'}
        </button>
      </div>

      {/* Tools settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">
          🔧 Інструменти
        </h4>
        
        <div className="space-y-2">
          {AVAILABLE_TOOLS.map((tool) => (
            <label
              key={tool.id}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedTools.includes(tool.id)}
                onChange={() => toggleTool(tool.id)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{tool.name}</div>
                <div className="text-xs text-gray-500">{tool.category}</div>
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={handleSaveTools}
          disabled={saving}
          className="
            mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg
            hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
            transition-colors
          "
        >
          {saving ? 'Збереження...' : 'Зберегти інструменти'}
        </button>
      </div>

      {/* Agent info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">
          ℹ️ Інформація
        </h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">ID:</span>
            <span className="font-mono text-gray-900">{agent.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">MicroDAO:</span>
            <span className="font-mono text-gray-900">{agent.microdao_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Створено:</span>
            <span className="text-gray-900">
              {new Date(agent.created_at).toLocaleDateString('uk-UA')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Оновлено:</span>
            <span className="text-gray-900">
              {new Date(agent.updated_at).toLocaleDateString('uk-UA')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

