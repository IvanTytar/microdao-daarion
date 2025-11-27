import React, { useState } from 'react';
import { Settings, Edit2, Save, X, RotateCcw, CheckCircle } from 'lucide-react';

interface SystemPromptEditorProps {
  agentId: string;
  agentName: string;
  systemPrompt: string;
  onSave: (newPrompt: string) => void;
  onReset: () => void;
}

export const SystemPromptEditor: React.FC<SystemPromptEditorProps> = ({
  agentId,
  agentName,
  systemPrompt,
  onSave,
  onReset,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(systemPrompt);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    onSave(editedPrompt);
    setIsEditing(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleCancel = () => {
    setEditedPrompt(systemPrompt);
    setIsEditing(false);
  };

  const handleReset = () => {
    if (window.confirm('Ви впевнені, що хочете скинути системний промпт до значення за замовчуванням?')) {
      onReset();
      setEditedPrompt(systemPrompt);
      setIsEditing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-t-lg border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-amber-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Системний промпт</h3>
              <p className="text-sm text-gray-600">{agentName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSaved && (
              <div className="flex items-center gap-1 text-green-600 text-sm animate-fade-in">
                <CheckCircle className="h-4 w-4" />
                <span>Збережено</span>
              </div>
            )}
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
                >
                  <Edit2 className="h-4 w-4" />
                  Редагувати
                </button>
                <button
                  onClick={handleReset}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Скинути до значення за замовчуванням"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  <Save className="h-4 w-4" />
                  Зберегти
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                  <X className="h-4 w-4" />
                  Скасувати
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {!isEditing ? (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
              {systemPrompt}
            </pre>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm resize-none"
              placeholder="Введіть системний промпт для агента..."
            />
            <div className="text-xs text-gray-500">
              <p><strong>Порада:</strong> Системний промпт визначає поведінку та особистість агента.</p>
              <p className="mt-1">Включіть:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Роль та ідентичність агента</li>
                <li>Основні функції та можливості</li>
                <li>Стиль спілкування</li>
                <li>Обмеження та правила</li>
              </ul>
            </div>
          </div>
        )}

        {/* Character Count */}
        <div className="mt-3 text-right text-xs text-gray-500">
          {isEditing ? editedPrompt.length : systemPrompt.length} символів
        </div>
      </div>
    </div>
  );
};

