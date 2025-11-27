import type { Channel, ChannelCreateInput } from '../types/messenger';

export async function createChannel(data: ChannelCreateInput): Promise<Channel> {
  const res = await fetch('/api/messaging/channels', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-User-Id': 'user:admin', // TODO: get from auth context
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(`Failed to create channel: ${res.status}`);
  }

  return res.json();
}




