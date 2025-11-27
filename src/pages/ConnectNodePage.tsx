/**
 * Connect Node Page - Спрощений UI для підключення ноди
 * Для звичайних користувачів (без термінала)
 */

import React, { useState } from 'react';
import { Download, Copy, CheckCircle, Monitor, Cpu, HardDrive } from 'lucide-react';

export default function ConnectNodePage() {
  const [copied, setCopied] = useState(false);
  const [selectedOS, setSelectedOS] = useState<'macos' | 'linux' | 'windows'>('macos');

  const registryUrl = 'http://localhost:9205'; // TODO: змінити на production URL

  // Інструкції для різних ОС
  const instructions = {
    macos: {
      title: '🍎 macOS',
      steps: [
        {
          title: '1. Завантажити Bootstrap Agent',
          description: 'Скачайте скрипт автоматичної реєстрації',
          action: 'download',
          code: 'curl -O http://localhost:9205/bootstrap/node_bootstrap.py',
        },
        {
          title: '2. Встановити залежності',
          description: 'Встановіть необхідні Python бібліотеки',
          code: 'pip3 install --user requests psutil',
        },
        {
          title: '3. Запустити Bootstrap Agent',
          description: 'Запустіть агент для автоматичної реєстрації',
          code: `export NODE_REGISTRY_URL="${registryUrl}"
export NODE_ROLE="worker"
python3 node_bootstrap.py`,
        },
      ],
    },
    linux: {
      title: '🐧 Linux',
      steps: [
        {
          title: '1. Завантажити Bootstrap Agent',
          description: 'Скачайте скрипт автоматичної реєстрації',
          code: 'curl -O http://localhost:9205/bootstrap/node_bootstrap.py',
        },
        {
          title: '2. Встановити залежності',
          description: 'Встановіть необхідні Python бібліотеки',
          code: 'pip3 install requests psutil',
        },
        {
          title: '3. Запустити Bootstrap Agent',
          description: 'Запустіть агент для автоматичної реєстрації',
          code: `export NODE_REGISTRY_URL="${registryUrl}"
export NODE_ROLE="worker"
python3 node_bootstrap.py`,
        },
        {
          title: '4. (Опціонально) Додати як systemd service',
          description: 'Для автоматичного запуску при перезавантаженні',
          code: `sudo tee /etc/systemd/system/node-bootstrap.service << EOF
[Unit]
Description=DAGI Node Bootstrap
After=network.target

[Service]
Type=simple
Environment="NODE_REGISTRY_URL=${registryUrl}"
Environment="NODE_ROLE=worker"
ExecStart=/usr/bin/python3 /opt/dagi/node_bootstrap.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable node-bootstrap
sudo systemctl start node-bootstrap`,
        },
      ],
    },
    windows: {
      title: '🪟 Windows',
      steps: [
        {
          title: '1. Завантажити Bootstrap Agent',
          description: 'Скачайте скрипт автоматичної реєстрації',
          code: 'curl -O http://localhost:9205/bootstrap/node_bootstrap.py',
        },
        {
          title: '2. Встановити Python',
          description: 'Завантажте Python 3.9+ з python.org',
          link: 'https://www.python.org/downloads/',
        },
        {
          title: '3. Встановити залежності',
          description: 'Відкрийте PowerShell та виконайте',
          code: 'pip install requests psutil',
        },
        {
          title: '4. Запустити Bootstrap Agent',
          description: 'Запустіть агент для автоматичної реєстрації',
          code: `$env:NODE_REGISTRY_URL="${registryUrl}"
$env:NODE_ROLE="worker"
python node_bootstrap.py`,
        },
      ],
    },
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentInstructions = instructions[selectedOS];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            🔌 Підключити Ноду до DAGI
          </h1>
          <p className="text-slate-400">
            Простий спосіб підключити ваш комп'ютер до децентралізованої мережі AI
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-purple-900/30 to-purple-950/30 border border-purple-800/30 rounded-xl p-6">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="text-lg font-semibold mb-2">Заробляйте μGOV</h3>
            <p className="text-slate-400 text-sm">
              Отримуйте токени за надання обчислювальних ресурсів
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 border border-blue-800/30 rounded-xl p-6">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="text-lg font-semibold mb-2">Доступ до AI</h3>
            <p className="text-slate-400 text-sm">
              Використовуйте AI моделі мережі безкоштовно
            </p>
          </div>
          <div className="bg-gradient-to-br from-green-900/30 to-green-950/30 border border-green-800/30 rounded-xl p-6">
            <div className="text-3xl mb-3">🌱</div>
            <h3 className="text-lg font-semibold mb-2">Підтримайте спільноту</h3>
            <p className="text-slate-400 text-sm">
              Станьте частиною децентралізованої AI мережі
            </p>
          </div>
        </div>

        {/* System Requirements */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">📋 Системні вимоги</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Cpu className="w-6 h-6 text-purple-400" />
              <div>
                <div className="text-slate-400 text-sm">CPU</div>
                <div className="font-medium">4+ ядра</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Monitor className="w-6 h-6 text-blue-400" />
              <div>
                <div className="text-slate-400 text-sm">RAM</div>
                <div className="font-medium">8+ GB</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <HardDrive className="w-6 h-6 text-green-400" />
              <div>
                <div className="text-slate-400 text-sm">Disk</div>
                <div className="font-medium">50+ GB вільно</div>
              </div>
            </div>
          </div>
        </div>

        {/* OS Selector */}
        <div className="mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedOS('macos')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                selectedOS === 'macos'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              🍎 macOS
            </button>
            <button
              onClick={() => setSelectedOS('linux')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                selectedOS === 'linux'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              🐧 Linux
            </button>
            <button
              onClick={() => setSelectedOS('windows')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                selectedOS === 'windows'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              🪟 Windows
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">{currentInstructions.title}</h2>

          {currentInstructions.steps.map((step, index) => (
            <div
              key={index}
              className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-slate-400 text-sm mb-4">{step.description}</p>

              {step.code && (
                <div className="relative">
                  <pre className="bg-slate-950 border border-slate-700 rounded-lg p-4 overflow-x-auto text-sm">
                    <code className="text-green-400">{step.code}</code>
                  </pre>
                  <button
                    onClick={() => copyToClipboard(step.code)}
                    className="absolute top-2 right-2 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Скопіювати"
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
              )}

              {step.link && (
                <a
                  href={step.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Завантажити Python
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Alternative: One-Click Installer */}
        <div className="mt-8 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-800/30 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">⚡ Швидке підключення (Coming Soon)</h2>
          <p className="text-slate-400 mb-4">
            Скоро буде доступний інсталятор в один клік для автоматичного налаштування ноди
          </p>
          <button
            disabled
            className="px-6 py-3 bg-purple-600/50 text-white rounded-lg cursor-not-allowed opacity-50"
          >
            <Download className="w-4 h-4 inline mr-2" />
            Завантажити інсталятор (незабаром)
          </button>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">❓ Потрібна допомога?</h2>
          <div className="space-y-2 text-slate-400">
            <p>• 📚 Документація: <a href="#" className="text-purple-400 hover:underline">docs.dagi.ai</a></p>
            <p>• 💬 Telegram спільнота: <a href="#" className="text-purple-400 hover:underline">@dagi_community</a></p>
            <p>• 🐛 Проблеми: <a href="#" className="text-purple-400 hover:underline">GitHub Issues</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}

