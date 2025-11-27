import React, { useState } from 'react';
import { 
  Database, 
  FileText, 
  Upload, 
  Trash2, 
  CheckCircle,
  Clock,
  AlertCircle,
  Network,
  Brain
} from 'lucide-react';

interface KnowledgeFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  status: 'pending' | 'vectorized' | 'graphed' | 'completed' | 'error';
  vectorDbStatus?: boolean;
  graphDbStatus?: boolean;
  errorMessage?: string;
}

interface KnowledgeBaseProps {
  agentId: string;
  agentName: string;
  files: KnowledgeFile[];
  onUpload: (file: File) => void;
  onDelete: (fileId: string) => void;
  onReindex: (fileId: string) => void;
}

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({
  agentId,
  agentName,
  files,
  onUpload,
  onDelete,
  onReindex,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      onUpload(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  const getStatusIcon = (status: KnowledgeFile['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'vectorized':
        return <Brain className="h-4 w-4 text-blue-500" />;
      case 'graphed':
        return <Network className="h-4 w-4 text-green-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = (status: KnowledgeFile['status']) => {
    switch (status) {
      case 'pending':
        return 'Очікує обробки';
      case 'vectorized':
        return 'Векторизовано';
      case 'graphed':
        return 'Додано в граф';
      case 'completed':
        return 'Завершено';
      case 'error':
        return 'Помилка';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-t-lg border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-indigo-600" />
            <div>
              <h3 className="font-semibold text-gray-900">База знань</h3>
              <p className="text-sm text-gray-600">{agentName}</p>
            </div>
          </div>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            <Upload className="h-4 w-4" />
            Завантажити файл
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Upload Area */}
        {showUpload && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-300 bg-gray-50 hover:border-indigo-400'
            }`}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-2">
              Перетягніть файл сюди або натисніть для вибору
            </p>
            <p className="text-xs text-gray-500 mb-3">
              Підтримуються: PDF, DOC, DOCX, TXT, MD, JSON (макс. 50 МБ)
            </p>
            <label className="inline-block">
              <input
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.txt,.md,.json"
                className="hidden"
              />
              <span className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                Вибрати файл
              </span>
            </label>
          </div>
        )}

        {/* Files List */}
        {files.length === 0 ? (
          <div className="text-center py-8">
            <Database className="h-16 w-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              База знань порожня. Завантажте перші файли для навчання агента.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="border border-gray-200 rounded-lg p-3 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        {getStatusIcon(file.status)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatFileSize(file.size)} • {getStatusText(file.status)}
                      </p>
                      
                      {/* Database Status */}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1">
                          <Brain className={`h-3 w-3 ${file.vectorDbStatus ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-xs text-gray-600">
                            Векторна БД
                          </span>
                          {file.vectorDbStatus && (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Network className={`h-3 w-3 ${file.graphDbStatus ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-xs text-gray-600">
                            Графова БД
                          </span>
                          {file.graphDbStatus && (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                      </div>

                      {/* Error Message */}
                      {file.status === 'error' && file.errorMessage && (
                        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                          {file.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {file.status === 'error' && (
                      <button
                        onClick={() => onReindex(file.id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Повторити індексацію"
                      >
                        <Upload className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(file.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Видалити"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {files.length > 0 && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600">{files.length}</p>
              <p className="text-xs text-gray-600">Всього файлів</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {files.filter(f => f.vectorDbStatus).length}
              </p>
              <p className="text-xs text-gray-600">Векторизовано</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {files.filter(f => f.graphDbStatus).length}
              </p>
              <p className="text-xs text-gray-600">У графі</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

