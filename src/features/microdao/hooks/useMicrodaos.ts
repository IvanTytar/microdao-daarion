/**
 * useMicrodaos Hook
 * Fetch list of user's microDAOs
 */
import { useState, useEffect } from 'react';
import { getMicrodaos, type MicrodaoRead } from '@/api/microdao';

interface UseMicrodaosResult {
  microdaos: MicrodaoRead[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useMicrodaos(): UseMicrodaosResult {
  const [microdaos, setMicrodaos] = useState<MicrodaoRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMicrodaos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMicrodaos();
      setMicrodaos(data);
    } catch (err) {
      console.error('❌ Failed to fetch microDAOs:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMicrodaos();
  }, []);

  return {
    microdaos,
    loading,
    error,
    refetch: fetchMicrodaos,
  };
}

