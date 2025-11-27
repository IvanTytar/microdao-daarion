/**
 * Автоматичне логування змін проєкту для Monitor Agent
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.microdao.xyz';

export interface ProjectChange {
  type: 'file_created' | 'file_modified' | 'file_deleted' | 'component_created' | 'api_integration';
  path: string;
  description: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

class ProjectLogger {
  private changes: ProjectChange[] = [];
  private maxChanges = 100;

  logChange(change: Omit<ProjectChange, 'timestamp'>) {
    const fullChange: ProjectChange = {
      ...change,
      timestamp: new Date().toISOString(),
    };

    this.changes.push(fullChange);
    
    // Зберігаємо максимум 100 змін
    if (this.changes.length > this.maxChanges) {
      this.changes = this.changes.slice(-this.maxChanges);
    }

    // Відправляємо подію на сервер для Monitor Agent
    this.sendToMonitor(fullChange);

    console.log('[Project Logger]', fullChange);
  }

  private async sendToMonitor(change: ProjectChange) {
    try {
      const token = localStorage.getItem('auth_token');
      
      // Відправляємо подію через API (якщо є endpoint)
      // Або через WebSocket (якщо вже підключений)
      
      // Поки що просто логуємо в консоль
      // Пізніше можна додати відправку на сервер
      
      if (window.monitorWebSocket && window.monitorWebSocket.readyState === WebSocket.OPEN) {
        window.monitorWebSocket.send(JSON.stringify({
          type: 'project',
          action: change.type,
          message: change.description,
          details: {
            path: change.path,
            ...change.details,
          },
          timestamp: change.timestamp,
        }));
      }
    } catch (error) {
      console.error('Error sending change to Monitor:', error);
    }
  }

  getChanges(): ProjectChange[] {
    return [...this.changes];
  }

  clearChanges() {
    this.changes = [];
  }
}

export const projectLogger = new ProjectLogger();

// Автоматичне логування при старті
projectLogger.logChange({
  type: 'component_created',
  path: '/src',
  description: 'Frontend розробка розпочата',
  details: {
    version: '1.0.0',
    port: 8899,
    date: new Date().toISOString(),
  },
});

// Розширюємо Window interface для TypeScript
declare global {
  interface Window {
    monitorWebSocket?: WebSocket;
  }
}

