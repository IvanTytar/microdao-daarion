// API Client для MicroDAO

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.microdao.xyz';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getAuthToken(): Promise<string | null> {
  // Перевіряємо localStorage або httpOnly cookie
  return localStorage.getItem('auth_token');
}

async function fetchApi(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  // Add timeout to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Підтримка httpOnly cookies
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Запит перевищив час очікування', 408);
    }
    // Для помилок підключення (ERR_NAME_NOT_RESOLVED, ERR_CONNECTION_REFUSED)
    // не логуємо детально, оскільки це очікувана поведінка при недоступному API
    const errorMessage = error instanceof Error ? error.message : 'Помилка підключення до API';
    if (errorMessage.includes('ERR_NAME_NOT_RESOLVED') || 
        errorMessage.includes('ERR_CONNECTION_REFUSED') ||
        errorMessage.includes('Failed to fetch')) {
      // Це очікувана помилка - API недоступний, буде використано fallback
      throw new ApiError('API недоступний', 0);
    }
    throw new ApiError(errorMessage, 0);
  }
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await fetchApi(endpoint, { method: 'GET' });
  return response.json();
}

export async function apiPost<T>(endpoint: string, data?: unknown): Promise<T> {
  const response = await fetchApi(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
  return response.json();
}

export async function apiPut<T>(endpoint: string, data: unknown): Promise<T> {
  const response = await fetchApi(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function apiPatch<T>(endpoint: string, data: unknown): Promise<T> {
  const response = await fetchApi(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
  const response = await fetchApi(endpoint, { method: 'DELETE' });
  if (response.status === 204) {
    return {} as T;
  }
  return response.json();
}

