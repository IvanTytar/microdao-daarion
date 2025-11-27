/**
 * Living Map Canvas Component
 * Phase 9B: Wrapper for Canvas renderer
 */
import { useRef, useEffect } from 'react';
import type { LivingMapSnapshot } from '../hooks/useLivingMapFull';
import { createLivingMapRenderer, type LayerType } from '../mini-engine/canvasRenderer';

interface LivingMapCanvasProps {
  snapshot: LivingMapSnapshot | null;
  selectedLayer: LayerType;
  selectedEntityId: string | null;
  onSelectEntity: (id: string | null) => void;
}

export function LivingMapCanvas(props: LivingMapCanvasProps) {
  const { snapshot, selectedLayer, selectedEntityId, onSelectEntity } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas size to match container
    const updateSize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    
    // Create renderer
    cleanupRef.current = createLivingMapRenderer({
      canvas,
      getState: () => ({
        snapshot,
        selectedLayer,
        selectedEntityId,
        zoom: 1,
        offsetX: 0,
        offsetY: 0
      }),
      onSelectEntity
    });
    
    return () => {
      window.removeEventListener('resize', updateSize);
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [snapshot, selectedLayer, selectedEntityId, onSelectEntity]);
  
  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-pointer"
      style={{ display: 'block' }}
    />
  );
}

