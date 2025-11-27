const TELEGRAM_GATEWAY_URL =
  import.meta.env.VITE_TELEGRAM_GATEWAY_URL || 'http://localhost:8000';

export interface TelegramBotsList {
  bots: string[];
  count: number;
}

export interface TelegramBotStatus {
  agent_id: string;
  registered: boolean;
  token_prefix?: string;
  polling?: boolean;
  task_cancelled?: boolean;
}

const buildUrl = (path: string) => `${TELEGRAM_GATEWAY_URL}${path}`;

export async function fetchTelegramBotsList(): Promise<TelegramBotsList> {
  const response = await fetch(buildUrl('/bots/list'));
  if (!response.ok) {
    throw new Error('Не вдалося отримати список ботів');
  }
  return response.json();
}

export async function fetchTelegramBotStatus(
  agentId: string,
): Promise<TelegramBotStatus> {
  const response = await fetch(buildUrl(`/bots/status/${agentId}`));
  if (!response.ok) {
    throw new Error('Не вдалося отримати статус бота');
  }
  return response.json();
}

export async function registerTelegramBot(agentId: string, botToken: string) {
  const response = await fetch(buildUrl('/bots/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: agentId, bot_token: botToken }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Не вдалося підключити Telegram бота');
  }

  return response.json();
}

export async function unregisterTelegramBot(agentId: string) {
  const response = await fetch(buildUrl(`/bots/${agentId}`), { method: 'DELETE' });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Не вдалося від\'єднати бота');
  }
  return response.json();
}

