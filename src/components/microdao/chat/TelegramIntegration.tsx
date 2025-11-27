import React, { useState } from 'react';
import { MessageCircle, CheckCircle, XCircle, Link2, ExternalLink, Copy, Settings } from 'lucide-react';

interface TelegramIntegrationProps {
  agentId: string;
  agentName: string;
  isConnected: boolean;
  botUsername?: string;
  botToken?: string;
  connectionDate?: string;
  onConnect: (token: string) => void;
  onDisconnect: () => void;
  onUpdateToken: (token: string) => void;
}

export const TelegramIntegration: React.FC<TelegramIntegrationProps> = ({
  agentName,
  isConnected,
  botUsername,
  botToken,
  connectionDate,
  onConnect,
  onDisconnect,
}) => {
  const [showSetup, setShowSetup] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleConnect = () => {
    if (tokenInput.trim()) {
      onConnect(tokenInput);
      setTokenInput('');
      setShowSetup(false);
    }
  };

  const handleCopyLink = () => {
    if (botUsername) {
      navigator.clipboard.writeText(`https://t.me/${botUsername}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('Ви впевнені, що хочете від\'єднати Telegram бота?')) {
      onDisconnect();
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className={`p-4 rounded-t-lg border-b border-gray-200 ${
        isConnected
          ? 'bg-gradient-to-r from-blue-50 to-cyan-50'
          : 'bg-gradient-to-r from-gray-50 to-slate-50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className={`h-6 w-6 ${isConnected ? 'text-blue-600' : 'text-gray-400'}`} />
            <div>
              <h3 className="font-semibold text-gray-900">Telegram інтеграція</h3>
              <p className="text-sm text-gray-600">{agentName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm">
                <CheckCircle className="h-4 w-4" />
                Підключено
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm">
                <XCircle className="h-4 w-4" />
                Не підключено
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {isConnected ? (
          /* Connected State */
          <div className="space-y-4">
            {/* Bot Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div>
                    <p className="text-sm text-gray-600">Ім'я бота</p>
                    <p className="font-semibold text-gray-900">@{botUsername}</p>
                  </div>
                  {connectionDate && (
                    <div>
                      <p className="text-sm text-gray-600">Підключено</p>
                      <p className="text-sm text-gray-900">{new Date(connectionDate).toLocaleString('uk-UA')}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <a
                      href={`https://t.me/${botUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Відкрити бота
                    </a>
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                    >
                      <Copy className="h-4 w-4" />
                      {copied ? 'Скопійовано!' : 'Копіювати посилання'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bot Token (masked) */}
            {botToken && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-600 mb-1">Токен бота</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono text-gray-700 bg-white px-3 py-2 rounded border border-gray-300">
                    {botToken.substring(0, 10)}...{botToken.substring(botToken.length - 10)}
                  </code>
                  <button
                    onClick={() => setShowSetup(true)}
                    className="p-2 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                    title="Оновити токен"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 border-t border-gray-200">
              <button
                onClick={handleDisconnect}
                className="w-full px-4 py-2 bg-red-50 text-red-700 border border-red-300 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
              >
                Від'єднати бота
              </button>
            </div>
          </div>
        ) : (
          /* Disconnected State */
          <div className="space-y-4">
            {!showSetup ? (
              <div className="text-center py-6">
                <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">
                  Підключіть Telegram бота для взаємодії з агентом через месенджер
                </p>
                <button
                  onClick={() => setShowSetup(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                >
                  <Link2 className="h-5 w-5" />
                  Підключити бота
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm space-y-2">
                  <p className="font-semibold text-blue-900">Як підключити Telegram бота:</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-800">
                    <li>Відкрийте <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline">@BotFather</a> в Telegram</li>
                    <li>Створіть нового бота командою <code className="bg-blue-100 px-1 rounded">/newbot</code></li>
                    <li>Скопіюйте отриманий токен</li>
                    <li>Вставте токен у поле нижче</li>
                  </ol>
                </div>

                {/* Token Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Токен бота
                  </label>
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    Формат: числовий_id:токен (наприклад, 1234567890:ABCdef...)
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={handleConnect}
                    disabled={!tokenInput.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Підключити
                  </button>
                  <button
                    onClick={() => {
                      setShowSetup(false);
                      setTokenInput('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Скасувати
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

