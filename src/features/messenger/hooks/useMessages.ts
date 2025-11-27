import { useEffect, useState, useCallback } from 'react';
import type { Message } from '../types/messenger';
import { getChannelMessages } from '../api/getChannelMessages';
import { sendMessage } from '../api/sendMessage';
import type { MessageSendInput } from '../types/messenger';

export function useMessages(channelId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const data = await getChannelMessages(channelId, 50);
        if (!cancelled) {
          setMessages(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [channelId]);

  const send = useCallback(
    async (input: MessageSendInput) => {
      try {
        setSending(true);
        const newMessage = await sendMessage(channelId, input);
        setMessages((prev) => [newMessage, ...prev]);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSending(false);
      }
    },
    [channelId]
  );

  return { messages, loading, error, sending, send };
}




