import type { Channel } from '../types/messenger';

export async function getChannels(microdaoId?: string): Promise<Channel[]> {
  const url = microdaoId
    ? `/api/messaging/channels?microdao_id=${encodeURIComponent(microdaoId)}`
    : '/api/messaging/channels';
  
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-User-Id': 'user:admin', // TODO: get from auth context
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch channels: ${res.status}`);
  }

  return res.json();
}




