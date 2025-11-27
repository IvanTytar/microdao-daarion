import { useEffect, useState } from 'react';
import type { Channel } from '../types/messenger';
import { getChannels } from '../api/getChannels';

export function useChannels(microdaoId?: string) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const data = await getChannels(microdaoId);
        if (!cancelled) {
          setChannels(data);
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
  }, [microdaoId]);

  return { channels, loading, error };
}





