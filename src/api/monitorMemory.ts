import { apiGet, apiPost } from './client';

export interface MonitorEvent {
  node_id: string;
  team_id?: string;
  channel_id?: string;
  user_id?: string;
  scope: 'short_term' | 'mid_term' | 'long_term';
  kind: 'node_event' | 'agent_event' | 'system_event' | 'project_event';
  body_text: string;
  body_json: Record<string, unknown>;
}

export interface MonitorEventBatch {
  node_id: string;
  events: MonitorEvent[];
  batch_size?: number;
}

export interface MonitorEventResponse {
  saved: number;
  failed: number;
  node_id: string;
  timestamp: string;
}

const MEMORY_SERVICE_URL = import.meta.env.VITE_MEMORY_SERVICE_URL || 'http://localhost:8000';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.microdao.xyz';

// Батч для збереження подій (оптимізація)
let eventBatch: MonitorEvent[] = [];
let batchTimeout: NodeJS.Timeout | null = null;
const BATCH_SIZE = 10; // Зберігати батч кожні 10 подій
const BATCH_TIMEOUT = 5000; // Або кожні 5 секунд

/**
 * Додати подію до батчу для оптимізованого збереження
 */
export async function addMonitorEventToBatch(
  nodeId: string,
  event: Omit<MonitorEvent, 'node_id'>
): Promise<void> {
  const fullEvent: MonitorEvent = {
    node_id: nodeId,
    ...event,
  };

  eventBatch.push(fullEvent);

  // Якщо батч досяг розміру, зберігаємо
  if (eventBatch.length >= BATCH_SIZE) {
    await flushMonitorEventBatch();
  } else {
    // Встановлюємо таймер для автоматичного збереження
    if (batchTimeout) {
      clearTimeout(batchTimeout);
    }
    batchTimeout = setTimeout(() => {
      flushMonitorEventBatch();
    }, BATCH_TIMEOUT);
  }
}

/**
 * Зберегти батч подій в Memory Service
 */
export async function flushMonitorEventBatch(): Promise<MonitorEventResponse | null> {
  if (eventBatch.length === 0) {
    return null;
  }

  const batch: MonitorEventBatch = {
    node_id: eventBatch[0]?.node_id || 'unknown',
    events: [...eventBatch],
    batch_size: eventBatch.length,
  };

  // Очищаємо батч перед відправкою
  eventBatch = [];
  if (batchTimeout) {
    clearTimeout(batchTimeout);
    batchTimeout = null;
  }

  try {
    const response = await fetch(`${MEMORY_SERVICE_URL}/api/memory/monitor-events/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving monitor events batch:', error);
    // Повертаємо події назад в батч для повторної спроби
    eventBatch = [...batch.events, ...eventBatch];
    throw error;
  }
}

/**
 * Зберегти одну подію негайно
 */
export async function saveMonitorEvent(
  nodeId: string,
  event: Omit<MonitorEvent, 'node_id'>
): Promise<void> {
  try {
    const response = await fetch(`${MEMORY_SERVICE_URL}/api/memory/monitor-events/${nodeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error saving monitor event:', error);
    // Fallback: додаємо до батчу
    await addMonitorEventToBatch(nodeId, event);
  }
}

/**
 * Отримати події Monitor Agent з Memory Service
 */
export async function getMonitorEvents(
  nodeId: string,
  kind?: MonitorEvent['kind'],
  limit: number = 50
): Promise<MonitorEvent[]> {
  try {
    const agentId = `monitor-${nodeId}`;
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(kind && { kind }),
    });

    const response = await fetch(
      `${MEMORY_SERVICE_URL}/agents/${agentId}/memory?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching monitor events:', error);
    return [];
  }
}

