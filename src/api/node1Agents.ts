import { apiGet } from './client';

export interface Node1Agent {
  id: string;
  name: string;
  role: string;
  model: string;
  backend: 'ollama' | 'xai' | 'openai' | 'local';
  status: 'active' | 'inactive' | 'deployed' | 'not_deployed';
  node: string;
  priority: 'highest' | 'high' | 'medium' | 'low';
  workspace?: string;
  department?: string;
  category?: string;
  type?: 'worker' | 'orchestrator';
  deployment_status?: {
    deployed: boolean;
    health_check?: 'healthy' | 'unhealthy' | 'unknown';
    last_check?: string;
  };
}

export interface Node1AgentsResponse {
  items: Node1Agent[];
  total: number;
  node: string;
}

const NODE1_BASE_URL = import.meta.env.VITE_NODE1_URL || 'http://144.76.224.179:8899';

// Повний список всіх агентів на НОДА1 (з документації)
const ALL_NODE1_AGENTS: Node1Agent[] = [
  // ============================================
  // Core Agents - 6 агентів
  // ============================================
  {
    id: 'agent-daarwizz',
    name: 'Daarwizz',
    role: 'Main User Interface Agent',
    model: 'local_qwen3_8b',
    backend: 'local',
    status: 'active',
    node: 'node-1',
    priority: 'high',
    category: 'Core',
    type: 'worker',
    department: 'Core',
  },
  {
    id: 'agent-devtools',
    name: 'DevTools Agent',
    role: 'Code Analysis, Testing, Git Operations',
    model: 'local_qwen3_8b',
    backend: 'local',
    status: 'active',
    node: 'node-1',
    priority: 'high',
    category: 'Core',
    type: 'worker',
    department: 'Core',
  },
  {
    id: 'agent-microdao-orchestrator',
    name: 'MicroDAO Orchestrator',
    role: 'Workflow Coordination',
    model: 'local_qwen3_8b',
    backend: 'local',
    status: 'active',
    node: 'node-1',
    priority: 'highest',
    category: 'Core',
    type: 'orchestrator',
    department: 'Core',
  },
  {
    id: 'agent-monitor-node1',
    name: 'Monitor Agent (НОДА1)',
    role: 'System Monitoring & Event Logging (Node-1)',
    model: 'mistral-nemo:12b',
    backend: 'ollama',
    status: 'active',
    node: 'node-1',
    priority: 'high',
    category: 'System',
    type: 'worker',
    department: 'System',
    deployment_status: {
      deployed: true,
      health_check: 'healthy',
      last_check: new Date().toISOString(),
    },
  },
  {
    id: 'agent-tokenomics-advisor',
    name: 'Tokenomics Advisor',
    role: 'Tokenomics Analysis & Strategy',
    model: 'local_qwen3_8b',
    backend: 'local',
    status: 'active',
    node: 'node-1',
    priority: 'medium',
    category: 'Core',
    type: 'worker',
    department: 'Core',
  },
  {
    id: 'agent-greenfood-assistant',
    name: 'GREENFOOD Assistant',
    role: 'GREENFOOD ERP Orchestrator',
    model: 'local_qwen3_8b',
    backend: 'local',
    status: 'active',
    node: 'node-1',
    priority: 'high',
    category: 'GreenFood',
    type: 'orchestrator',
    department: 'GreenFood',
  },
  {
    id: 'agent-helion',
    name: 'Helion',
    role: 'Energy Union Agent',
    model: 'local_qwen3_8b',
    backend: 'local',
    status: 'active',
    node: 'node-1',
    priority: 'high',
    category: 'Platform',
    type: 'orchestrator',
    department: 'Energy',
  },
  // ============================================
  // Platform Agents - 5 агентів
  // ============================================
  {
    id: 'agent-druid',
    name: 'DRUID',
    role: 'Nature & Ecology Agent',
    model: 'qwen3:8b',
    backend: 'ollama',
    status: 'active',
    node: 'node-1',
    priority: 'high',
    category: 'Platform',
    type: 'orchestrator',
    department: 'Ecology',
  },
  {
    id: 'agent-eonarch',
    name: 'EONARCH',
    role: 'Time & Evolution Architect',
    model: 'deepseek-chat',
    backend: 'ollama',
    status: 'active',
    node: 'node-1',
    priority: 'high',
    category: 'Platform',
    type: 'orchestrator',
    department: 'Evolution',
  },
  {
    id: 'agent-yaromir',
    name: 'Yaromir',
    role: 'Yaromir MicroDAO Orchestrator',
    model: 'qwen2.5:14b',
    backend: 'ollama',
    status: 'active',
    node: 'node-1',
    priority: 'highest',
    category: 'Platform',
    type: 'orchestrator',
    department: 'Yaromir',
  },
  {
    id: 'agent-dario',
    name: 'Dario',
    role: 'City Services Agent',
    model: 'qwen3:8b',
    backend: 'ollama',
    status: 'active',
    node: 'node-1',
    priority: 'medium',
    category: 'Platform',
    type: 'worker',
    department: 'CityServices',
  },
  {
    id: 'agent-nutra',
    name: 'NUTRA',
    role: 'Health & Nutrition Agent',
    model: 'qwen3:8b',
    backend: 'ollama',
    status: 'active',
    node: 'node-1',
    priority: 'medium',
    category: 'Platform',
    type: 'worker',
    department: 'Health',
  },
];

export async function getNode1Agents(): Promise<Node1AgentsResponse> {
  try {
    // Спробувати отримати з API
    const response = await apiGet<{ agents: Node1Agent[] }>(`${NODE1_BASE_URL}/api/agents`);
    if (response && 'agents' in response && Array.isArray(response.agents)) {
      return {
        items: response.agents.map(agent => ({
          ...agent,
          deployment_status: {
            deployed: agent.status === 'active' || agent.status === 'deployed',
            health_check: 'unknown',
          },
        })),
        total: response.agents.length,
        node: 'node-1',
      };
    }
  } catch (error) {
    console.warn('Failed to fetch agents from API, using static list:', error);
  }

  // Fallback: повертаємо статичний список з перевіркою статусу
  const agentsWithStatus = await Promise.all(
    ALL_NODE1_AGENTS.map(async (agent) => {
      const deploymentStatus = await checkAgentDeploymentStatus(agent.id);
      return {
        ...agent,
        deployment_status: deploymentStatus,
        status: deploymentStatus.deployed ? 'deployed' : 'not_deployed',
      };
    })
  );

  return {
    items: agentsWithStatus,
    total: agentsWithStatus.length,
    node: 'node-1',
  };
}

async function checkAgentDeploymentStatus(
  agentId: string
): Promise<Node1Agent['deployment_status']> {
  try {
    // Перевірка через health endpoint
    const healthUrl = `${NODE1_BASE_URL}/api/agent/${agentId}/health`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        deployed: true,
        health_check: data.status === 'healthy' ? 'healthy' : 'unhealthy',
        last_check: new Date().toISOString(),
      };
    }
  } catch (error) {
    // Якщо endpoint не доступний, перевіряємо через загальний список агентів
    try {
      const agentsResponse = await fetch(`${NODE1_BASE_URL}/api/agents`);
      if (agentsResponse.ok) {
        const data = await agentsResponse.json();
        const agent = data.agents?.find((a: Node1Agent) => a.id === agentId);
        if (agent) {
          return {
            deployed: true,
            health_check: 'unknown',
            last_check: new Date().toISOString(),
          };
        }
      }
    } catch {
      // Ignore
    }
  }

  return {
    deployed: false,
    health_check: 'unknown',
    last_check: new Date().toISOString(),
  };
}

export async function getAgentDeploymentStatus(agentId: string): Promise<Node1Agent['deployment_status']> {
  return checkAgentDeploymentStatus(agentId);
}

