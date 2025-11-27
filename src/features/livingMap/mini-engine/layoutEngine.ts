/**
 * Layout Engine for Living Map 2D
 * Phase 9B: Positioning algorithms for different layers
 */

export interface Position {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type LayoutMap = Map<string, Position>;

/**
 * Layout City Layer (Grid layout)
 */
export function layoutCityLayer(
  items: Array<{ id: string; name: string }>,
  width: number,
  height: number
): LayoutMap {
  const map = new Map<string, Position>();
  const cols = Math.ceil(Math.sqrt(items.length));
  const rows = Math.ceil(items.length / cols);
  const cellWidth = width / cols;
  const cellHeight = height / rows;
  const padding = 20;
  
  items.forEach((item, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    
    map.set(item.id, {
      x: col * cellWidth + padding,
      y: row * cellHeight + padding,
      w: cellWidth - padding * 2,
      h: cellHeight - padding * 2
    });
  });
  
  return map;
}

/**
 * Layout Space Layer (Circular orbits for planets and nodes)
 */
export function layoutSpaceLayer(
  planets: Array<{ id: string; name: string; orbits?: string[] }>,
  nodes: Array<{ id: string; name: string }>,
  width: number,
  height: number
): LayoutMap {
  const map = new Map<string, Position>();
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) / 2 - 100;
  
  // Place planets in circular layout
  planets.forEach((planet, idx) => {
    const angle = (idx / planets.length) * Math.PI * 2;
    const radius = maxRadius * 0.6;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    map.set(planet.id, {
      x: x - 40,
      y: y - 40,
      w: 80,
      h: 80
    });
    
    // Place nodes on orbit around planet
    if (planet.orbits && planet.orbits.length > 0) {
      planet.orbits.forEach((nodeId, nIdx) => {
        const nodeAngle = (nIdx / planet.orbits!.length) * Math.PI * 2;
        const orbitRadius = 100;
        const nx = x + Math.cos(nodeAngle) * orbitRadius;
        const ny = y + Math.sin(nodeAngle) * orbitRadius;
        
        map.set(nodeId, {
          x: nx - 20,
          y: ny - 20,
          w: 40,
          h: 40
        });
      });
    }
  });
  
  // Place unassigned nodes
  nodes.forEach((node, idx) => {
    if (!map.has(node.id)) {
      const angle = (idx / nodes.length) * Math.PI * 2;
      const radius = maxRadius * 0.9;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      map.set(node.id, {
        x: x - 20,
        y: y - 20,
        w: 40,
        h: 40
      });
    }
  });
  
  return map;
}

/**
 * Layout Nodes Layer (Grid with load-based size)
 */
export function layoutNodesLayer(
  nodes: Array<{ id: string; name: string; metrics?: { cpu?: number } }>,
  width: number,
  height: number
): LayoutMap {
  const map = new Map<string, Position>();
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const rows = Math.ceil(nodes.length / cols);
  const cellWidth = width / cols;
  const cellHeight = height / rows;
  const padding = 30;
  
  nodes.forEach((node, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    
    // Size based on CPU load (if available)
    const load = node.metrics?.cpu || 0;
    const size = 40 + load * 40; // 40-80px
    
    map.set(node.id, {
      x: col * cellWidth + (cellWidth - size) / 2,
      y: row * cellHeight + (cellHeight - size) / 2,
      w: size,
      h: size
    });
  });
  
  return map;
}

/**
 * Layout Agents Layer (Spiral layout)
 */
export function layoutAgentsLayer(
  agents: Array<{ id: string; name: string }>,
  width: number,
  height: number
): LayoutMap {
  const map = new Map<string, Position>();
  const centerX = width / 2;
  const centerY = height / 2;
  const spiralSpacing = 30;
  
  agents.forEach((agent, idx) => {
    const angle = idx * 0.5; // Spiral angle
    const radius = Math.sqrt(idx) * spiralSpacing;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    map.set(agent.id, {
      x: x - 15,
      y: y - 15,
      w: 30,
      h: 30
    });
  });
  
  return map;
}

