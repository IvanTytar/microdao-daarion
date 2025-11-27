/**
 * useSpaceScene Hook
 *
 * Завантажує космічну сцену через API (з fallback до зібраних даних)
 */

import { useCallback, useEffect, useState } from 'react';
import type { SpaceScene } from '../types/space';
import { fetchSpaceScene } from '../../../api/space';

export function useSpaceScene() {
  const [scene, setScene] = useState<SpaceScene | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadScene = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSpaceScene();
      setScene(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Не вдалося завантажити космічну сцену',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScene();
  }, [loadScene]);

  return {
    scene,
    loading,
    error,
    refetch: loadScene,
  };
}

