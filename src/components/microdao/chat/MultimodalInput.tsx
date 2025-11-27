import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Image as ImageIcon, 
  Paperclip, 
  Globe, 
  Send,
  X 
} from 'lucide-react';

interface MultimodalInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onImageUpload: (file: File) => void;
  onFileUpload: (file: File) => void;
  onWebSearch: (query: string) => void;
  onVoiceStart: () => void;
  onVoiceStop: () => void;
  isRecording: boolean;
  isPending: boolean;
  attachedImages: File[];
  attachedFiles: File[];
  onRemoveImage: (index: number) => void;
  onRemoveFile: (index: number) => void;
}

export const MultimodalInput: React.FC<MultimodalInputProps> = ({
  value,
  onChange,
  onSend,
  onImageUpload,
  onFileUpload,
  onWebSearch,
  onVoiceStart,
  onVoiceStop,
  isRecording,
  isPending,
  attachedImages,
  attachedFiles,
  onRemoveImage,
  onRemoveFile,
}) => {
  const [showWebSearch, setShowWebSearch] = useState(false);
  const [webSearchQuery, setWebSearchQuery] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Web Audio API для голосового записування
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Cleanup при unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleWebSearchSubmit = () => {
    if (webSearchQuery.trim()) {
      onWebSearch(webSearchQuery);
      setWebSearchQuery('');
      setShowWebSearch(false);
    }
  };

  return (
    <div className="border-t border-gray-200 p-4 space-y-3">
      {/* Attached Images Preview */}
      {attachedImages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachedImages.map((file, index) => (
            <div key={index} className="relative group">
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="h-20 w-20 object-cover rounded-lg border-2 border-purple-200"
              />
              <button
                onClick={() => onRemoveImage(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg truncate">
                {file.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attached Files Preview */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachedFiles.map((file, index) => (
            <div key={index} className="relative group bg-gray-100 rounded-lg p-2 pr-8 border border-gray-300">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700 truncate max-w-[200px]">
                  {file.name}
                </span>
              </div>
              <button
                onClick={() => onRemoveFile(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Web Search Modal */}
      {showWebSearch && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Веб-пошук</span>
            </div>
            <button
              onClick={() => setShowWebSearch(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            type="text"
            value={webSearchQuery}
            onChange={(e) => setWebSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleWebSearchSubmit()}
            placeholder="Введіть запит для пошуку в інтернеті..."
            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            onClick={handleWebSearchSubmit}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Виконати пошук
          </button>
        </div>
      )}

      {/* Main Input Area */}
      <div className="flex items-end gap-2">
        {/* Toolbar */}
        <div className="flex flex-col gap-2">
          {/* Voice Input */}
          <button
            onClick={isRecording ? onVoiceStop : onVoiceStart}
            className={`p-2 rounded-lg transition-colors ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={isRecording ? 'Зупинити запис' : 'Голосовий ввід'}
          >
            {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {/* Image Upload */}
          <button
            onClick={() => imageInputRef.current?.click()}
            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            title="Завантажити зображення"
            disabled={isPending}
          >
            <ImageIcon className="h-5 w-5" />
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />

          {/* File Upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            title="Завантажити файл"
            disabled={isPending}
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md,.json"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Web Search */}
          <button
            onClick={() => setShowWebSearch(!showWebSearch)}
            className={`p-2 rounded-lg transition-colors ${
              showWebSearch
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Веб-пошук"
            disabled={isPending}
          >
            <Globe className="h-5 w-5" />
          </button>
        </div>

        {/* Text Input */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Напишіть повідомлення... (Shift+Enter для нового рядка)"
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          rows={3}
          disabled={isPending || isRecording}
        />

        {/* Send Button */}
        <button
          onClick={onSend}
          disabled={(!value.trim() && attachedImages.length === 0 && attachedFiles.length === 0) || isPending}
          className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed h-[52px]"
          title="Відправити"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 text-red-600 animate-pulse">
          <div className="h-3 w-3 bg-red-600 rounded-full"></div>
          <span className="text-sm font-medium">Запис...</span>
        </div>
      )}
    </div>
  );
};

