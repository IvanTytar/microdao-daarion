/**
 * Сервіс для роботи з базою знань агента
 */

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

interface UploadResponse {
  fileId: string;
  status: string;
  message: string;
}

interface IndexResponse {
  fileId: string;
  vectorDbStatus: boolean;
  graphDbStatus: boolean;
  chunks: number;
  entities?: number;
  relationships?: number;
}

export class KnowledgeBaseService {
  private routerUrl: string;
  private apiUrl: string;

  constructor() {
    this.routerUrl = import.meta.env.VITE_NODE1_URL || 'http://144.76.224.179:9102';
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://144.76.224.179:8899';
  }

  /**
   * Завантажити файл у базу знань агента
   */
  async uploadFile(agentId: string, file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('agent_id', agentId);

    try {
      const response = await fetch(`${this.apiUrl}/api/knowledge/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || error.message || response.statusText);
      }

      return await response.json();
    } catch (error: any) {
      console.error('File upload error:', error);
      throw new Error(`Помилка завантаження: ${error.message}`);
    }
  }

  /**
   * Отримати список файлів бази знань агента
   */
  async getFiles(agentId: string): Promise<KnowledgeFile[]> {
    try {
      const response = await fetch(`${this.apiUrl}/api/knowledge/${agentId}/files`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.files || [];
    } catch (error: any) {
      console.error('Get files error:', error);
      // Повертаємо порожній масив якщо backend недоступний
      return [];
    }
  }

  /**
   * Видалити файл з бази знань
   */
  async deleteFile(agentId: string, fileId: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/api/knowledge/${agentId}/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || error.message || response.statusText);
      }
    } catch (error: any) {
      console.error('Delete file error:', error);
      throw new Error(`Помилка видалення: ${error.message}`);
    }
  }

  /**
   * Повторно індексувати файл
   */
  async reindexFile(agentId: string, fileId: string): Promise<IndexResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/api/knowledge/${agentId}/files/${fileId}/reindex`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || error.message || response.statusText);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Reindex file error:', error);
      throw new Error(`Помилка індексації: ${error.message}`);
    }
  }

  /**
   * Отримати статистику бази знань
   */
  async getStats(agentId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    vectorizedFiles: number;
    graphedFiles: number;
  }> {
    try {
      const response = await fetch(`${this.apiUrl}/api/knowledge/${agentId}/stats`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Get stats error:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        vectorizedFiles: 0,
        graphedFiles: 0,
      };
    }
  }

  /**
   * Пошук у базі знань
   */
  async search(agentId: string, query: string, limit: number = 5): Promise<any[]> {
    try {
      const response = await fetch(`${this.apiUrl}/api/knowledge/${agentId}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          limit,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error: any) {
      console.error('Search error:', error);
      return [];
    }
  }

  /**
   * Валідація файлу перед завантаженням
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 50 * 1024 * 1024; // 50 MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'application/json',
    ];

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'Файл занадто великий (макс. 50 МБ)',
      };
    }

    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.md')) {
      return {
        valid: false,
        error: 'Непідтримуваний тип файлу',
      };
    }

    return { valid: true };
  }
}

// Singleton instance
export const knowledgeBaseService = new KnowledgeBaseService();





