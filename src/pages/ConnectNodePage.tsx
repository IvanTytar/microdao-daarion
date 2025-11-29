/**
 * Connect Node Page - Інструкції з підключення ноди
 */

import React, { useState, useEffect } from 'react';
import { Download, Copy, CheckCircle, Monitor, Cpu, HardDrive, Terminal, ExternalLink, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { apiGet } from '../api/client';

export default function ConnectNodePage() {
  const [copied, setCopied] = useState(false);
  const [instructions, setInstructions] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInstructions = async () => {
      try {
        const response = await apiGet<{ content: string }>('/public/nodes/join/instructions');
        if (response.content) {
          setInstructions(response.content);
        }
      } catch (error) {
        console.error('Failed to fetch instructions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInstructions();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/nodes" className="text-blue-600 hover:underline mb-4 inline-block">&larr; Назад до списку нод</Link>
          <h1 className="text-4xl font-bold mb-2 text-gray-900">
            🔌 Підключити Ноду
          </h1>
          <p className="text-gray-600">
            Інструкція з розгортання обчислювальної ноди DAARION
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-blue-100 rounded-xl p-6 shadow-sm">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Заробляйте токени</h3>
            <p className="text-gray-500 text-sm">
              Отримуйте винагороду за надання обчислювальних ресурсів
            </p>
          </div>
          <div className="bg-white border border-purple-100 rounded-xl p-6 shadow-sm">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Доступ до AI</h3>
            <p className="text-gray-500 text-sm">
              Використовуйте AI моделі мережі безкоштовно для своїх агентів
            </p>
          </div>
          <div className="bg-white border border-green-100 rounded-xl p-6 shadow-sm">
            <div className="text-3xl mb-3">🌱</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Розвивайте мережу</h3>
            <p className="text-gray-500 text-sm">
              Станьте частиною децентралізованої інфраструктури
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Instructions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 prose prose-blue max-w-none">
              {instructions ? (
                 <ReactMarkdown
                  components={{
                    code({node, inline, className, children, ...props}: any) {
                      const match = /language-(\w+)/.exec(className || '')
                      return !inline && match ? (
                        <div className="relative group">
                          <pre className={className} {...props}>
                            <code>{children}</code>
                          </pre>
                          <button
                            onClick={() => copyToClipboard(String(children).replace(/\n$/, ''))}
                            className="absolute top-2 right-2 p-2 bg-gray-700 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy"
                          >
                            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      )
                    }
                  }}
                 >
                   {instructions}
                 </ReactMarkdown>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Інструкції не знайдено. Зверніться до адміністратора.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Help Section */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 text-blue-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Потрібна допомога?
              </h2>
              <div className="space-y-3 text-blue-800 text-sm">
                <p>Для отримання токенів доступу (NATS credentials) зверніться до адміністраторів:</p>
                <a 
                  href="https://matrix.to/#/#daarion:daarion.space" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-white rounded-lg hover:shadow-md transition-shadow"
                >
                  <span className="font-semibold">Matrix Chat</span>
                  <ExternalLink className="w-4 h-4 ml-auto" />
                </a>
                <a 
                  href="#" 
                  className="flex items-center gap-2 p-3 bg-white rounded-lg hover:shadow-md transition-shadow"
                >
                  <span className="font-semibold">Discord Server</span>
                  <ExternalLink className="w-4 h-4 ml-auto" />
                </a>
              </div>
            </div>

            {/* System Requirements Summary */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4 text-gray-900">Вимоги</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Cpu className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">CPU</div>
                    <div className="font-medium text-gray-900">4+ Cores</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Monitor className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">RAM</div>
                    <div className="font-medium text-gray-900">16GB+ (32GB rec.)</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">Storage</div>
                    <div className="font-medium text-gray-900">100GB+ SSD</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Terminal className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">OS</div>
                    <div className="font-medium text-gray-900">Ubuntu 22.04 / Debian</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
