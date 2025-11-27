/**
 * Monitor Agent Factory - Стандартизація створення Monitor Agent
 * 
 * Автоматично створює Monitor Agent для:
 * - Кожної нової НОДИ (monitor-node-{node_id})
 * - Кожного нового мікроДАО (monitor-microdao-{microdao_id})
 * - Загальний Monitor Agent для DAARION (monitor)
 */

export interface MonitorAgentConfig {
  id: string;
  name: string;
  node_id?: string;
  microdao_id?: string;
  model: string;
  backend: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  department: string;
}

/**
 * Створити Monitor Agent для НОДИ
 */
export function createNodeMonitorAgent(nodeId: string, nodeName: string): MonitorAgentConfig {
  return {
    id: `agent-monitor-${nodeId}`,
    name: `Monitor Agent (${nodeName})`,
    node_id: nodeId,
    model: 'mistral-nemo:12b',
    backend: 'ollama',
    priority: 'high',
    category: 'System',
    department: 'System',
  };
}

/**
 * Створити Monitor Agent для мікроДАО
 */
export function createMicroDaoMonitorAgent(microDaoId: string, microDaoName: string): MonitorAgentConfig {
  return {
    id: `agent-monitor-microdao-${microDaoId}`,
    name: `Monitor Agent (${microDaoName})`,
    microdao_id: microDaoId,
    model: 'mistral-nemo:12b',
    backend: 'ollama',
    priority: 'high',
    category: 'System',
    department: 'System',
  };
}

/**
 * Створити загальний Monitor Agent для DAARION
 */
export function createGlobalMonitorAgent(): MonitorAgentConfig {
  return {
    id: 'agent-monitor',
    name: 'Monitor Agent (DAARION)',
    model: 'mistral-nemo:12b',
    backend: 'ollama',
    priority: 'highest',
    category: 'System',
    department: 'System',
  };
}

/**
 * Отримати URL для чату з Monitor Agent
 */
export function getMonitorAgentChatUrl(agentId: string, nodeId?: string, microDaoId?: string): string {
  const MONITOR_SERVICE_URL = import.meta.env.VITE_MONITOR_SERVICE_URL || 'http://localhost:9500';
  
  if (nodeId) {
    return `${MONITOR_SERVICE_URL}/api/agent/monitor-node-${nodeId}/chat`;
  }
  
  if (microDaoId) {
    return `${MONITOR_SERVICE_URL}/api/agent/monitor-microdao-${microDaoId}/chat`;
  }
  
  // Загальний Monitor Agent
  return `${MONITOR_SERVICE_URL}/api/agent/monitor/chat`;
}

/**
 * Перевірити чи існує Monitor Agent для ноди
 */
export function hasNodeMonitorAgent(nodeId: string, agents: Array<{ id: string }>): boolean {
  return agents.some(agent => agent.id === `agent-monitor-${nodeId}`);
}

/**
 * Перевірити чи існує Monitor Agent для мікроДАО
 */
export function hasMicroDaoMonitorAgent(microDaoId: string, agents: Array<{ id: string }>): boolean {
  return agents.some(agent => agent.id === `agent-monitor-microdao-${microDaoId}`);
}

