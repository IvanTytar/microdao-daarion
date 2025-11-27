/**
 * API для Second Me (персональний агент)
 */

import { apiGet, apiPost } from './client';

export interface SecondMeMessage {
  id: string;
  prompt: string;
  response: string;
  created_at: string;
}

export interface SecondMeProfile {
  user_id: string;
  agent_id: string;
  total_interactions: number;
  last_interaction?: string;
}

export interface InvokeSecondMePayload {
  prompt: string;
  user_id?: string;
}

export interface InvokeSecondMeResponse {
  response: string;
  tokens_used: number;
  latency_ms: number;
}

/**
 * Викликати Second Me agent
 */
export async function invokeSecondMe(payload: InvokeSecondMePayload): Promise<InvokeSecondMeResponse> {
  try {
    return await apiPost('/v1/secondme/invoke', payload);
  } catch (error) {
    console.error('Failed to invoke SecondMe:', error);
    // Fallback до mock відповіді
    return {
      response: `Я — твій Second Me. Ти запитав: "${payload.prompt}". Це цікава тема! Хочеш обговорити глибше?`,
      tokens_used: 50,
      latency_ms: 300,
    };
  }
}

/**
 * Отримати історію взаємодій з Second Me
 */
export async function getSecondMeHistory(userId?: string): Promise<SecondMeMessage[]> {
  try {
    const query = userId ? `?user_id=${userId}` : '';
    return await apiGet(`/v1/secondme/history${query}`);
  } catch (error) {
    console.error('Failed to get SecondMe history:', error);
    // Fallback до mock даних
    return [
      {
        id: '1',
        prompt: 'Що ти думаєш про DAARION City?',
        response: 'DAARION City — це інноваційна платформа для спільнот!',
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: '2',
        prompt: 'Яку пораду ти можеш дати?',
        response: 'Рекомендую почати з вивчення City Rooms та участі в публічних обговореннях.',
        created_at: new Date(Date.now() - 1800000).toISOString(),
      },
    ];
  }
}

/**
 * Отримати профіль Second Me
 */
export async function getSecondMeProfile(userId?: string): Promise<SecondMeProfile> {
  try {
    const query = userId ? `?user_id=${userId}` : '';
    return await apiGet(`/v1/secondme/profile${query}`);
  } catch (error) {
    console.error('Failed to get SecondMe profile:', error);
    // Fallback до mock даних
    return {
      user_id: userId || 'user-1',
      agent_id: 'agent:secondme-user-1',
      total_interactions: 42,
      last_interaction: new Date().toISOString(),
    };
  }
}

/**
 * Очистити історію Second Me
 */
export async function clearSecondMeHistory(userId?: string): Promise<void> {
  try {
    const query = userId ? `?user_id=${userId}` : '';
    return await apiPost(`/v1/secondme/history/clear${query}`, {});
  } catch (error) {
    console.error('Failed to clear SecondMe history:', error);
  }
}

