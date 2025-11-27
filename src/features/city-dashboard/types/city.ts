/**
 * City Dashboard Types
 *
 * Типи для головної панелі DAARION.city
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Зони міста
 */
export type CityZone =
  | 'core'          // Центральна зона
  | 'microdao'      // Квартал MicroDAO
  | 'platform'      // Платформна зона
  | 'agent-hub'     // Хаб агентів
  | 'node-network'; // Мережа нод

/**
 * Статуси нод
 */
export type NodeStatus =
  | 'online'
  | 'offline'
  | 'degraded'
  | 'maintenance';

/**
 * Типи агентів
 */
export type AgentType =
  | 'core-agent'      // Системні агенти
  | 'platform-agent'  // Платформні агенти
  | 'dao-agent'       // DAO агенти
  | 'service-agent'   // Сервісні агенти
  | 'user-agent';     // Особисті агенти

/**
 * Типи подій
 */
export type CityEventType =
  | 'microdao_created'
  | 'agent_deployed'
  | 'node_joined'
  | 'node_left'
  | 'transaction_completed'
  | 'quest_completed'
  | 'alert_triggered'
  | 'metrics.raw.*'
  | 'metrics.node.*'
  | 'metrics.microdao.*'
  | 'metrics.global.*'
  | 'alerts.*'
  | 'metrics.reconciled.*'
  | 'alerts.reconciler.*';

// ============================================================================
// Data Interfaces
// ============================================================================

/**
 * Статистика міста
 */
export interface CityStats {
  microdaos: number;
  agents: number;
  nodes: number;
  activeUsers: number;
  transactions24h: number;
  daarBalance: string;
  trends: {
    microdaos: number;    // +/- від попереднього дня
    agents: number;
    users: number;
    transactions: number;
  };
}

/**
 * Інформація про зону міста
 */
export interface CityZoneInfo {
  id: CityZone;
  name: string;
  description: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  color: string;
  count: number;  // кількість елементів у зоні
  status: 'active' | 'building' | 'planned';
}

/**
 * Інформація про MicroDAO
 */
export interface MicroDAOInfo {
  id: string;
  name: string;
  description: string;
  logo?: string;
  members: number;
  agents: number;
  status: 'active' | 'forming' | 'archived';
  type: 'public' | 'confidential' | 'platform';
  createdAt: string;
  lastActivity: string;
}

/**
 * Інформація про ноду
 */
export interface NodeInfo {
  id: string;
  name: string;
  status: NodeStatus;
  location: string;
  specs: {
    cpu: number;      // cores
    ram: number;      // GB
    gpu?: string;     // GPU model
    storage: number;  // GB
  };
  metrics: {
    cpuUsage: number;     // %
    ramUsage: number;     // %
    gpuUsage?: number;    // %
    diskUsage: number;    // %
    networkIn: number;    // MB/s
    networkOut: number;   // MB/s
  };
  agents: number;
  services: number;
  uptime: string;
}

/**
 * Інформація про агента
 */
export interface AgentInfo {
  id: string;
  name: string;
  type: AgentType;
  role: string;
  avatar?: string;
  status: 'active' | 'idle' | 'offline' | 'error';
  department?: string;
  node?: string;
  microDao?: string;
  lastActivity: string;
  metrics: {
    requests: number;     // за день
    successRate: number;  // %
    avgResponseTime: number; // ms
    errors24h: number;
  };
}

/**
 * Подія міста
 */
export interface CityEvent {
  id: string;
  type: CityEventType;
  title: string;
  description: string;
  timestamp: string;
  data: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Відповідь на запит статистики міста
 */
export interface CityStatsResponse {
  stats: CityStats;
  zones: CityZoneInfo[];
}

/**
 * Відповідь на запит MicroDAO
 */
export interface MicroDAOsResponse {
  items: MicroDAOInfo[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Відповідь на запит нод
 */
export interface NodesResponse {
  items: NodeInfo[];
  total: number;
}

/**
 * Відповідь на запит агентів
 */
export interface AgentsResponse {
  items: AgentInfo[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Відповідь на запит подій
 */
export interface CityEventsResponse {
  items: CityEvent[];
  total: number;
}

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * Результат хука CityStats
 */
export interface UseCityStatsResult {
  stats: CityStats | null;
  zones: CityZoneInfo[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Результат хука MicroDAOs
 */
export interface UseMicroDAOsResult {
  items: MicroDAOInfo[];
  total: number;
  loading: boolean;
  error: string | null;
  loadMore: () => void;
  hasMore: boolean;
}

/**
 * Результат хука Nodes
 */
export interface UseNodesResult {
  items: NodeInfo[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Результат хука Agents
 */
export interface UseAgentsResult {
  items: AgentInfo[];
  total: number;
  loading: boolean;
  error: string | null;
  loadMore: () => void;
  hasMore: boolean;
  filters: AgentFilters;
  setFilters: (filters: Partial<AgentFilters>) => void;
}

/**
 * Результат хука CityEvents
 */
export interface UseCityEventsResult {
  events: CityEvent[];
  loading: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  isConnected: boolean;
}

// ============================================================================
// Filter Types
// ============================================================================

/**
 * Фільтри для агентів
 */
export interface AgentFilters {
  type?: AgentType;
  status?: AgentInfo['status'];
  department?: string;
  node?: string;
  search?: string;
}

// ============================================================================
// City Snapshot (for new City Dashboard)
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

// ============================================================================
// UI State Types
// ============================================================================

/**
 * Стан City Dashboard
 */
export interface CityDashboardState {
  selectedZone: CityZone | null;
  selectedMicroDAO: string | null;
  selectedNode: string | null;
  selectedAgent: string | null;
  mapZoom: number;
  mapCenter: { x: number; y: number };
  filters: {
    agents: AgentFilters;
    microdaos: {
      type?: MicroDAOInfo['type'];
      status?: MicroDAOInfo['status'];
      search?: string;
    };
  };
}

