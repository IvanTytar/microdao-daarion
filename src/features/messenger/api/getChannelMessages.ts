import type { Message } from '../types/messenger';

export async function getChannelMessages(
  channelId: string,
  limit: number = 50,
  before?: string
): Promise<Message[]> {
  let url = `/api/messaging/channels/${channelId}/messages?limit=${limit}`;
  if (before) {
    url += `&before=${encodeURIComponent(before)}`;
  }

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-User-Id': 'user:admin', // TODO: get from auth context
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch messages: ${res.status}`);
  }

  return res.json();
}




