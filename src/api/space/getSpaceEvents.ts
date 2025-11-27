/**
 * Space Events API
 * 
 * API для отримання поточних Space/DAO/Node подій
 */

import { apiGet } from '../client';

export interface SpaceEvent {
  type: string;
  dao_id?: string;
  node_id?: string;
  timestamp: number;
  severity: 'info' | 'warn' | 'error' | 'critical';
  meta: Record<string, any>;
}

export interface GetSpaceEventsParams {
  seconds?: number;
}

export async function getSpaceEvents(params?: GetSpaceEventsParams): Promise<SpaceEvent[]> {
  const queryParams = new URLSearchParams();
  
  if (params?.seconds) {
    queryParams.set('seconds', params.seconds.toString());
  }

  const endpoint = `/space/events${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return await apiGet<SpaceEvent[]>(endpoint);
}





