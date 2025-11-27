import { useState } from 'react';
import { X, Send, MessageSquare } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export function MonitorChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '👋 Привіт! Я Monitor Agent - допомагаю відстежувати метрики та події всіх нод.\n\n✨ Можу:\n• Показати статус нод\n• Допомогти підключити нову ноду\n• Показати історію змін\n• Відповісти на питання про метрики',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchJson = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Request failed: ${url}`);
    return res.json();
  };

  const buildResponse = async (lowerInput: string): Promise<string> => {
    if (lowerInput.includes('підключ')) {
      return '📋 Для підключення нової ноди:\n\n1️⃣ Перейдіть на сторінку "Підключити"\n2️⃣ Завантажте bootstrap скрипт\n3️⃣ Запустіть його на цільовій машині\n4️⃣ Нода автоматично зареєструється у реєстрі\n\n💡 Команда:\ncurl http://localhost:9205/bootstrap/node_bootstrap.py | python3';
    }

    if (['статус', 'status', 'нод', 'network'].some((k) => lowerInput.includes(k))) {
      const global = await fetchJson('/api/monitoring/global-kpis');
      const nodes = global.cluster?.nodes || {};
      const agents = global.agents || {};
      return `📊 Статус мережі:

🟢 Нод online: ${nodes.online || 0}/${nodes.total || 0}
📈 Uptime: ${global.cluster?.uptime_percent?.toFixed(1) || '99.0'}%
🤖 Активні агенти (5хв): ${agents.active_5m || 0}
⚠️ Error rate: ${global.cluster?.error_rate_percent || 0}%`;
    }

    if (['метрик', 'metrics', 'cpu', 'ram'].some((k) => lowerInput.includes(k))) {
      const [node2, node1, ai] = await Promise.all([
        fetchJson('/api/node-metrics'),
        fetchJson('/api/node1-metrics').catch(() => null),
        fetchJson('/api/monitoring/ai-usage').catch(() => null),
      ]);
      const node2Cpu = Math.round(node2?.cpu?.percent || 0);
      const node2Ram = Math.round(node2?.memory?.percent || 0);
      const node1Cpu = Math.round(node1?.metrics?.cpu?.percent || 0);
      const node1Ram = Math.round(node1?.metrics?.memory?.percent || 0);
      return `📈 Метрики:

NODE1 (Hetzner):
• CPU: ${node1Cpu || 'N/A'}%
• RAM: ${node1Ram || 'N/A'}%

NODE2 (MacBook):
• CPU: ${node2Cpu}%
• RAM: ${node2Ram}%

LLM tokens (1h): ${ai?.tokens?.last_hour_in?.toLocaleString('uk-UA') || 'N/A'} in / ${ai?.tokens?.last_hour_out?.toLocaleString('uk-UA') || 'N/A'} out`;
    }

    if (['alert', 'помил', 'warning'].some((k) => lowerInput.includes(k))) {
      const alerts = await fetchJson('/api/monitoring/alerts');
      if (!alerts.alerts?.length) {
        return '✅ Немає активних алертів. Всі сервіси працюють у штатному режимі.';
      }
      const formatted = alerts.alerts
        .slice(0, 3)
        .map(
          (alert: any) =>
            `${alert.severity?.toUpperCase() || 'INFO'} • ${alert.title}\n${alert.description}`,
        )
        .join('\n\n');
      return `🚨 Актуальні алерти:\n\n${formatted}`;
    }

    if (['події', 'events', 'node1'].some((k) => lowerInput.includes(k))) {
      const events = await fetchJson('/api/monitoring/events/node-1-hetzner-gex44?limit=5');
      if (!events.events?.length) {
        return 'ℹ️ Подій для NODE1 не виявлено за останній період.';
      }
      const formatted = events.events
        .map(
          (event: any) =>
            `${new Date(event.timestamp).toLocaleTimeString('uk-UA')} • ${event.title}`,
        )
        .join('\n');
      return `🕒 Останні події NODE1:\n${formatted}`;
    }

    return '🤔 Можу допомогти зі статусом нод, метриками, алертами або підключенням. Спробуйте запит типу "метрики", "алерти", "статус".';
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const lowerInput = userMessage.content.toLowerCase();

    try {
      const responseText = await buildResponse(lowerInput);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Monitor agent failed:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            '⚠️ Не вдалося отримати дані з API. Перевірте, чи працює Node Registry на 9205 порту.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 z-50"
        title="Відкрити Monitor Agent"
      >
        <MessageSquare className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          <div>
            <h3 className="font-semibold">Monitor Agent</h3>
            <p className="text-xs opacity-90">Глобальний моніторинг</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="hover:bg-white/20 p-1 rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString('uk-UA', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Запитайте про метрики..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

