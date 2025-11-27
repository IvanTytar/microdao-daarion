import type { Message, MessageSendInput } from '../types/messenger';

export async function sendMessage(
  channelId: string,
  data: MessageSendInput
): Promise<Message> {
  const res = await fetch(`/api/messaging/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-User-Id': 'user:admin', // TODO: get from auth context
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(`Failed to send message: ${res.status}`);
  }

  return res.json();
}




