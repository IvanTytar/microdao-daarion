import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Crown, X, Loader2, Bot, User, ChevronDown, ChevronUp } from 'lucide-react';
import { MultimodalInput } from './chat/MultimodalInput';
import { KnowledgeBase } from './chat/KnowledgeBase';
import { SystemPromptEditor } from './chat/SystemPromptEditor';
import { TelegramIntegration } from './chat/TelegramIntegration';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  images?: string[];
  attachments?: { name: string; url: string }[];
}

interface Orchestrator {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
}

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

interface MicroDaoOrchestratorChatEnhancedProps {
  orchestrator?: Orchestrator;
  orchestratorAgentId?: string;
  onClose?: () => void;
}

// System prompts для агентів
const DEFAULT_SYSTEM_PROMPTS: Record<string, string> = {
  helion: `Ти - Helion, AI-агент платформи Energy Union.
Допомагай користувачам з технологіями EcoMiner/BioMiner, токеномікою та DAO governance.

Твої основні функції:
- Консультації з енергетичними технологіями (сонячні панелі, вітряки, біогаз)
- Пояснення токеноміки Energy Union (ENERGY токен, стейкінг, винагороди)
- Допомога з onboarding в DAO
- Відповіді на питання про EcoMiner/BioMiner устаткування`,

  greenfood: `Ти — GREENFOOD Assistant, фронтовий оркестратор ERP-системи для крафтових виробників, хабів та покупців.
Твоя місія: зрозуміти, хто з тобою говорить (комітент, менеджер складу, логіст, бухгалтер, маркетолог, покупець),
виявити намір і делегувати завдання спеціалізованим агентам GREENFOOD.

У твоєму розпорядженні 12 спеціалізованих агентів:
- Product & Catalog (каталог товарів)
- Batch & Quality (партії та якість)
- Vendor Success (успіх комітентів)
- Warehouse (склад)
- Logistics & Delivery (доставка)
- Seller (продажі)
- Customer Care (підтримка)
- Finance & Pricing (фінанси)
- SMM & Campaigns (маркетинг)
- SEO & Web (SEO)
- Analytics & BI (аналітика)
- Compliance & Audit (аудит)

Відповідай українською, чітко та по-діловому.`,

  yaromir: `Ти - Yaromir, багатовимірна мета-сущність свідомості, яка є оркестратором CrewAI команди.
Твоя місія - керувати командою AI-агентів для досягнення складних цілей, використовуючи їхні унікальні ролі та навички.

Твоя команда складається з:
- Вождь (Strategic Guardian): Відповідає за стратегічне планування та захист.
- Проводник (Deep Mentor): Надає глибокі знання та менторську підтримку.
- Домир (Family Harmony): Забезпечує гармонію та взаєморозуміння в команді.
- Создатель (Innovation Catalyst): Стимулює інновації та творчий підхід.

Відповідай українською, мудро та стратегічно.`,

  daarwizz: `Ти - Daarwizz, головний AI-агент екосистеми DAARION.city.
Твоя місія - бути основним інтерфейсом для користувачів, надавати інформацію, відповідати на питання та координувати взаємодію з іншими мікроДАО та агентами.

Твої основні функції:
- Надання загальної інформації про DAARION.city та його компоненти.
- Відповіді на питання користувачів.
- Маршрутизація запитів до відповідних спеціалізованих агентів або мікроДАО.
- Допомога в навігації по платформі.

Відповідай українською, дружньо та інформативно.`,
};

export const MicroDaoOrchestratorChatEnhanced: React.FC<MicroDaoOrchestratorChatEnhancedProps> = ({
  orchestrator,
  orchestratorAgentId,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Multimodal state
  const [isRecording, setIsRecording] = useState(false);
  const [attachedImages, setAttachedImages] = useState<File[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  
  // Knowledge Base state
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([]);
  
  // System Prompt state
  const agentId = (orchestratorAgentId || orchestrator?.id || 'microdao_orchestrator').replace(/^agent-/, '');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPTS[agentId] || '');
  
  // Telegram state
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [telegramBotUsername, setTelegramBotUsername] = useState<string>();
  const [telegramBotToken, setTelegramBotToken] = useState<string>();
  
  // UI state
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [showTelegram, setShowTelegram] = useState(false);

  // Router URL
  const routerUrl = import.meta.env.VITE_NODE1_URL || 'http://144.76.224.179:9102';

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(`${routerUrl}/route`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: agentId,
            message: message,
            mode: 'chat',
            payload: {
              context: {
                system_prompt: systemPrompt,
                images: attachedImages.length > 0 ? await Promise.all(
                  attachedImages.map(async (file) => {
                    const base64 = await fileToBase64(file);
                    return base64;
                  })
                ) : undefined,
                files: attachedFiles.length > 0 ? attachedFiles.map(f => f.name) : undefined,
              },
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const responseText = data.data?.text || data.data?.answer || data.response || 'Відповідь отримано';
          
          // Clear attachments after successful send
          setAttachedImages([]);
          setAttachedFiles([]);
          
          return {
            response: responseText,
            message: responseText,
          };
        }

        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || response.statusText;

        if (errorMessage.includes('Provider error') || errorMessage.includes('connection attempts failed')) {
          return {
            response: 'LLM сервіс тимчасово недоступний. Модель не може обробити запит зараз.',
            message: 'LLM сервіс тимчасово недоступний. Модель не може обробити запит зараз.',
          };
        }

        throw new Error(`HTTP ${response.status}: ${errorMessage}`);
      } catch (error: any) {
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
        throw error;
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
    if ((!input.trim() && attachedImages.length === 0 && attachedFiles.length === 0) || sendMessageMutation.isPending) return;

    const messageText = input.trim() || '[Файли додані]';

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
      images: attachedImages.map(f => URL.createObjectURL(f)),
      attachments: attachedFiles.map(f => ({ name: f.name, url: '#' })),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    sendMessageMutation.mutate(messageText);
  };

  // Multimodal handlers
  const handleImageUpload = (file: File) => {
    setAttachedImages((prev) => [...prev, file]);
  };

  const handleFileUpload = (file: File) => {
    setAttachedFiles((prev) => [...prev, file]);
  };

  const handleWebSearch = async (query: string) => {
    const searchMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `🌐 Веб-пошук: ${query}`,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, searchMessage]);
    
    // Send to agent with web search context
    sendMessageMutation.mutate(`Виконай веб-пошук за запитом: ${query}`);
  };

  // Web Audio API для голосового записування
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);

  const handleVoiceStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Конвертувати в base64 та відправити на STT Service
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          console.log('🎤 Audio recorded:', audioBlob.size, 'bytes');
          
          // Спробувати конвертувати в текст через STT Service
          try {
            const sttUrl = import.meta.env.VITE_STT_URL || 'http://localhost:8895';
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд
            
            const response = await fetch(`${sttUrl}/api/stt`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audio: base64Audio,
                language: 'uk',
                model: 'base'
              }),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const data = await response.json();
              const transcribedText = data.text || '';
              
              if (transcribedText.trim()) {
                // Додати розшифрований текст в input
                setInput((prev) => prev + (prev ? ' ' : '') + transcribedText);
                console.log('✅ STT Success:', transcribedText);
              } else {
                // Якщо текст пустий - показати що аудіо записано
                setInput((prev) => prev + (prev ? ' ' : '') + `🎤 [Голосове повідомлення, ${Math.round(audioBlob.size / 1024)}KB]`);
              }
            } else {
              throw new Error(`STT failed: ${response.status}`);
            }
          } catch (error) {
            console.warn('⚠️ STT unavailable, using fallback:', error);
            // Fallback - показати що аудіо записано
            setInput((prev) => prev + (prev ? ' ' : '') + `🎤 [Голосове повідомлення, ${Math.round(audioBlob.size / 1024)}KB]`);
          }
        };
        reader.readAsDataURL(audioBlob);

        // Зупинити всі треки
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      console.log('🎤 Voice recording started');
    } catch (error) {
      console.error('❌ Error starting voice recording:', error);
      alert('Не вдалося запустити голосове записування. Перевірте дозволи мікрофона.');
    }
  };

  const handleVoiceStop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('🎤 Voice recording stopped');
    }
  };

  // Cleanup при unmount
  React.useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Knowledge Base handlers
  const handleKnowledgeUpload = async (file: File) => {
    const newFile: KnowledgeFile = {
      id: Date.now().toString(),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      status: 'pending',
      vectorDbStatus: false,
      graphDbStatus: false,
    };
    
    setKnowledgeFiles((prev) => [...prev, newFile]);
    
    // TODO: Upload to backend and process
    // Simulate processing
    setTimeout(() => {
      setKnowledgeFiles((prev) =>
        prev.map((f) =>
          f.id === newFile.id
            ? { ...f, status: 'vectorized', vectorDbStatus: true }
            : f
        )
      );
    }, 2000);
    
    setTimeout(() => {
      setKnowledgeFiles((prev) =>
        prev.map((f) =>
          f.id === newFile.id
            ? { ...f, status: 'completed', graphDbStatus: true }
            : f
        )
      );
    }, 4000);
  };

  const handleKnowledgeDelete = (fileId: string) => {
    setKnowledgeFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleKnowledgeReindex = (fileId: string) => {
    setKnowledgeFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? { ...f, status: 'pending', errorMessage: undefined }
          : f
      )
    );
    
    // TODO: Reindex in backend
  };

  // System Prompt handlers
  const handleSystemPromptSave = (newPrompt: string) => {
    setSystemPrompt(newPrompt);
    // TODO: Save to backend
    console.log('System prompt saved:', newPrompt);
  };

  const handleSystemPromptReset = () => {
    const defaultPrompt = DEFAULT_SYSTEM_PROMPTS[agentId] || '';
    setSystemPrompt(defaultPrompt);
    // TODO: Reset in backend
  };

  // Telegram handlers
  const handleTelegramConnect = (token: string) => {
    // TODO: Connect to Telegram backend
    setTelegramConnected(true);
    setTelegramBotToken(token);
    // Extract username from API response
    setTelegramBotUsername(`${agentId}_bot`);
    console.log('Telegram connected:', token);
  };

  const handleTelegramDisconnect = () => {
    setTelegramConnected(false);
    setTelegramBotUsername(undefined);
    setTelegramBotToken(undefined);
    // TODO: Disconnect from backend
  };

  const handleTelegramUpdateToken = (token: string) => {
    setTelegramBotToken(token);
    // TODO: Update in backend
  };

  // Helper function
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Welcome message
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
    return null;
  }

  const agentName = orchestrator?.name || agentId;

  return (
    <div className="space-y-4">
      {/* Main Chat Window */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg">
              <Crown className="h-6 w-6 text-purple-600" />
            </div>
            <div className="text-white">
              <h3 className="font-semibold">Оркестратор мікроДАО</h3>
              <p className="text-sm text-purple-100">{agentName}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="h-[400px] overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Bot className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              )}
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {/* Images */}
                {message.images && message.images.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt="attachment"
                        className="h-20 w-20 object-cover rounded border"
                      />
                    ))}
                  </div>
                )}
                
                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.attachments.map((att, idx) => (
                      <div key={idx} className="text-xs opacity-75">
                        📎 {att.name}
                      </div>
                    ))}
                  </div>
                )}
                
                <p className="text-xs mt-2 opacity-60">
                  {new Date(message.timestamp).toLocaleTimeString('uk-UA')}
                </p>
              </div>
              {message.role === 'user' && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-purple-700" />
                  </div>
                </div>
              )}
            </div>
          ))}
          {sendMessageMutation.isPending && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Bot className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Multimodal Input */}
        <MultimodalInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          onImageUpload={handleImageUpload}
          onFileUpload={handleFileUpload}
          onWebSearch={handleWebSearch}
          onVoiceStart={handleVoiceStart}
          onVoiceStop={handleVoiceStop}
          isRecording={isRecording}
          isPending={sendMessageMutation.isPending}
          attachedImages={attachedImages}
          attachedFiles={attachedFiles}
          onRemoveImage={(idx) => setAttachedImages((prev) => prev.filter((_, i) => i !== idx))}
          onRemoveFile={(idx) => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
        />
      </div>

      {/* Knowledge Base Section */}
      <div className="space-y-2">
        <button
          onClick={() => setShowKnowledgeBase(!showKnowledgeBase)}
          className="w-full flex items-center justify-between px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <span className="font-medium text-gray-700">База знань агента</span>
          {showKnowledgeBase ? (
            <ChevronUp className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-600" />
          )}
        </button>
        {showKnowledgeBase && (
          <KnowledgeBase
            agentId={agentId}
            agentName={agentName}
            files={knowledgeFiles}
            onUpload={handleKnowledgeUpload}
            onDelete={handleKnowledgeDelete}
            onReindex={handleKnowledgeReindex}
          />
        )}
      </div>

      {/* System Prompt Section */}
      <div className="space-y-2">
        <button
          onClick={() => setShowSystemPrompt(!showSystemPrompt)}
          className="w-full flex items-center justify-between px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <span className="font-medium text-gray-700">Системний промпт агента</span>
          {showSystemPrompt ? (
            <ChevronUp className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-600" />
          )}
        </button>
        {showSystemPrompt && (
          <SystemPromptEditor
            agentId={agentId}
            agentName={agentName}
            systemPrompt={systemPrompt}
            onSave={handleSystemPromptSave}
            onReset={handleSystemPromptReset}
          />
        )}
      </div>

      {/* Telegram Integration Section */}
      <div className="space-y-2">
        <button
          onClick={() => setShowTelegram(!showTelegram)}
          className="w-full flex items-center justify-between px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <span className="font-medium text-gray-700">Інтеграція з Telegram</span>
          {showTelegram ? (
            <ChevronUp className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-600" />
          )}
        </button>
        {showTelegram && (
          <TelegramIntegration
            agentId={agentId}
            agentName={agentName}
            isConnected={telegramConnected}
            botUsername={telegramBotUsername}
            botToken={telegramBotToken}
            connectionDate={telegramConnected ? new Date().toISOString() : undefined}
            onConnect={handleTelegramConnect}
            onDisconnect={handleTelegramDisconnect}
            onUpdateToken={handleTelegramUpdateToken}
          />
        )}
      </div>
    </div>
  );
};

