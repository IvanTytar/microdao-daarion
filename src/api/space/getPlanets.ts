/**
 * Space Planets API
 * 
 * API для отримання інформації про DAO-планети
 */

import { apiGet } from '../client';

export interface SpacePlanetSatellite {
  node_id: string;
  gpu_load: number;
  latency: number;
  agents: number;
}

export interface SpacePlanet {
  dao_id: string;
  name: string;
  health: 'good' | 'warn' | 'critical';
  treasury: number;
  activity: number; // 0-1
  governance_temperature: number;
  anomaly_score: number;
  position: { x: number; y: number; z: number };
  node_count: number;
  satellites: SpacePlanetSatellite[];
}

export async function getPlanets(): Promise<SpacePlanet[]> {
  return await apiGet<SpacePlanet[]>('/space/planets');
}





