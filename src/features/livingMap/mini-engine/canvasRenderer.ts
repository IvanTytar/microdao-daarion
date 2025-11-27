/**
 * Canvas Renderer for Living Map 2D
 * Phase 9B: Real-time Canvas rendering with interactions
 */
import type { LivingMapSnapshot } from '../hooks/useLivingMapFull';
import { layoutCityLayer, layoutSpaceLayer, layoutNodesLayer, layoutAgentsLayer, type LayoutMap, type Position } from './layoutEngine';

export type LayerType = 'city' | 'space' | 'nodes' | 'agents';

interface RendererState {
  snapshot: LivingMapSnapshot | null;
  selectedLayer: LayerType;
  selectedEntityId: string | null;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

interface RendererOptions {
  canvas: HTMLCanvasElement;
  getState: () => RendererState;
  onSelectEntity: (id: string | null) => void;
}

export function createLivingMapRenderer(opts: RendererOptions) {
  const { canvas, getState, onSelectEntity } = opts;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');
  
  let layoutCache: LayoutMap = new Map();
  let animationFrameId: number | null = null;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  
  // Mouse interaction
  function getMousePos(e: MouseEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / (rect.width / canvas.width),
      y: (e.clientY - rect.top) / (rect.height / canvas.height)
    };
  }
  
  function findEntityAt(x: number, y: number): string | null {
    for (const [id, pos] of layoutCache) {
      if (
        x >= pos.x &&
        x <= pos.x + pos.w &&
        y >= pos.y &&
        y <= pos.y + pos.h
      ) {
        return id;
      }
    }
    return null;
  }
  
  // Mouse handlers
  canvas.addEventListener('click', (e) => {
    if (isDragging) return;
    const pos = getMousePos(e);
    const entityId = findEntityAt(pos.x, pos.y);
    onSelectEntity(entityId);
  });
  
  canvas.addEventListener('mousedown', (e) => {
    const pos = getMousePos(e);
    isDragging = true;
    dragStartX = pos.x;
    dragStartY = pos.y;
  });
  
  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    // For MVP, skip pan (can add later)
  });
  
  canvas.addEventListener('mouseup', () => {
    isDragging = false;
  });
  
  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
  });
  
  // Render functions
  function render() {
    const state = getState();
    const { snapshot, selectedLayer, selectedEntityId } = state;
    
    if (!snapshot) {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2);
      return;
    }
    
    // Clear canvas
    ctx.fillStyle = '#0f0f1e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Render selected layer
    switch (selectedLayer) {
      case 'city':
        renderCityLayer(snapshot, selectedEntityId);
        break;
      case 'space':
        renderSpaceLayer(snapshot, selectedEntityId);
        break;
      case 'nodes':
        renderNodesLayer(snapshot, selectedEntityId);
        break;
      case 'agents':
        renderAgentsLayer(snapshot, selectedEntityId);
        break;
    }
  }
  
  function renderCityLayer(snapshot: LivingMapSnapshot, selectedId: string | null) {
    const items = snapshot.layers?.city?.items || [];
    layoutCache = layoutCityLayer(items, canvas.width, canvas.height);
    
    items.forEach((item: any) => {
      const pos = layoutCache.get(item.id);
      if (!pos) return;
      
      const isSelected = item.id === selectedId;
      
      // Draw rectangle
      ctx.fillStyle = item.status === 'active' ? '#16a34a' : '#71717a';
      if (isSelected) ctx.fillStyle = '#3b82f6';
      ctx.fillRect(pos.x, pos.y, pos.w, pos.h);
      
      // Draw border
      ctx.strokeStyle = isSelected ? '#ffffff' : '#27272a';
      ctx.lineWidth = isSelected ? 3 : 1;
      ctx.strokeRect(pos.x, pos.y, pos.w, pos.h);
      
      // Draw text
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.name || 'Unknown', pos.x + pos.w / 2, pos.y + pos.h / 2);
      
      // Draw stats
      ctx.font = '10px sans-serif';
      ctx.fillText(
        `👤 ${item.members || 0} | 🤖 ${item.agents || 0}`,
        pos.x + pos.w / 2,
        pos.y + pos.h / 2 + 15
      );
    });
  }
  
  function renderSpaceLayer(snapshot: LivingMapSnapshot, selectedId: string | null) {
    const planets = snapshot.layers?.space?.planets || [];
    const nodes = snapshot.layers?.space?.nodes || [];
    layoutCache = layoutSpaceLayer(planets, nodes, canvas.width, canvas.height);
    
    // Draw planets
    planets.forEach((planet: any) => {
      const pos = layoutCache.get(planet.id);
      if (!pos) return;
      
      const isSelected = planet.id === selectedId;
      
      // Draw circle
      ctx.beginPath();
      ctx.arc(pos.x + pos.w / 2, pos.y + pos.h / 2, pos.w / 2, 0, Math.PI * 2);
      ctx.fillStyle = planet.type === 'dao' ? '#8b5cf6' : '#6366f1';
      if (isSelected) ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#ffffff' : '#4c1d95';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();
      
      // Draw name
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(planet.name || 'Unknown', pos.x + pos.w / 2, pos.y + pos.h / 2 + 50);
    });
    
    // Draw nodes
    nodes.forEach((node: any) => {
      const pos = layoutCache.get(node.id);
      if (!pos) return;
      
      const isSelected = node.id === selectedId;
      
      ctx.beginPath();
      ctx.arc(pos.x + pos.w / 2, pos.y + pos.h / 2, pos.w / 2, 0, Math.PI * 2);
      ctx.fillStyle = node.status === 'online' ? '#10b981' : '#ef4444';
      if (isSelected) ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#ffffff' : '#27272a';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();
    });
  }
  
  function renderNodesLayer(snapshot: LivingMapSnapshot, selectedId: string | null) {
    const items = snapshot.layers?.nodes?.items || [];
    layoutCache = layoutNodesLayer(items, canvas.width, canvas.height);
    
    items.forEach((item: any) => {
      const pos = layoutCache.get(item.id);
      if (!pos) return;
      
      const isSelected = item.id === selectedId;
      const cpu = item.metrics?.cpu || 0;
      
      // Draw square
      ctx.fillStyle = cpu > 0.8 ? '#ef4444' : cpu > 0.5 ? '#f59e0b' : '#10b981';
      if (isSelected) ctx.fillStyle = '#3b82f6';
      ctx.fillRect(pos.x, pos.y, pos.w, pos.h);
      
      ctx.strokeStyle = isSelected ? '#ffffff' : '#27272a';
      ctx.lineWidth = isSelected ? 3 : 1;
      ctx.strokeRect(pos.x, pos.y, pos.w, pos.h);
      
      // Draw CPU bar
      const barHeight = 8;
      const barWidth = pos.w * 0.8;
      const barX = pos.x + (pos.w - barWidth) / 2;
      const barY = pos.y + pos.h - barHeight - 5;
      
      ctx.fillStyle = '#27272a';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(barX, barY, barWidth * cpu, barHeight);
      
      // Draw name
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.name || 'Unknown', pos.x + pos.w / 2, pos.y + pos.h / 2);
    });
  }
  
  function renderAgentsLayer(snapshot: LivingMapSnapshot, selectedId: string | null) {
    const items = snapshot.layers?.agents?.items || [];
    layoutCache = layoutAgentsLayer(items, canvas.width, canvas.height);
    
    items.forEach((item: any) => {
      const pos = layoutCache.get(item.id);
      if (!pos) return;
      
      const isSelected = item.id === selectedId;
      
      // Draw circle
      ctx.beginPath();
      ctx.arc(pos.x + pos.w / 2, pos.y + pos.h / 2, pos.w / 2, 0, Math.PI * 2);
      
      const statusColor = 
        item.status === 'online' ? '#10b981' :
        item.status === 'idle' ? '#f59e0b' :
        '#71717a';
      
      ctx.fillStyle = isSelected ? '#3b82f6' : statusColor;
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#ffffff' : '#27272a';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();
    });
  }
  
  // Animation loop
  function loop() {
    render();
    animationFrameId = requestAnimationFrame(loop);
  }
  
  // Start rendering
  loop();
  
  // Cleanup function
  return () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
  };
}

