/**
 * City Dashboard Types (New Implementation)
 * 
 * Типи для повного City Dashboard з HUD + Sectors
 */

// ============================================================================
// City Snapshot
// ============================================================================

/**
 * Повний знімок міста для City Dashboard
 */
export interface CitySnapshot {
  user: CityUser;
  microdao: CityMicroDAO | null;
  nodes: CityNode[];
  metrics: CityMetrics;
  events: CityEvent[];
  agents: CityAgentSummary[];
  quests: CityQuestSummary[];
}

export interface CityUser {
  id: string;
  handle: string;
  archetype: string;
  microdaoId: string | null;
}

export interface CityMicroDAO {
  id: string;
  name: string;
  members: number;
  humans: number;
  agents: number;
  balanceDcr: number;
  activity24h: number;
}

export interface CityNode {
  id: string;
  label: string;
  gpuLoad: number; // 0..1
  latencyMs: number;
  agents: number;
  status: 'healthy' | 'warn' | 'critical';
}

export interface CityMetrics {
  activityIndex: number;
  avgAgentLatencyMs: number;
  natsTps: number;
  nodeAvgLoad: number;
  errorRate: number;
  questEngagement: number;
}

export interface CityEvent {
  id: string;
  type: 'dao' | 'node' | 'matrix' | 'quest' | 'system';
  label: string;
  timestamp: string;
  severity: 'info' | 'warn' | 'error';
}

export interface CityAgentSummary {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'offline' | 'busy';
  lastAction?: string;
}

export interface CityQuestSummary {
  id: string;
  label: string;
  progress: number; // 0..1
}





