/**
 * Monitor Agent для конкретної НОДИ
 * Автоматично створюється для кожної НОДИ
 */

import { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, Activity } from 'lucide-react';
import { useMonitorEvents, type MonitorEvent } from '../../hooks/useMonitorEvents';
import { getMonitorAgentChatUrl } from '../../utils/monitorAgentFactory';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface NodeMonitorChatProps {
  nodeId: string;
  nodeName: string;
}

export function NodeMonitorChat({ nodeId, nodeName }: NodeMonitorChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { events, isConnected } = useMonitorEvents();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Фільтруємо події тільки для цієї ноди
  const nodeEvents = events.filter(event => event.node_id === nodeId);

  const getEventIcon = (type: MonitorEvent['type']) => {
    switch (type) {
      case 'agent':
        return '🔵';
      case 'node':
        return '🟢';
      case 'system':
        return '🟣';
      case 'project':
        return '📝';
      default:
        return '⚪';
    }
  };

  // Додаємо події від Monitor Agent як повідомлення
  useEffect(() => {
    if (nodeEvents.length > 0 && isOpen) {
      const latestEvent = nodeEvents[0];
      const eventId = `event-${latestEvent.timestamp}`;
      const isNewEvent = !messages.some((msg) => msg.id === eventId);

      if (isNewEvent) {
        const eventMessage: ChatMessage = {
          id: eventId,
          role: 'assistant',
          content: `📊 ${getEventIcon(latestEvent.type)} ${latestEvent.message}`,
          timestamp: latestEvent.timestamp,
        };

        setMessages((prev) => {
          const newMessages = [...prev, eventMessage];
          return newMessages.slice(-50);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeEvents, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const messageText = input.trim();
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const chatUrl = getMonitorAgentChatUrl(`agent-monitor-${nodeId}`, nodeId);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут

      const response = await fetch(chatUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          agent_id: `monitor-${nodeId}`,
          message: messageText,
          node_id: nodeId,
        }),
      }).catch((fetchError) => {
        clearTimeout(timeoutId);
        throw fetchError;
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const data = await response.json();
            
            const assistantMessage: ChatMessage = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: data.response || data.message || data.reply || 'Немає відповіді',
              timestamp: new Date().toISOString(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
            setIsLoading(false);
            return; // Успішно отримали відповідь
          } catch (parseError) {
            // Помилка парсингу JSON
            if (import.meta.env.DEV) {
              console.debug('Failed to parse response:', parseError);
            }
          }
        }
      }

      // Якщо не вдалося отримати відповідь, показуємо зрозуміле повідомлення
      let errorMessage = 'Неможливо підключитися до Monitor Agent';
      
      if (response) {
        if (response.status === 404) {
          errorMessage = 'Monitor Agent для цієї ноди не знайдено.';
        } else if (response.status === 500) {
          errorMessage = 'Помилка сервера Monitor Agent. Спробуйте пізніше.';
        } else {
          errorMessage = `Помилка: HTTP ${response.status}`;
        }
      }

      const errorChatMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ ${errorMessage}\n\n💡 Monitor Agent автоматично відстежує зміни на цій ноді.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorChatMessage]);
    } catch (error) {
      // Тиха обробка помилок
      if (error instanceof Error) {
        const isExpectedError = 
          error.name === 'AbortError' ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('ERR_CONNECTION_REFUSED') ||
          error.message.includes('ERR_NAME_NOT_RESOLVED');
        
        if (!isExpectedError && import.meta.env.DEV) {
          console.debug('Unexpected error sending message to Monitor Agent:', error);
        }
      }

      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Monitor Agent недоступний. Перевірте підключення до сервера.\n\n💡 Повідомлення збережено локально.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-xl hover:bg-blue-700 hover:scale-110 transition-all flex items-center justify-center z-[9999] group"
        title={`Відкрити чат з Monitor Agent (${nodeName})`}
      >
        <Activity className="w-7 h-7" />
        {!isConnected && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
        )}
        {isConnected && nodeEvents.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold">
            {nodeEvents.length > 99 ? '99+' : nodeEvents.length}
          </span>
        )}
        <span className="absolute right-full mr-3 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Monitor Agent ({nodeName})
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white rounded-lg shadow-2xl flex flex-col z-[9999] h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          <span className="font-semibold">Monitor Agent ({nodeName})</span>
          {isConnected ? (
            <span className="w-2 h-2 bg-green-400 rounded-full" title="Підключено" />
          ) : (
            <span className="w-2 h-2 bg-red-400 rounded-full" title="Відключено" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/docs/monitor_agents/monitor-node-${nodeId}_changes.md`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:bg-blue-700 rounded transition-colors"
            title="Відкрити MD файл з усіма змінами"
          >
            <FileText className="w-4 h-4" />
          </a>
          <a
            href={`/docs/monitor_agents/monitor-node-${nodeId}_changes.ipynb`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:bg-blue-700 rounded transition-colors"
            title="Відкрити Jupyter Notebook з усіма змінами"
          >
            <BookOpen className="w-4 h-4" />
          </a>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-blue-700 rounded transition-colors"
            title="Закрити"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Activity className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">Почніть розмову з Monitor Agent</p>
            <p className="text-xs mt-1">Події з {nodeName} будуть відображатись тут</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...messages].reverse().map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {new Date(message.timestamp).toLocaleTimeString('uk-UA', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Написати повідомлення..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

