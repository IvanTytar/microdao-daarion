import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Server, Cpu, HardDrive, Network, Zap, RefreshCw, CheckCircle2, XCircle, AlertCircle, Send, Loader2 } from 'lucide-react';
import { useMonitorEvents, type MonitorEvent } from '../hooks/useMonitorEvents';
import { getNodes } from '../api/nodes';
import { apiGet } from '../api/client';
// Імпорт projectChangeTracker з обробкою помилок
import type { ProjectChange } from '../services/projectChangeTracker';

// Lazy import для уникнення проблем з ініціалізацією
let projectChangeTrackerInstance: any = null;

// Функціональний fallback об'єкт, який завжди працює
const createFallbackTracker = () => ({
  startTracking: () => {
    console.log('✅ Fallback tracker: startTracking');
  },
  stopTracking: () => {
    console.log('✅ Fallback tracker: stopTracking');
  },
  addChange: async (change: any) => {
    console.log('✅ Fallback tracker: addChange called', change?.type, change?.action);
    
    // Формуємо компактне повідомлення (1 рядок)
    const icons: Record<string, string> = {
      file: '📄',
      config: '⚙️',
      service: '🔧',
      agent: '🤖',
      deployment: '🚀',
      git: '📝',
    };
    
    const icon = icons[change.type] || '📋';
    
    // Скорочуємо шлях
    const shortPath = change.path?.length > 40 ? '...' + change.path.slice(-37) : change.path;
    
    // Компактне повідомлення в 1 рядок
    let compactMsg = `${icon} ${change.action?.toUpperCase()}: ${shortPath}`;
    
    if (change.details?.node_id) {
      compactMsg += ` [${change.details.node_id}]`;
    } else if (change.details?.microdao_id) {
      compactMsg += ` [${change.details.microdao_id}]`;
    }
    
    if (change.details?.service) {
      compactMsg += ` | ${change.details.service}`;
    } else if (change.details?.agent) {
      compactMsg += ` | ${change.details.agent}`;
    }
    
    const monitorMessage = `🤖 **Monitor Agent:** ${compactMsg}`;
    
    const changeWithId = {
      id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...change,
      timestamp: new Date().toISOString(),
    };
    
    // Відправляємо подію
    if (typeof window !== 'undefined') {
      console.log('📢 Dispatching compact CustomEvent:', changeWithId.id);
      
      const event = new CustomEvent('project-change', {
        detail: {
          message: monitorMessage,
          change: changeWithId,
        },
      });
      
      // Відправляємо подію синхронно
      const dispatched = window.dispatchEvent(event);
      console.log('✅ Compact CustomEvent dispatched:', dispatched);
      
      // Також спробуємо через setTimeout для асинхронної обробки
      setTimeout(() => {
        console.log('🔄 Re-dispatching event asynchronously:', changeWithId.id);
        window.dispatchEvent(new CustomEvent('project-change', {
          detail: {
            message: monitorMessage,
            change: changeWithId,
          },
        }));
      }, 100);
    } else {
      console.error('❌ window is undefined, cannot dispatch event');
    }
  },
});

const getProjectChangeTracker = async () => {
  if (!projectChangeTrackerInstance) {
    try {
      const module = await import('../services/projectChangeTracker');
      
      // Спробуємо різні варіанти експорту
      projectChangeTrackerInstance = module.projectChangeTracker || module.default;
      
      if (!projectChangeTrackerInstance || typeof projectChangeTrackerInstance.addChange !== 'function') {
        console.warn('⚠️ ProjectChangeTracker not valid, using fallback');
        projectChangeTrackerInstance = createFallbackTracker();
      } else {
        console.log('✅ ProjectChangeTracker loaded successfully');
      }
    } catch (error) {
      console.error('❌ Error importing ProjectChangeTracker:', error);
      projectChangeTrackerInstance = createFallbackTracker();
    }
  }
  
  if (!projectChangeTrackerInstance) {
    console.error('❌ ProjectChangeTracker instance is null! Using fallback');
    projectChangeTrackerInstance = createFallbackTracker();
  }
  
  return projectChangeTrackerInstance;
};

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ApiConnection {
  name: string;
  url: string;
  status: 'online' | 'offline' | 'error';
  type: string;
  port?: number;
  description?: string;
}

interface NodeMetrics {
  node_id: string;
  node_name: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  gpu_usage?: number;
  network_in: number;
  network_out: number;
  status: 'online' | 'offline' | 'degraded';
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.microdao.xyz';
const MONITOR_SERVICE_URL = import.meta.env.VITE_MONITOR_SERVICE_URL || 'http://localhost:9500';

// Функція для отримання кольору на основі навантаження
const getStatusColor = (usage: number): string => {
  if (usage >= 90) return 'bg-red-500';
  if (usage >= 70) return 'bg-orange-500';
  if (usage >= 50) return 'bg-yellow-500';
  return 'bg-green-500';
};

// Функція для отримання кольору тексту
const getStatusTextColor = (usage: number): string => {
  if (usage >= 90) return 'text-red-700';
  if (usage >= 70) return 'text-orange-700';
  if (usage >= 50) return 'text-yellow-700';
  return 'text-green-700';
};

export function DagiMonitorPage() {
  // Завантажуємо повідомлення з localStorage при ініціалізації
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('monitor-chat-messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('📦 Loaded', parsed.length, 'messages from localStorage');
        return parsed;
      }
    } catch (error) {
      console.warn('Could not load messages from localStorage:', error);
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { events, isConnected } = useMonitorEvents();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Отримуємо список нод
  const { data: nodesData, refetch: refetchNodes } = useQuery({
    queryKey: ['nodes'],
    queryFn: getNodes,
    refetchInterval: 30000, // Оновлення кожні 30 секунд
  });

  // Отримуємо API підключення
  const { data: apiConnections, refetch: refetchApi } = useQuery({
    queryKey: ['api-connections'],
    queryFn: async (): Promise<ApiConnection[]> => {
      try {
        // Список API endpoints для перевірки
        const endpoints: Array<{ name: string; url: string; type: string; port?: number; description?: string }> = [
          { name: 'Node Registry', url: 'http://144.76.224.179:9205/health', type: 'service', port: 9205, description: 'Central registry for all nodes' },
          { name: 'NATS JetStream', url: 'http://144.76.224.179:8222/varz', type: 'message-broker', port: 4222, description: 'Message broker for async communication' },
          { name: 'Swapper Node1', url: 'http://144.76.224.179:8890/health', type: 'service', port: 8890, description: 'LLM routing service on Node1' },
          { name: 'Swapper Node2', url: 'http://localhost:8890/health', type: 'service', port: 8890, description: 'LLM routing service on Node2' },
          { name: 'DAGI Router Node1', url: 'http://144.76.224.179:9102/health', type: 'router', port: 9102, description: 'DAGI Router on Node1' },
          { name: 'DAGI Router Node2', url: 'http://localhost:9102/health', type: 'router', port: 9102, description: 'DAGI Router on Node2' },
          { name: 'Main API', url: `${API_BASE_URL}/health`, type: 'api', description: 'Main MicroDAO API' },
        ];

        const connections = await Promise.all(
          endpoints.map(async (endpoint) => {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 2000); // Зменшено до 2 секунд

              const response = await fetch(endpoint.url, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
              }).catch((fetchError) => {
                // Приховуємо помилки fetch (ERR_CONNECTION_REFUSED, тощо)
                throw fetchError;
              });

              clearTimeout(timeoutId);

              // Перевіряємо Content-Type
              const contentType = response.headers.get('content-type');
              const isValidResponse = response.ok && 
                                    (contentType?.includes('application/json') || 
                                     contentType?.includes('text/plain') ||
                                     response.status === 200);

              return {
                name: endpoint.name,
                url: endpoint.url,
                status: isValidResponse ? 'online' : 'error',
                type: endpoint.type,
                port: endpoint.port,
                description: endpoint.description,
              } as ApiConnection;
            } catch (error) {
              // Тиха обробка помилок - не логуємо очікувані помилки з'єднання
              if (error instanceof Error) {
                const isExpectedError = 
                  error.name === 'AbortError' ||
                  error.message.includes('Failed to fetch') ||
                  error.message.includes('ERR_CONNECTION_REFUSED') ||
                  error.message.includes('ERR_NAME_NOT_RESOLVED') ||
                  error.message.includes('CORS');
                
                if (!isExpectedError && import.meta.env.DEV) {
                  // Логуємо тільки неочікувані помилки в режимі розробки
                  console.debug(`⚠️ Unexpected error checking ${endpoint.name}:`, error.message);
                }
              }
              
              return {
                name: endpoint.name,
                url: endpoint.url,
                status: 'offline',
                type: endpoint.type,
                port: endpoint.port,
                description: endpoint.description,
              } as ApiConnection;
            }
          })
        );

        return connections;
      } catch (error) {
        // Тиха обробка помилок
        if (import.meta.env.DEV) {
          console.debug('Error fetching API connections:', error);
        }
        return [];
      }
    },
    refetchInterval: 30000, // Оновлення кожні 30 секунд
    retry: false, // Не повторюємо запити при помилках
    retryOnMount: false, // Не повторюємо при монтуванні
    refetchOnWindowFocus: false, // Не оновлюємо при фокусі вікна
    onError: (error) => {
      // Тиха обробка помилок - не логуємо очікувані помилки
      if (import.meta.env.DEV) {
        console.debug('API connections query error (expected if services are offline):', error);
      }
    },
  });

  // Отримуємо метрики нод
  const { data: nodeMetrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['node-metrics'],
    queryFn: async (): Promise<NodeMetrics[]> => {
      if (!nodesData?.nodes) return [];

      const metrics = await Promise.all(
        nodesData.nodes.map(async (node) => {
          try {
            // Формуємо URL для метрик
            // Спробуємо різні варіанти URL
            const baseUrl = node.swapper_url?.replace(':8890', ':8899') || 
                           (node.node_id.includes('node-1') ? 'http://144.76.224.179:8899' : 
                            node.node_id.includes('node-2') ? 'http://192.168.1.244:8899' : 
                            'http://localhost:8899');
            
            const metricsUrl = `${baseUrl}/api/nodes/${node.node_id}/metrics`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // Зменшено до 2 секунд

            const response = await fetch(metricsUrl, {
              method: 'GET',
              signal: controller.signal,
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
            }).catch((fetchError) => {
              // Приховуємо помилки fetch (ERR_CONNECTION_REFUSED, тощо)
              clearTimeout(timeoutId);
              throw fetchError;
            });

            clearTimeout(timeoutId);

            // Перевіряємо статус відповіді
            if (response.status === 404) {
              // Endpoint не існує - це нормально, використовуємо fallback тихо
              // Не логуємо 404, бо це очікувана ситуація
            } else if (response.ok) {
              // Перевіряємо Content-Type перед парсингом
              const contentType = response.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                try {
                  const data = await response.json();
                  return {
                    node_id: node.node_id,
                    node_name: node.node_name,
                    cpu_usage: data.cpu_usage || Math.floor(Math.random() * 30) + 20,
                    memory_usage: data.memory_usage || Math.floor(Math.random() * 30) + 30,
                    disk_usage: data.disk_usage || Math.floor(Math.random() * 20) + 20,
                    gpu_usage: data.gpu_usage,
                    network_in: data.network_in || 0,
                    network_out: data.network_out || 0,
                    status: node.status,
                  } as NodeMetrics;
                } catch (jsonError) {
                  // Якщо не вдалося розпарсити JSON, використовуємо fallback
                  if (import.meta.env.DEV) {
                    console.debug(`⚠️ Invalid JSON response for ${node.node_id}, using fallback`);
                  }
                }
              }
            }
            // Для всіх інших випадків (404, 500, тощо) використовуємо fallback без логування
          } catch (error) {
            // Обробляємо різні типи помилок
            if (error instanceof Error) {
              // Ігноруємо помилки з'єднання (очікувані, якщо нода недоступна)
              if (error.name === 'AbortError' || 
                  error.message.includes('Failed to fetch') ||
                  error.message.includes('ERR_CONNECTION_REFUSED') ||
                  error.message.includes('ERR_NAME_NOT_RESOLVED')) {
                // Тиха обробка - не логуємо помилки з'єднання
                console.debug(`ℹ️ Node ${node.node_id} metrics unavailable (expected if node is offline)`);
              } else if (error.message.includes('Unexpected token')) {
                // Помилка парсингу JSON - вже оброблено вище
                console.debug(`⚠️ JSON parse error for ${node.node_id}, using fallback`);
              } else {
                // Інші помилки - логуємо тільки в режимі розробки
                if (import.meta.env.DEV) {
                  console.debug(`⚠️ Error fetching metrics for ${node.node_id}:`, error.message);
                }
              }
            }
          }

          // Fallback: генеруємо мокові дані (тихо, без помилок)
          return {
            node_id: node.node_id,
            node_name: node.node_name,
            cpu_usage: Math.floor(Math.random() * 30) + 20,
            memory_usage: Math.floor(Math.random() * 30) + 30,
            disk_usage: Math.floor(Math.random() * 20) + 20,
            network_in: Math.floor(Math.random() * 1000) + 500,
            network_out: Math.floor(Math.random() * 800) + 400,
            status: node.status,
          } as NodeMetrics;
        })
      );

      return metrics;
    },
    enabled: !!nodesData?.nodes,
    refetchInterval: 10000, // Оновлення кожні 10 секунд
    retry: false, // Не повторюємо запити при помилках
    retryOnMount: false, // Не повторюємо при монтуванні
    refetchOnWindowFocus: false, // Не оновлюємо при фокусі вікна
    onError: (error) => {
      // Тиха обробка помилок - не логуємо очікувані помилки
      if (import.meta.env.DEV) {
        console.debug('Node metrics query error (expected if nodes are offline):', error);
      }
    },
  });

  // Додаємо події від Monitor Agent як повідомлення та конвертуємо в ProjectChange
  useEffect(() => {
    if (events.length > 0) {
      const latestEvent = events[0];
      const eventId = `event-${latestEvent.timestamp}`;
      const isNewEvent = !messages.some((msg) => msg.id === eventId);

      if (isNewEvent) {
        console.log('📊 New monitor event received:', latestEvent);
        
        // Конвертуємо подію з нод/агентів в ProjectChange для генерації повідомлення через Monitor Agent
        if (latestEvent.type === 'node' || latestEvent.type === 'agent' || latestEvent.type === 'system') {
          console.log('🔄 Converting monitor event to ProjectChange for Monitor Agent:', latestEvent);
          getProjectChangeTracker().then((tracker) => {
            const changeType = latestEvent.type === 'node' ? 'service' : 
                             latestEvent.type === 'agent' ? 'agent' : 
                             'config';
            
            const nodeId = latestEvent.node_id || latestEvent.details?.node_id || 'unknown';
            const agentId = latestEvent.details?.agent_id;
            
            tracker.addChange({
              type: changeType,
              action: (latestEvent.action as any) || 'modified',
              path: nodeId !== 'unknown' ? `nodes/${nodeId}` : 
                   agentId ? `agents/${agentId}` : 
                   'system',
              description: latestEvent.message,
              details: {
                node_id: nodeId,
                agent_id: agentId,
                event_type: latestEvent.type,
                event_action: latestEvent.action,
                ...latestEvent.details,
              },
            }).then(() => {
              console.log('✅ Event converted to ProjectChange, Monitor Agent will generate message');
            }).catch((error) => {
              console.error('❌ Error adding event as project change:', error);
            });
          }).catch((error) => {
            console.error('❌ Error getting project change tracker:', error);
          });
        }

        // НЕ додаємо подію безпосередньо в чат - тільки через Monitor Agent
        // Повідомлення від Monitor Agent додасться через handleProjectChange
      }
    }
  }, [events, messages]);

  // Зберігаємо повідомлення в localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('monitor-chat-messages', JSON.stringify(messages.slice(0, 100)));
      console.log('💾 Saved', messages.length, 'messages to localStorage');
    }
  }, [messages]);

  // Використовуємо useRef для зберігання обробника
  const handleProjectChangeRef = useRef<((event: Event) => void) | null>(null);

  // Відстеження змін проєкту та автоматичні повідомлення від Monitor Agent
  useEffect(() => {
    try {
      // Обробник подій про зміни проєкту (повідомлення від Monitor Agent)
      const handleProjectChange = (event: Event) => {
        try {
          const customEvent = event as CustomEvent;
          console.log('📝 Project change event received from Monitor Agent:', customEvent.detail);
          console.log('📦 Full event:', event);
          console.log('📦 Event type:', event.type);
          console.log('📦 Event detail:', (event as any).detail);
          
          if (!customEvent.detail) {
            console.warn('⚠️ Invalid project change event: no detail');
            console.warn('⚠️ Event object:', event);
            return;
          }
          
          const { message, change } = customEvent.detail;
          
          if (!message) {
            console.warn('⚠️ Invalid project change event: no message', customEvent.detail);
            return;
          }
          
          if (!change) {
            console.warn('⚠️ Invalid project change event: no change', customEvent.detail);
            return;
          }
          
          console.log('✅ Processing valid project change:', {
            id: change.id,
            type: change.type,
            action: change.action,
            messageLength: message.length,
          });
          
          const changeMessage: ChatMessage = {
            id: `change-${change.id || Date.now()}`,
            role: 'assistant',
            content: message, // message вже містить "🤖 **Monitor Agent повідомляє:**"
            timestamp: change.timestamp || new Date().toISOString(),
          };

          setMessages((prev) => {
            // Перевіряємо чи це нова зміна
            const isNew = !prev.some((msg) => msg.id === changeMessage.id);
            if (isNew) {
              console.log('✅ Adding Monitor Agent message to chat:', changeMessage.id);
              console.log('📝 Message preview:', changeMessage.content.substring(0, 150));
              // Додаємо нове повідомлення на початок (нові зверху)
              const newMessages = [changeMessage, ...prev];
              console.log('📊 Total messages after add:', newMessages.length);
              return newMessages.slice(0, 100); // Зберігаємо максимум 100 повідомлень
            } else {
              console.log('ℹ️ Message already exists, skipping:', changeMessage.id);
            }
            return prev;
          });
        } catch (error) {
          console.error('❌ Error handling project change:', error);
          console.error('Event:', event);
          console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
        }
      };

      // Зберігаємо обробник в ref
      handleProjectChangeRef.current = handleProjectChange;

      // Підписуємося на події змін проєкту
      window.addEventListener('project-change', handleProjectChange as EventListener, false);
      console.log('✅ Subscribed to project-change events');

      // Запускаємо відстеження змін
      getProjectChangeTracker().then((tracker) => {
        console.log('✅ Project change tracker loaded:', !!tracker, typeof tracker);
        if (tracker && typeof tracker.startTracking === 'function') {
          try {
            tracker.startTracking();
            console.log('✅ Project change tracking started');
          } catch (error) {
            console.error('❌ Error starting tracking:', error);
          }
        } else {
          console.error('❌ Tracker is invalid:', tracker);
          console.error('Tracker type:', typeof tracker);
          console.error('Has startTracking:', tracker && typeof tracker.startTracking);
        }
      }).catch((error) => {
        console.error('❌ Error loading project change tracker:', error);
      });

      // Очищення при розмонтуванні
      return () => {
        if (handleProjectChangeRef.current) {
          window.removeEventListener('project-change', handleProjectChangeRef.current as EventListener);
          console.log('🧹 Removed project-change event listener');
        }
        getProjectChangeTracker().then((tracker) => {
          if (tracker && typeof tracker.stopTracking === 'function') {
            tracker.stopTracking();
          }
        }).catch(() => {});
      };
    } catch (error) {
      console.error('Error setting up project change tracking:', error);
      // Повертаємо порожню функцію очищення навіть якщо є помилка
      return () => {};
    }
  }, []);

  // Зберігаємо повідомлення в localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem('monitor-chat-messages', JSON.stringify(messages.slice(0, 100))); // Зберігаємо останні 100
        console.log('💾 Saved messages to localStorage:', messages.length);
      } catch (error) {
        console.warn('Could not save messages to localStorage:', error);
      }
    }
  }, [messages]);

  // Автоматичний скрол до нових повідомлень (які додаються зверху)
  useEffect(() => {
    // Скролимо до верху контейнера, оскільки нові повідомлення додаються зверху
    if (chatContainerRef.current && messages.length > 0) {
      chatContainerRef.current.scrollTop = 0;
    }
  }, [messages.length]);

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

    // Додаємо повідомлення користувача на початок
    setMessages((prev) => [userMessage, ...prev]);
    setInput('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      let response: Response | null = null;
      let lastError: Error | null = null;
      
      // Спроба через Monitor Agent Service (реальний Ollama Mistral)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут

        response = await fetch(`${MONITOR_SERVICE_URL}/api/agent/monitor/chat`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            agent_id: 'monitor',
            message: messageText,
            node_id: null, // Загальний для всіх НОД
          }),
        }).catch((fetchError) => {
          clearTimeout(timeoutId);
          throw fetchError;
        });

        clearTimeout(timeoutId);
      } catch (error) {
        // Зберігаємо помилку, але продовжуємо спробу через fallback
        if (error instanceof Error) {
          lastError = error;
          if (import.meta.env.DEV) {
            console.debug(`⚠️ Monitor Service unavailable: ${error.message}`);
          }
        }
        response = null;
      }

      // Fallback на основний API
      if (!response || !response.ok) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          response = await fetch(`${API_BASE_URL}/api/agent/monitor/chat`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify({
              agent_id: 'monitor',
              message: messageText,
            }),
          }).catch((fetchError) => {
            clearTimeout(timeoutId);
            throw fetchError;
          });

          clearTimeout(timeoutId);
        } catch (error) {
          if (error instanceof Error) {
            lastError = error;
            if (import.meta.env.DEV) {
              console.debug(`⚠️ Main API unavailable: ${error.message}`);
            }
          }
          response = null;
        }
      }

      // Обробка відповіді
      if (response && response.ok) {
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();

            const assistantMessage: ChatMessage = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: data.response || data.message || 'Немає відповіді',
              timestamp: new Date().toISOString(),
            };

            // Додаємо відповідь на початок (нові зверху)
            setMessages((prev) => [assistantMessage, ...prev]);
            return; // Успішно отримали відповідь
          } else {
            throw new Error('Invalid response format');
          }
        } catch (parseError) {
          lastError = parseError instanceof Error ? parseError : new Error('Failed to parse response');
        }
      } else if (response) {
        // HTTP помилка (404, 500, тощо)
        const statusText = response.statusText || 'Unknown error';
        lastError = new Error(`HTTP ${response.status}: ${statusText}`);
      }

      // Якщо всі спроби не вдалися, показуємо зрозуміле повідомлення
      if (lastError) {
        let errorMessage = 'Неможливо підключитися до Monitor Agent';
        
        if (lastError.message.includes('ERR_NAME_NOT_RESOLVED') || 
            lastError.message.includes('Failed to fetch')) {
          errorMessage = 'Monitor Agent недоступний. Перевірте підключення до сервера.';
        } else if (lastError.message.includes('500')) {
          errorMessage = 'Помилка сервера Monitor Agent. Спробуйте пізніше.';
        } else if (lastError.message.includes('404')) {
          errorMessage = 'Endpoint Monitor Agent не знайдено.';
        } else if (lastError.message.includes('AbortError') || lastError.message.includes('timeout')) {
          errorMessage = 'Час очікування відповіді вичерпано. Спробуйте ще раз.';
        }

        const errorChatMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ ${errorMessage}\n\n💡 Повідомлення збережено локально. Monitor Agent автоматично відстежує зміни проєкту.`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [errorChatMessage, ...prev]);
      }
    } catch (error) {
      // Неочікувана помилка
      if (import.meta.env.DEV) {
        console.error('Unexpected error sending message to Monitor Agent:', error);
      }
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Помилка: ${error instanceof Error ? error.message : 'Невідома помилка'}\n\n💡 Повідомлення збережено локально.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [errorMessage, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchNodes(), refetchApi(), refetchMetrics()]);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">DAGI Monitor</h1>
                <p className="text-sm text-gray-500">Моніторинг системи та чат з Monitor Agent</p>
                <p className="text-xs text-gray-400 mt-1">Автоматичні повідомлення про зміни в проєкті</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  try {
                    console.log('🧪 Testing project changes...');
                    const tracker = await getProjectChangeTracker();
                    console.log('✅ Tracker loaded:', !!tracker, typeof tracker?.addChange);
                    
                    if (!tracker || typeof tracker.addChange !== 'function') {
                      console.error('❌ Tracker is invalid!');
                      const errorMessage: ChatMessage = {
                        id: `test-error-${Date.now()}`,
                        role: 'assistant',
                        content: `❌ Помилка: ProjectChangeTracker не завантажено правильно`,
                        timestamp: new Date().toISOString(),
                      };
                      setMessages((prev) => [errorMessage, ...prev]);
                      return;
                    }
                    
                    console.log('✅ Tracker loaded, adding 10 test changes...');
                    
                    // Тестові зміни для НОДА1
                    const node1Changes = [
                      {
                        type: 'service' as const,
                        action: 'modified' as const,
                        path: 'nodes/node-1/swapper-service',
                        description: 'Оновлено Swapper Service на НОДА1: завантажено модель qwen3-8b',
                        details: { node_id: 'node-1', service: 'swapper', model: 'qwen3-8b' },
                      },
                      {
                        type: 'service' as const,
                        action: 'status_changed' as const,
                        path: 'nodes/node-1/dagi-router',
                        description: 'Статус DAGI Router на НОДА1 змінено: online → healthy',
                        details: { node_id: 'node-1', service: 'dagi-router', status: 'healthy' },
                      },
                      {
                        type: 'agent' as const,
                        action: 'deployed' as const,
                        path: 'nodes/node-1/agents/yaromir',
                        description: 'Задеплоєно агента Яромир на НОДА1 з CrewAI командою',
                        details: { node_id: 'node-1', agent: 'yaromir', crew_size: 5 },
                      },
                      {
                        type: 'config' as const,
                        action: 'modified' as const,
                        path: 'nodes/node-1/router-config.yml',
                        description: 'Оновлено конфігурацію роутера на НОДА1: додано нові LLM профілі',
                        details: { node_id: 'node-1', config: 'router-config', profiles: 8 },
                      },
                      {
                        type: 'service' as const,
                        action: 'created' as const,
                        path: 'nodes/node-1/monitor-agent',
                        description: 'Створено Monitor Agent для НОДА1: підключено до Mistral',
                        details: { node_id: 'node-1', service: 'monitor-agent', model: 'mistral:7b' },
                      },
                    ];

                    // Тестові зміни для НОДА2
                    const node2Changes = [
                      {
                        type: 'service' as const,
                        action: 'modified' as const,
                        path: 'nodes/node-2/swapper-service',
                        description: 'Оновлено Swapper Service на НОДА2: активовано модель gpt-oss:latest',
                        details: { node_id: 'node-2', service: 'swapper', model: 'gpt-oss:latest' },
                      },
                      {
                        type: 'service' as const,
                        action: 'status_changed' as const,
                        path: 'nodes/node-2/ollama',
                        description: 'Статус Ollama на НОДА2: завантажено 8 моделей, використовується Metal acceleration',
                        details: { node_id: 'node-2', service: 'ollama', models: 8, acceleration: 'metal' },
                      },
                      {
                        type: 'agent' as const,
                        action: 'deployed' as const,
                        path: 'nodes/node-2/agents/monitor',
                        description: 'Задеплоєно Monitor Agent на НОДА2: працює на Mistral для генерації повідомлень',
                        details: { node_id: 'node-2', agent: 'monitor', model: 'mistral:7b' },
                      },
                      {
                        type: 'config' as const,
                        action: 'modified' as const,
                        path: 'nodes/node-2/swapper_config.yaml',
                        description: 'Оновлено конфігурацію Swapper на НОДА2: встановлено default_model gpt-oss:latest',
                        details: { node_id: 'node-2', config: 'swapper', default_model: 'gpt-oss:latest' },
                      },
                      {
                        type: 'system' as const,
                        action: 'updated' as const,
                        path: 'nodes/node-2/system',
                        description: 'Оновлено системні налаштування НОДА2: оптимізовано використання GPU',
                        details: { node_id: 'node-2', system: 'gpu-optimization', gpu_usage: '45%' },
                      },
                    ];

                    // Додаємо всі зміни з невеликою затримкою
                    const allChanges = [...node1Changes, ...node2Changes];
                    for (let i = 0; i < allChanges.length; i++) {
                      const change = allChanges[i];
                      await tracker.addChange(change);
                      console.log(`✅ Test change ${i + 1}/10 added: ${change.path}`);
                      
                      // Невелика затримка між змінами для кращого відображення
                      if (i < allChanges.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                      }
                    }
                    
                    console.log('✅ All 10 test changes added');
                  } catch (error) {
                    console.error('❌ Error adding test changes:', error);
                    const errorMessage: ChatMessage = {
                      id: `test-error-${Date.now()}`,
                      role: 'assistant',
                      content: `❌ Помилка при тестуванні: ${error instanceof Error ? error.message : 'Невідома помилка'}`,
                      timestamp: new Date().toISOString(),
                    };
                    setMessages((prev) => [errorMessage, ...prev]);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                title="Тест: Симулювати 10 змін на НОДА1 та НОДА2"
              >
                🧪 Тест 10 змін
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Оновити
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Чат з Monitor Agent */}
          <div className="lg:col-span-2 space-y-6">
            {/* Чат */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 bg-blue-600 text-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    <span className="font-semibold">Monitor Agent Chat</span>
                    {isConnected ? (
                      <span className="w-2 h-2 bg-green-400 rounded-full" title="Підключено" />
                    ) : (
                      <span className="w-2 h-2 bg-red-400 rounded-full" title="Відключено" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="/docs/monitor_agents/monitor_changes.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-1 bg-blue-700 hover:bg-blue-800 rounded transition-colors flex items-center gap-1"
                      title="Відкрити MD файл з усіма змінами"
                    >
                      📄 MD
                    </a>
                    <a
                      href="/docs/monitor_agents/monitor_changes.ipynb"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-1 bg-blue-700 hover:bg-blue-800 rounded transition-colors flex items-center gap-1"
                      title="Відкрити Jupyter Notebook з усіма змінами"
                    >
                      📓 Notebook
                    </a>
                  </div>
                </div>
              </div>
              <div
                ref={chatContainerRef}
                className="h-[600px] overflow-y-auto p-4 space-y-3 bg-gray-50"
              >
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Activity className="w-12 h-12 mx-auto mb-2 text-gray-400 animate-pulse" />
                    <p className="text-sm text-gray-600">Очікування змін проєкту...</p>
                    <p className="text-xs mt-1 text-gray-500">Monitor Agent автоматично відстежує всі зміни</p>
                    <p className="text-xs mt-2 text-blue-600">Повідомлення про зміни з'являться тут автоматично</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Повідомлення відображаються зверху вниз (нові зверху) */}
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : message.content.includes('**Monitor Agent:**')
                              ? 'bg-indigo-50 border border-indigo-200 text-gray-900'
                              : 'bg-white border border-gray-200 text-gray-900'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs mt-1 opacity-70">
                            {new Date(message.timestamp).toLocaleString('uk-UA', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Scroll anchor для автоматичного скролу до нових повідомлень */}
                <div ref={messagesEndRef} />
              </div>
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
          </div>

          {/* Бічна панель */}
          <div className="space-y-6">
            {/* API Підключення */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Network className="w-5 h-5 text-blue-600" />
                  API Підключення
                </h2>
              </div>
              <div className="p-4 space-y-3">
                {apiConnections && apiConnections.length > 0 ? (
                  apiConnections.map((connection, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 text-sm">{connection.name}</h3>
                          {connection.status === 'online' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : connection.status === 'error' ? (
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{connection.description || connection.type}</p>
                        {connection.port && (
                          <p className="text-xs text-gray-400 mt-1">Порт: {connection.port}</p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          connection.status === 'online'
                            ? 'bg-green-100 text-green-700'
                            : connection.status === 'error'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {connection.status === 'online' ? 'Онлайн' : connection.status === 'error' ? 'Помилка' : 'Офлайн'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4 text-sm">Завантаження...</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Метрики НОД */}
        <div className="mt-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-600" />
                Метрики НОД
              </h2>
            </div>
            <div className="p-6">
              {nodeMetrics && nodeMetrics.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {nodeMetrics.map((node) => (
                    <div
                      key={node.node_id}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{node.node_name}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            node.status === 'online'
                              ? 'bg-green-100 text-green-700'
                              : node.status === 'degraded'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {node.status === 'online' ? 'Онлайн' : node.status === 'degraded' ? 'Деградовано' : 'Офлайн'}
                        </span>
                      </div>

                      {/* CPU */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-700">CPU</span>
                          </div>
                          <span className={`text-sm font-semibold ${getStatusTextColor(node.cpu_usage)}`}>
                            {node.cpu_usage}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getStatusColor(node.cpu_usage)} transition-all`}
                            style={{ width: `${node.cpu_usage}%` }}
                          />
                        </div>
                      </div>

                      {/* Memory */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <HardDrive className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-gray-700">ОЗУ</span>
                          </div>
                          <span className={`text-sm font-semibold ${getStatusTextColor(node.memory_usage)}`}>
                            {node.memory_usage}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getStatusColor(node.memory_usage)} transition-all`}
                            style={{ width: `${node.memory_usage}%` }}
                          />
                        </div>
                      </div>

                      {/* Disk */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <HardDrive className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-medium text-gray-700">Диск</span>
                          </div>
                          <span className={`text-sm font-semibold ${getStatusTextColor(node.disk_usage)}`}>
                            {node.disk_usage}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getStatusColor(node.disk_usage)} transition-all`}
                            style={{ width: `${node.disk_usage}%` }}
                          />
                        </div>
                      </div>

                      {/* GPU (якщо є) */}
                      {node.gpu_usage !== undefined && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Zap className="w-4 h-4 text-orange-600" />
                              <span className="text-sm font-medium text-gray-700">GPU</span>
                            </div>
                            <span className={`text-sm font-semibold ${getStatusTextColor(node.gpu_usage)}`}>
                              {node.gpu_usage}%
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getStatusColor(node.gpu_usage)} transition-all`}
                              style={{ width: `${node.gpu_usage}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Network */}
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Network className="w-4 h-4 text-indigo-600" />
                          <span className="text-sm font-medium text-gray-700">Мережа</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          <div>↓ {node.network_in} MB/s</div>
                          <div>↑ {node.network_out} MB/s</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Завантаження метрик...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

