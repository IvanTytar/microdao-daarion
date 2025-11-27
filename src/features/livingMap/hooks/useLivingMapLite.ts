/**
 * Living Map Lite Hook
 * Phase 9B: Simplified version with layer/entity selection
 */
import { useState } from 'react';
import { useLivingMapFull, type LivingMapSnapshot } from './useLivingMapFull';

export type LayerType = 'city' | 'space' | 'nodes' | 'agents';

export interface UseLivingMapLiteResult {
  snapshot: LivingMapSnapshot | null;
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'connecting' | 'open' | 'closed' | 'error';
  selectedLayer: LayerType;
  setSelectedLayer: (layer: LayerType) => void;
  selectedEntityId: string | null;
  setSelectedEntityId: (id: string | null) => void;
  refetch: () => Promise<void>;
}

export function useLivingMapLite(): UseLivingMapLiteResult {
  const [selectedLayer, setSelectedLayer] = useState<LayerType>('city');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  
  const { snapshot, isLoading, error, connectionStatus, refetch } = useLivingMapFull();
  
  return {
    snapshot,
    isLoading,
    error,
    connectionStatus,
    selectedLayer,
    setSelectedLayer,
    selectedEntityId,
    setSelectedEntityId,
    refetch
  };
}

