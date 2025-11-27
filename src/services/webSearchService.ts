/**
 * Сервіс для роботи з веб-пошуком через Router
 */

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

interface WebSearchResponse {
  query: string;
  results: SearchResult[];
  summary?: string;
}

export class WebSearchService {
  private routerUrl: string;

  constructor(routerUrl?: string) {
    this.routerUrl = routerUrl || import.meta.env.VITE_NODE1_URL || 'http://144.76.224.179:9102';
  }

  /**
   * Виконати веб-пошук через Router
   */
  async search(query: string, agentId: string): Promise<WebSearchResponse> {
    try {
      const response = await fetch(`${this.routerUrl}/route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent: agentId,
          message: query,
          mode: 'web_search',
          payload: {
            search_query: query,
            max_results: 5,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        query,
        results: data.data?.results || [],
        summary: data.data?.summary,
      };
    } catch (error: any) {
      console.error('Web search error:', error);
      throw new Error(`Помилка веб-пошуку: ${error.message}`);
    }
  }

  /**
   * Форматувати результати пошуку для відображення
   */
  formatResults(response: WebSearchResponse): string {
    let formatted = `🔍 Результати пошуку за запитом: "${response.query}"\n\n`;
    
    if (response.results.length === 0) {
      return formatted + 'Нічого не знайдено.';
    }

    response.results.forEach((result, index) => {
      formatted += `${index + 1}. **${result.title}**\n`;
      formatted += `   ${result.snippet}\n`;
      formatted += `   🔗 ${result.url}\n\n`;
    });

    if (response.summary) {
      formatted += `\n📝 Резюме: ${response.summary}`;
    }

    return formatted;
  }

  /**
   * Витягти ключові слова з запиту
   */
  extractKeywords(query: string): string[] {
    // Простий підхід - розбити на слова та відфільтрувати стоп-слова
    const stopWords = ['і', 'та', 'або', 'але', 'про', 'для', 'від', 'до', 'на', 'в', 'у', 'з', 'що', 'як', 'чи'];
    
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
  }
}

// Singleton instance
export const webSearchService = new WebSearchService();





