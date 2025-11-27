/**
 * Space Nodes API
 * 
 * API для отримання інформації про ноди в космічній мережі
 */

import { apiGet } from '../client';

export interface SpaceNodeGpu {
  load: number;
  vram_used: number;
  vram_total: number;
  temperature: number;
}

export interface SpaceNodeCpu {
  load: number;
  temperature: number;
}

export interface SpaceNodeMemory {
  used: number;
  total: number;
}

export interface SpaceNodeNetwork {
  latency: number;
  bandwidth_in: number;
  bandwidth_out: number;
  packet_loss: number;
}

export interface SpaceNode {
  node_id: string;
  name: string;
  microdao: string;
  gpu: SpaceNodeGpu;
  cpu: SpaceNodeCpu;
  memory: SpaceNodeMemory;
  network: SpaceNodeNetwork;
  agents: number;
  status: 'healthy' | 'degraded' | 'offline';
}

export async function getNodes(): Promise<SpaceNode[]> {
  return await apiGet<SpaceNode[]>('/space/nodes');
}





