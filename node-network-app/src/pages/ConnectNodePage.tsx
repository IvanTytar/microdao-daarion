import React, { useEffect, useState } from 'react';
import { Copy, CheckCircle, Shield, Loader2 } from 'lucide-react';

export default function ConnectNodePage() {
  const [copied, setCopied] = useState(false);
  const [os, setOS] = useState<'macos' | 'linux' | 'windows'>('macos');
  const [connectorReport, setConnectorReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(true);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const commands = {
    macos: `curl -O http://localhost:9205/bootstrap/node_bootstrap.py
pip3 install --user requests psutil
export NODE_REGISTRY_URL="http://localhost:9205"
export NODE_ROLE="worker"
python3 node_bootstrap.py`,
    linux: `curl -O http://localhost:9205/bootstrap/node_bootstrap.py
pip3 install requests psutil
export NODE_REGISTRY_URL="http://localhost:9205"
export NODE_ROLE="worker"
python3 node_bootstrap.py`,
    windows: `curl -O http://localhost:9205/bootstrap/node_bootstrap.py
pip install requests psutil
set NODE_REGISTRY_URL=http://localhost:9205
set NODE_ROLE=worker
python node_bootstrap.py`,
  };

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch('/api/node-connector/report');
        const data = await res.json();
        setConnectorReport(data);
      } catch (error) {
        console.error('Failed to fetch node connector report:', error);
      } finally {
        setReportLoading(false);
      }
    };

    fetchReport();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Підключити ноду</h1>
        <p className="text-slate-400">Додайте свій комп'ютер до мережі DAGI</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setOS('macos')}
          className={`py-3 px-4 rounded-lg font-medium transition-all ${
            os === 'macos'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          🍎 macOS
        </button>
        <button
          onClick={() => setOS('linux')}
          className={`py-3 px-4 rounded-lg font-medium transition-all ${
            os === 'linux'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          🐧 Linux
        </button>
        <button
          onClick={() => setOS('windows')}
          className={`py-3 px-4 rounded-lg font-medium transition-all ${
            os === 'windows'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          🪟 Windows
        </button>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Команди для запуску</h2>
          <button
            onClick={() => copyToClipboard(commands[os])}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {copied ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <Copy className="w-5 h-5 text-slate-400" />
            )}
          </button>
        </div>
        <pre className="bg-slate-950 p-4 rounded-lg overflow-x-auto">
          <code className="text-green-400 text-sm">{commands[os]}</code>
        </pre>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            NodeConnector Agent
          </h2>
          {reportLoading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
        </div>
        {connectorReport ? (
          <>
            <p className="text-sm text-slate-400 mb-4">
              Статус: {connectorReport.summary.status.toUpperCase()} •{' '}
              {connectorReport.summary.checks_ok}/{connectorReport.summary.checks_total} перевірок
            </p>
            <div className="space-y-3">
              {connectorReport.checks.map((check: any) => (
                <div
                  key={check.name}
                  className="p-3 border border-slate-800 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <p className="text-white font-semibold text-sm">{check.name}</p>
                    <p className="text-xs text-slate-500">{check.description}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        check.status === 'ok'
                          ? 'bg-green-500/15 text-green-300'
                          : check.status === 'warn'
                            ? 'bg-yellow-500/15 text-yellow-300'
                            : 'bg-red-500/15 text-red-300'
                      }`}
                    >
                      {check.status.toUpperCase()}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">{check.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400">
            Не вдалося отримати звіт. Переконайтесь, що Node Registry працює на 9205 порту.
          </p>
        )}
      </div>

      <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-2">💡 Підказка</h3>
        <p className="text-slate-300 text-sm">
          Після запуску команд ваша нода автоматично з'явиться в списку. 
          Heartbeat оновлюється кожні 30 секунд.
        </p>
      </div>
    </div>
  );
}
