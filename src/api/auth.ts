import { apiPost } from './client';
import type { AuthResponse, LoginEmailRequest, ExchangeCodeRequest } from '../types/api';

export async function loginEmail(data: LoginEmailRequest): Promise<{ success: boolean; message: string }> {
  return apiPost<{ success: boolean; message: string }>('/auth/login-email', data);
}

export async function exchangeCode(data: ExchangeCodeRequest): Promise<AuthResponse> {
  const response = await apiPost<AuthResponse>('/auth/exchange', data);
  // Зберігаємо токен
  if (response.token) {
    localStorage.setItem('auth_token', response.token);
  }
  return response;
}

