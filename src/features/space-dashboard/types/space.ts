/**
 * Space Dashboard Types
 */

import type {
  NodeInfo as CityNodeInfo,
  MicroDAOInfo,
  AgentInfo,
  CityEvent,
} from '../../city-dashboard/types/city';

export type SpaceId = string;

export interface SpacePosition {
  x: number;
  y: number;
  radius?: number;
}

export interface SpaceObjectBase {
  id: SpaceId;
  name: string;
  type: string;
  position: SpacePosition;
  status?: 'stable' | 'warning' | 'critical';
}

export interface StarObject extends SpaceObjectBase {
  type: 'star';
  nodeId: string;
  health: number; // 0-100
  microDaos: number;
  agents: number;
}

export interface PlanetObject extends SpaceObjectBase {
  type: 'planet';
  microDaoId: string;
  population: number;
  agents: number;
  orbitRadius: number;
  starId: SpaceId;
}

export interface MoonObject extends SpaceObjectBase {
  type: 'moon';
  agentId: string;
  focus: string;
  planetId: SpaceId;
  orbitRadius: number;
}

export interface GatewayObject extends SpaceObjectBase {
  type: 'gateway';
  integration: string;
}

export interface AnomalyObject extends SpaceObjectBase {
  type: 'anomaly';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface SpaceCluster extends SpaceObjectBase {
  type: 'cluster';
  clusterId: string;
  nodes: number;
  microDaos: number;
  agents: number;
  density: number; // 0-1
  description?: string;
}

export interface SpaceScene {
  clusters: SpaceCluster[];
  stars: StarObject[];
  planets: PlanetObject[];
  moons: MoonObject[];
  gateways: GatewayObject[];
  anomalies: AnomalyObject[];
}

export interface SpaceSourceData {
  nodes: CityNodeInfo[];
  microDaos: MicroDAOInfo[];
  agents: AgentInfo[];
  events: CityEvent[];
}

