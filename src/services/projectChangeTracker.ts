/**
 * Сервіс відстеження змін проєкту для Monitor Agent
 * Відстежує зміни в коді, конфігураціях, сервісах та автоматично генерує повідомлення
 */

const MONITOR_SERVICE_URL = import.meta.env.VITE_MONITOR_SERVICE_URL || 'http://localhost:9500';

export interface ProjectChange {
  id: string;
  type: 'file' | 'config' | 'service' | 'agent' | 'deployment' | 'git';
  action: 'created' | 'modified' | 'deleted' | 'deployed' | 'committed';
  path: string;
  description: string;
  timestamp: string;
  details?: {
    file?: string;
    component?: string;
    service?: string;
    agent?: string;
    commit?: string;
    author?: string;
    [key: string]: unknown;
  };
}

class ProjectChangeTracker {
  private changes: ProjectChange[] = [];
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private readonly CHECK_INTERVAL = 3000; // Перевірка кожні 3 секунди (real-time)
  private isTracking: boolean = false;
  private lastCheckTime: number = Date.now();

  constructor() {
    // Автоматично запускаємо відстеження для real-time повідомлень
    if (typeof window !== 'undefined') {
      // Запускаємо через 2 секунди після ініціалізації
      setTimeout(() => {
        this.startTracking();
      }, 2000);
    }
  }

  /**
   * Почати відстеження змін
   */
  startTracking() {
    if (this.isTracking) {
      return; // Вже відстежуємо
    }

    this.isTracking = true;

    // Перевірка змін при старті
    this.checkForChanges();

    // Періодична перевірка
    this.checkInterval = setInterval(() => {
      this.checkForChanges();
    }, this.CHECK_INTERVAL);
  }

  /**
   * Зупинити відстеження
   */
  stopTracking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isTracking = false;
  }

  /**
   * Перевірити зміни в проєкті у реальному часі
   */
  private async checkForChanges() {
    try {
      console.log('🔍 Checking for real-time changes...');
      
      // Отримуємо зміни з Monitor Agent Service з timestamps
      const changes = await this.fetchProjectChanges();
      
      if (changes.length > 0) {
        console.log(`📊 Found ${changes.length} new changes`);
        
        for (const change of changes) {
          // Перевіряємо чи це нова зміна (після lastCheckTime)
          const changeTime = new Date(change.timestamp).getTime();
          if (changeTime > this.lastCheckTime) {
            await this.processChange(change);
          }
        }
        
        // Оновлюємо час останньої перевірки
        this.lastCheckTime = Date.now();
      } else {
        console.debug('No new changes');
      }
    } catch (error) {
      console.debug('Could not check for changes:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Отримати зміни з API з фільтрацією за часом
   */
  private async fetchProjectChanges(): Promise<ProjectChange[]> {
    try {
      // Отримуємо зміни з Monitor Service API з timestamps
      const url = `${MONITOR_SERVICE_URL}/api/project/changes?since=${this.lastCheckTime}&limit=20`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const changes = data.changes || [];
        
        if (changes.length > 0) {
          console.log(`✅ Fetched ${changes.length} changes from Monitor Service`);
        }
        
        return changes;
      }
    } catch (error) {
      // Тихо ігноруємо помилки (API може бути недоступний)
      console.debug('Monitor Service API not available');
    }

    return [];
  }

  /**
   * Отримати зміни з git (локально) через API
   */
  private async getLocalGitChanges(): Promise<ProjectChange[]> {
    try {
      // Спробувати отримати зміни через Monitor Service API
      const response = await fetch(`${MONITOR_SERVICE_URL}/api/project/git-changes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.changes || [];
      }
    } catch (error) {
      console.warn('Could not fetch git changes:', error);
    }

    // Fallback: порожній масив
    return [];
  }

  /**
   * Обробити зміну та згенерувати повідомлення від Monitor Agent
   */
  private async processChange(change: ProjectChange) {
    // Перевірити чи це нова зміна
    const isNew = !this.changes.some(c => c.id === change.id);
    
    if (isNew) {
      this.changes.push(change);
      
      // Зберігаємо максимум 100 змін
      if (this.changes.length > 100) {
        this.changes = this.changes.slice(-100);
      }

      // Генеруємо повідомлення від Monitor Agent
      await this.generateMonitorMessage(change);
    }
  }

  /**
   * Згенерувати повідомлення від Monitor Agent про зміну через Mistral на НОДА2
   */
  private async generateMonitorMessage(change: ProjectChange) {
    try {
      console.log('🤖 Generating compact Monitor Agent message:', change.id, change.type, change.action);
      const baseMessage = this.formatChangeMessage(change);
      
      // Формуємо компактне повідомлення від Monitor Agent (1 рядок)
      const monitorMessage = `🤖 **Monitor Agent:** ${baseMessage}`;
      
      console.log('✅ Compact message created:', monitorMessage);
      
      // Зберігаємо в пам'ять Monitor Agent (неблокуюче)
      this.saveToMonitorMemory(change, monitorMessage).catch((error) => {
        console.debug('Could not save to memory:', error);
      });
      
      // Відправляємо подію НЕГАЙНО (ОБОВ'ЯЗКОВО для відображення в чаті)
      this.emitChangeEvent(monitorMessage, change);
      
      // Також спробуємо через API (асинхронно, не блокуємо)
      this.tryGenerateViaAPI(change, baseMessage).catch((error) => {
        console.debug('API generation failed (non-blocking):', error);
      });
    } catch (error) {
      console.error('❌ Error generating monitor message:', error);
      // Fallback: використовуємо сформоване повідомлення
      const message = this.formatChangeMessage(change);
      const monitorMessage = `🤖 **Monitor Agent:** ${message}`;
      try {
        this.emitChangeEvent(monitorMessage, change);
      } catch (emitError) {
        console.error('❌ Error emitting change event:', emitError);
      }
    }
  }

  /**
   * Спробувати згенерувати повідомлення через API (неблокуюче)
   */
  private async tryGenerateViaAPI(change: ProjectChange, baseMessage: string) {
    try {
      console.log('📡 Trying Monitor Agent API:', `${MONITOR_SERVICE_URL}/api/agent/monitor/project-change`);
      const response = await fetch(`${MONITOR_SERVICE_URL}/api/agent/monitor/project-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          change,
          context: {
            timestamp: new Date().toISOString(),
            project: 'microdao-daarion',
            node_id: change.details?.node_id || 'node-2',
          },
        }),
        signal: AbortSignal.timeout(5000), // Таймаут 5 секунд
      });

      if (response.ok) {
        const data = await response.json();
        const apiMessage = data.message || data.response;
        if (apiMessage && apiMessage !== baseMessage) {
          console.log('✅ API generated better message, updating...');
          // Оновлюємо повідомлення через новий CustomEvent
          const monitorMessage = `🤖 **Monitor Agent повідомляє:**\n\n${apiMessage}`;
          this.emitChangeEvent(monitorMessage, change);
        }
      }
    } catch (error) {
      // Ігноруємо помилки API - вже використали fallback
      console.debug('API generation skipped:', error);
    }
  }

  /**
   * Зберегти зміну в пам'ять Monitor Agent
   */
  private async saveToMonitorMemory(change: ProjectChange, message: string) {
    try {
      const response = await fetch(`${MONITOR_SERVICE_URL}/api/agent/monitor/memory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          node_id: 'node-2',
          team_id: 'system',
          scope: 'long_term',
          kind: 'project_event',
          body_text: message,
          body_json: {
            change_id: change.id,
            change_type: change.type,
            change_action: change.action,
            path: change.path,
            description: change.description,
            timestamp: change.timestamp,
            ...change.details,
          },
        }),
      });

      if (response.ok) {
        console.log('✅ Change saved to Monitor Agent memory');
      }
    } catch (error) {
      console.warn('Could not save to Monitor Agent memory:', error);
    }
    
    // Також зберігаємо через project-change endpoint (який автоматично зберігає в файли)
    try {
      const projectChangeResponse = await fetch(`${MONITOR_SERVICE_URL}/api/agent/monitor/project-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          change: {
            id: change.id,
            type: change.type,
            action: change.action,
            path: change.path,
            description: change.description,
            timestamp: change.timestamp,
            details: change.details,
          },
          context: {
            timestamp: new Date().toISOString(),
            project: 'microdao-daarion',
            node_id: change.details?.node_id || 'node-2',
          },
        }),
      });
      
      if (projectChangeResponse.ok) {
        console.log('✅ Change saved to Monitor Agent files (MD + Notebook)');
      }
    } catch (error) {
      console.warn('Could not save to Monitor Agent files:', error);
    }
  }

  /**
   * Сформувати компактне повідомлення про зміну (1 рядок)
   */
  private formatChangeMessage(change: ProjectChange): string {
    const icons = {
      file: '📄',
      config: '⚙️',
      service: '🔧',
      agent: '🤖',
      deployment: '🚀',
      git: '📝',
    };

    const icon = icons[change.type] || '📋';
    
    // Скорочуємо шлях для компактності (максимум 40 символів)
    const shortPath = change.path.length > 40 
      ? '...' + change.path.slice(-37) 
      : change.path;
    
    // Формуємо компактне повідомлення в 1 рядок
    let message = `${icon} ${change.action.toUpperCase()}: ${shortPath}`;
    
    // Додаємо контекст (НОДА або МікроДАО)
    if (change.details?.node_id) {
      message += ` [${change.details.node_id}]`;
    } else if (change.details?.microdao_id) {
      message += ` [${change.details.microdao_id}]`;
    }
    
    // Додаємо деталі (сервіс або агент)
    if (change.details?.service) {
      message += ` | ${change.details.service}`;
    } else if (change.details?.agent) {
      message += ` | ${change.details.agent}`;
    }

    return message;
  }

  /**
   * Відправити подію про зміну через WebSocket або події
   */
  private emitChangeEvent(message: string, change: ProjectChange) {
    console.log('📤 Emitting change event:', { message, change });
    
    // Відправляємо через WebSocket якщо доступний
    if (typeof window !== 'undefined' && window.monitorWebSocket) {
      const ws = window.monitorWebSocket;
      if (ws.readyState === WebSocket.OPEN) {
        console.log('📡 Sending via WebSocket');
        try {
          ws.send(JSON.stringify({
            type: 'project',
            action: change.action,
            message: message,
            details: {
              change_id: change.id,
              change_type: change.type,
              path: change.path,
              ...change.details,
            },
            timestamp: change.timestamp,
          }));
        } catch (error) {
          console.warn('⚠️ Error sending via WebSocket:', error);
        }
      } else {
        console.warn('⚠️ WebSocket not open, state:', ws.readyState);
      }
    } else {
      console.log('ℹ️ WebSocket not available, using CustomEvent only');
    }

    // Відправляємо через CustomEvent для локального обробника (ОБОВ'ЯЗКОВО)
    if (typeof window !== 'undefined') {
      console.log('📢 Dispatching CustomEvent project-change');
      try {
        const customEvent = new CustomEvent('project-change', {
          detail: {
            message,
            change,
          },
        });
        window.dispatchEvent(customEvent);
        console.log('✅ CustomEvent dispatched successfully');
      } catch (error) {
        console.error('❌ Error dispatching CustomEvent:', error);
      }
    } else {
      console.warn('⚠️ Window not available');
    }
  }

  /**
   * Додати зміну вручну (для тестування або прямих викликів)
   */
  async addChange(change: Omit<ProjectChange, 'id' | 'timestamp'>) {
    const fullChange: ProjectChange = {
      ...change,
      id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    await this.processChange(fullChange);
  }

  /**
   * Отримати всі зміни
   */
  getChanges(): ProjectChange[] {
    return [...this.changes];
  }

  /**
   * Очистити зміни
   */
  clearChanges() {
    this.changes = [];
  }
}

// Створюємо singleton екземпляр
const trackerInstance = new ProjectChangeTracker();

// Експортуємо singleton
export const projectChangeTracker = trackerInstance;

// Експортуємо також як default для сумісності з різними типами імпортів
export default trackerInstance;

// Розширюємо Window interface для TypeScript
declare global {
  interface Window {
    monitorWebSocket?: WebSocket;
  }
}

