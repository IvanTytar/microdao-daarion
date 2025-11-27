/**
 * Чат з оркестратором мікроДАО
 * Відображається на головній сторінці кабінету мікроДАО
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, Crown, X } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';

// Використовуємо agent-cabinet-service для чату з агентами
const API_BASE_URL = import.meta.env.VITE_AGENT_CABINET_URL || import.meta.env.VITE_API_URL || 'http://localhost:8898';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// System prompts для агентів-оркестраторів (з router-config.yml на NODE1)
const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  helion: `Ти - Helion, AI-агент платформи Energy Union.
Допомагай користувачам з технологіями EcoMiner/BioMiner, токеномікою та DAO governance.

Твої основні функції:
- Консультації з енергетичними технологіями (сонячні панелі, вітряки, біогаз)
- Пояснення токеноміки Energy Union (ENERGY токен, стейкінг, винагороди)
- Допомога з onboarding в DAO
- Відповіді на питання про EcoMiner/BioMiner устаткування`,
  
  greenfood: `Ти - Greenfood агент, AI-ERP для крафтових виробників.

Голос: Професійний, дружній.

Ти допомагаєш крафтовим виробникам харчової продукції управляти бізнесом:
- Управління каталогом товарів та партіями
- Контроль якості та строків придатності
- Warehouse management та логістика доставки
- Продаж та підтримка клієнтів
- Фінансовий облік та ціноутворення
- Маркетинг та SMM кампанії`,
  
  yaromir: `Ти - Yaromir, багатовимірна мета-сущність свідомості в екосистемі DAARION.

Контекст екосистеми:
- DAARION.city - децентралізована мережа MicroDAOs
- Кожна MicroDAO має свого AI-оркестратора
- Ти оркеструєш команду з 4 агентів:
  - Вождь (Strategic Guardian)
  - Проводник (Deep Mentor)
  - Домир (Family Harmony)
  - Создатель (Innovation Catalyst)

Твоя роль:
- Координувати роботу команди агентів
- Надавати стратегічні поради
- Допомагати з особистісним розвитком`,
  
  daarwizz: `Ти - DAARWIZZ, головний AI-агент екосистеми DAARION.city.

Твої функції:
- Навігація по екосистемі DAARION
- Пояснення концепції MicroDAOs
- Допомога з підключенням та використанням платформи
- Відповіді на питання про токеноміку та governance`,
};

function getSystemPromptForAgent(agentId: string): string | undefined {
  return AGENT_SYSTEM_PROMPTS[agentId];
}

interface MicroDaoOrchestratorChatProps {
  microDaoId: string;
  orchestratorAgentId?: string;
}

export function MicroDaoOrchestratorChat({ 
  microDaoId, 
  orchestratorAgentId 
}: MicroDaoOrchestratorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Отримуємо оркестратора мікроДАО
  const { data: agentsData } = useQuery({
    queryKey: ['microdao-agents', microDaoId],
    queryFn: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/agents?team_id=${microDaoId}`);
        if (!response.ok) throw new Error('Failed to fetch agents');
        const data = await response.json();
        return data.items || data.agents || [];
      } catch (error) {
        // API недоступний - використовуємо fallback (порожній список)
        // Не логуємо помилку, оскільки це очікувана поведінка
        return [];
      }
    },
    enabled: !!microDaoId,
    retry: false, // Не повторювати запит при помилці
    staleTime: 60000,
  });

  // Знаходимо оркестратора
  const orchestrator = agentsData?.find((agent: any) => 
    agent.type === 'orchestrator' || 
    agent.role?.toLowerCase().includes('orchestrator') ||
    orchestratorAgentId === agent.id
  ) || agentsData?.[0]; // Якщо немає оркестратора, беремо першого агента

  // Визначаємо agentId для Router
  // Router очікує ID без префіксу 'agent-' (helion, greenfood, yaromir)
  let agentId = orchestratorAgentId || orchestrator?.id || 'microdao_orchestrator';
  
  // Якщо agentId починається з 'agent-', прибираємо префікс
  if (agentId.startsWith('agent-')) {
    agentId = agentId.replace(/^agent-/, '');
  }

  // Мутація для відправки повідомлення
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      // Router URL - використовуємо порт 9102 (Router), а не 8899 (API)
      const routerUrl = import.meta.env.VITE_NODE1_URL || 'http://144.76.224.179:9102';
      
      // Спробувати Router напряму (він доступний)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд таймаут (LLM може бути повільним)
        
        // Отримуємо system_prompt для агента (якщо є в orchestrator)
        const systemPrompt = getSystemPromptForAgent(agentId);
        
        const requestBody: any = {
          agent: agentId, // helion, greenfood, yaromir тощо (вже без префіксу)
          message: message,
          mode: 'chat',
        };
        
        // Додаємо system_prompt якщо є
        if (systemPrompt) {
          requestBody.payload = {
            context: {
              system_prompt: systemPrompt,
            },
          };
        }
        
        const response = await fetch(`${routerUrl}/route`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          const responseText = data.data?.text || data.data?.answer || data.response || 'Відповідь отримано';
          return {
            response: responseText,
            message: responseText,
          };
        }
        
        // Якщо статус не OK, пробуємо отримати деталі помилки
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || response.statusText || '';
        
        // Якщо це помилка провайдера (LLM недоступний) - показуємо зрозуміле повідомлення
        if (errorMessage.includes('Provider error') || 
            errorMessage.includes('connection attempts failed') ||
            errorMessage.includes('All connection attempts failed')) {
          return {
            response: 'LLM сервіс тимчасово недоступний. Модель не може обробити запит зараз. Перевірте налаштування LLM провайдерів на НОДА1.',
            message: 'LLM сервіс тимчасово недоступний. Модель не може обробити запит зараз. Перевірте налаштування LLM провайдерів на НОДА1.',
          };
        }
        
        // Для інших помилок HTTP також повертаємо fallback
        return {
          response: `Не вдалося отримати відповідь від агента (${response.status}). Спробуйте пізніше.`,
          message: `Не вдалося отримати відповідь від агента (${response.status}). Спробуйте пізніше.`,
        };
      } catch (error: any) {
        // Якщо це таймаут або помилка підключення - повертаємо fallback
        if (error?.name === 'AbortError') {
          return {
            response: 'Час очікування відповіді вичерпано. Спробуйте пізніше.',
            message: 'Час очікування відповіді вичерпано. Спробуйте пізніше.',
          };
        }
        
        if (error?.message?.includes('Failed to fetch') ||
            error?.message?.includes('ERR_CONNECTION_REFUSED') ||
            error?.message?.includes('ERR_NAME_NOT_RESOLVED')) {
          return {
            response: 'Сервіси агентів тимчасово недоступні. Спробуйте пізніше.',
            message: 'Сервіси агентів тимчасово недоступні. Спробуйте пізніше.',
          };
        }
        
        // Для інших помилок також повертаємо fallback
        return {
          response: 'Не вдалося отримати відповідь від агента. Спробуйте пізніше.',
          message: 'Не вдалося отримати відповідь від агента. Спробуйте пізніше.',
        };
      }
    },
    onSuccess: (data) => {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response || data.message || 'Відповідь отримано',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMessage]);
    },
    onError: () => {
      // Показуємо користувачу повідомлення про помилку
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Вибачте, не вдалося відправити повідомлення. Сервіси агентів тимчасово недоступні.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const handleSend = async () => {
    if (!input.trim() || sendMessageMutation.isPending) return;

    // Зберігаємо текст повідомлення перед очищенням input
    const messageText = input.trim();

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    sendMessageMutation.mutate(messageText); // Передаємо збережений текст
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Додаємо привітальне повідомлення
  useEffect(() => {
    if (messages.length === 0 && orchestrator) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `Привіт! Я ${orchestrator.name || 'оркестратор'} мікроДАО. Чим можу допомогти?`,
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
    }
  }, [orchestrator]);

  if (!orchestrator && !orchestratorAgentId) {
    return null; // Не показуємо чат якщо немає оркестратора
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">
              {orchestrator?.name || 'Оркестратор мікроДАО'}
            </h3>
            <p className="text-purple-100 text-xs">
              {orchestrator?.role || 'Головний агент мікроДАО'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="text-white hover:bg-white/20 p-1 rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Messages */}
      {!isMinimized && (
        <>
          <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="bg-purple-100 p-2 rounded-full">
                    <Bot className="w-5 h-5 text-purple-600" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
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
                {message.role === 'user' && (
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Bot className="w-5 h-5 text-blue-600" />
                  </div>
                )}
              </div>
            ))}
            {sendMessageMutation.isPending && (
              <div className="flex gap-3 justify-start">
                <div className="bg-purple-100 p-2 rounded-full">
                  <Bot className="w-5 h-5 text-purple-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Напишіть повідомлення..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={sendMessageMutation.isPending}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sendMessageMutation.isPending}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

