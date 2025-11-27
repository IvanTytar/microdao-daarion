import { apiGet } from './client';

export interface Node2Agent {
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

export interface Node2AgentsResponse {
  items: Node2Agent[];
  total: number;
  node: string;
}

const NODE2_BASE_URL = import.meta.env.VITE_NODE2_URL || 'http://localhost:8899';

// Повний список всіх агентів на НОДА2 (35-50 агентів згідно з документацією)
const ALL_NODE2_AGENTS: Node2Agent[] = [
  // ============================================
  // System Agents (БЕЗ CrewAI) - 10 агентів
  // ============================================
  {
    id: 'agent-monitor-node2',
    name: 'Monitor Agent (НОДА2)',
    role: 'System Monitoring & Event Logging (Node-2)',
    model: 'mistral-nemo:12b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    category: 'System',
    department: 'System',
    deployment_status: {
      deployed: true,
      health_check: 'healthy',
      last_check: new Date().toISOString(),
    },
  },
  {
    id: 'agent-solarius',
    name: 'Solarius',
    role: 'CEO of DAARION microDAO Node-2',
    model: 'deepseek-r1:70b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'highest',
    workspace: 'core_founders_room',
    department: 'Leadership',
  },
  {
    id: 'agent-sofia',
    name: 'Sofia',
    role: 'Chief AI Engineer & R&D Orchestrator',
    model: 'grok-4.1',
    backend: 'xai',
    status: 'active',
    node: 'node-2',
    priority: 'highest',
    workspace: 'r_and_d_lab',
    department: 'R&D',
  },
  {
    id: 'agent-primesynth',
    name: 'PrimeSynth',
    role: 'Document Architect & Structural Synthesizer',
    model: 'gpt-4.1',
    backend: 'openai',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    workspace: 'core_founders_room',
    department: 'Documentation',
  },
  {
    id: 'agent-nexor',
    name: 'Nexor',
    role: 'System Coordinator',
    model: 'deepseek-r1:70b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'System',
  },
  {
    id: 'agent-strategic-sentinels',
    name: 'Strategic Sentinels',
    role: 'Strategic Planning',
    model: 'mistral-22b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'System',
  },
  {
    id: 'agent-vindex',
    name: 'Vindex',
    role: 'Decision Maker',
    model: 'deepseek-r1:70b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'System',
  },
  {
    id: 'agent-helix',
    name: 'Helix',
    role: 'System Architect',
    model: 'deepseek-r1:70b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'System',
  },
  {
    id: 'agent-aurora',
    name: 'Aurora',
    role: 'Innovation Catalyst',
    model: 'gemma2:27b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'medium',
    department: 'System',
  },
  {
    id: 'agent-arbitron',
    name: 'Arbitron',
    role: 'Conflict Resolver',
    model: 'mistral-22b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'medium',
    department: 'System',
  },

  // ============================================
  // Engineering Crew (CrewAI) - 5 агентів
  // ============================================
  {
    id: 'agent-byteforge',
    name: 'ByteForge',
    role: 'Code Generator',
    model: 'qwen2.5-coder:72b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'Engineering',
  },
  {
    id: 'agent-vector',
    name: 'Vector',
    role: 'Vector Operations Specialist',
    model: 'starcoder2:34b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'Engineering',
  },
  {
    id: 'agent-chainweaver',
    name: 'ChainWeaver',
    role: 'Blockchain Developer',
    model: 'qwen2.5-coder:72b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'Engineering',
  },
  {
    id: 'agent-cypher',
    name: 'Cypher',
    role: 'Security Coder',
    model: 'starcoder2:34b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'Engineering',
  },
  {
    id: 'agent-canvas',
    name: 'Canvas',
    role: 'UI/UX Developer',
    model: 'qwen2.5-coder:72b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'medium',
    department: 'Engineering',
  },

  // ============================================
  // Marketing Crew (CrewAI) - 6 агентів
  // ============================================
  {
    id: 'agent-roxy',
    name: 'Roxy',
    role: 'Social Media Manager',
    model: 'mistral:7b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'Marketing',
  },
  {
    id: 'agent-mira',
    name: 'Mira',
    role: 'Content Creator',
    model: 'qwen2.5:7b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'Marketing',
  },
  {
    id: 'agent-tempo',
    name: 'Tempo',
    role: 'Campaign Manager',
    model: 'gpt-oss:latest',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'medium',
    department: 'Marketing',
  },
  {
    id: 'agent-harmony',
    name: 'Harmony',
    role: 'Brand Manager',
    model: 'mistral:7b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'medium',
    department: 'Marketing',
  },
  {
    id: 'agent-faye',
    name: 'Faye',
    role: 'Community Manager',
    model: 'qwen2.5:7b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'medium',
    department: 'Marketing',
  },
  {
    id: 'agent-storytelling',
    name: 'Storytelling',
    role: 'Story Creator',
    model: 'qwen2.5:7b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'medium',
    department: 'Marketing',
  },

  // ============================================
  // Finance Crew (CrewAI) - 4 агенти
  // ============================================
  {
    id: 'agent-financial-analyst',
    name: 'Financial Analyst',
    role: 'Financial Analysis & Reporting',
    model: 'mistral:7b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'Finance',
  },
  {
    id: 'agent-accountant',
    name: 'Accountant',
    role: 'Accounting & Bookkeeping',
    model: 'qwen2.5:7b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'medium',
    department: 'Finance',
  },
  {
    id: 'agent-budget-planner',
    name: 'Budget Planner',
    role: 'Budget Planning & Forecasting',
    model: 'mistral:7b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'medium',
    department: 'Finance',
  },
  {
    id: 'agent-tax-advisor',
    name: 'Tax Advisor',
    role: 'Tax Planning & Compliance',
    model: 'qwen2.5:7b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'low',
    department: 'Finance',
  },

  // ============================================
  // Web3 Crew (CrewAI) - 5 агентів
  // ============================================
  {
    id: 'agent-smart-contract-dev',
    name: 'Smart Contract Dev',
    role: 'Smart Contract Developer',
    model: 'qwen2.5-coder:72b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'Web3',
  },
  {
    id: 'agent-defi-analyst',
    name: 'DeFi Analyst',
    role: 'DeFi Protocol Analyst',
    model: 'deepseek-r1:70b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'Web3',
  },
  {
    id: 'agent-tokenomics-expert',
    name: 'Tokenomics Expert',
    role: 'Tokenomics Design & Analysis',
    model: 'deepseek-r1:70b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'medium',
    department: 'Web3',
  },
  {
    id: 'agent-nft-specialist',
    name: 'NFT Specialist',
    role: 'NFT Development & Strategy',
    model: 'qwen2.5-coder:72b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'medium',
    department: 'Web3',
  },
  {
    id: 'agent-dao-governance',
    name: 'DAO Governance',
    role: 'DAO Governance & Voting',
    model: 'deepseek-r1:70b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'Web3',
  },

  // ============================================
  // Security Overwatch Crew (CrewAI) - 5 агентів
  // ============================================
  {
    id: 'agent-shadelock',
    name: 'Shadelock',
    role: 'Security Auditor',
    model: 'qwen2.5-coder:72b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'Security',
  },
  {
    id: 'agent-exor',
    name: 'Exor',
    role: 'Threat Analyst',
    model: 'deepseek-r1:70b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'Security',
  },
  {
    id: 'agent-penetration-tester',
    name: 'Penetration Tester',
    role: 'Penetration Testing & Vulnerability Assessment',
    model: 'qwen2.5-coder:72b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'Security',
  },
  {
    id: 'agent-security-monitor',
    name: 'Security Monitor',
    role: 'Security Monitoring & Incident Detection',
    model: 'deepseek-r1:70b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'Security',
  },
  {
    id: 'agent-incident-responder',
    name: 'Incident Responder',
    role: 'Incident Response & Recovery',
    model: 'deepseek-r1:70b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'Security',
  },

  // ============================================
  // Crypto Forensics Crew (CrewAI) - 2 агенти
  // ============================================
  {
    id: 'agent-shadelock-forensics',
    name: 'Shadelock (Forensics)',
    role: 'Blockchain Forensics',
    model: 'qwen2.5-coder:72b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'Crypto Forensics',
  },
  {
    id: 'agent-exor-forensics',
    name: 'Exor (Forensics)',
    role: 'Crypto Investigator',
    model: 'deepseek-r1:70b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'Crypto Forensics',
  },

  // ============================================
  // Vision Crew (CrewAI) - 4 агенти
  // ============================================
  {
    id: 'agent-iris',
    name: 'Iris',
    role: 'Image Analyzer',
    model: 'qwen2-vl:32b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'Vision',
  },
  {
    id: 'agent-lumen',
    name: 'Lumen',
    role: 'Visual Content Creator',
    model: 'qwen2-vl:32b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'Vision',
  },
  {
    id: 'agent-spectra',
    name: 'Spectra',
    role: 'Multimodal Processor',
    model: 'qwen3-vl:latest',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'Vision',
  },
  {
    id: 'agent-video-analyzer',
    name: 'Video Analyzer',
    role: 'Video Analysis & Processing',
    model: 'qwen2-vl:32b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'medium',
    department: 'Vision',
  },

  // ============================================
  // R&D Lab Agents - 6 агентів
  // ============================================
  {
    id: 'agent-protomind',
    name: 'ProtoMind',
    role: 'Experimental Architect',
    model: 'deepseek-r1:70b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    workspace: 'r_and_d_lab',
    department: 'R&D',
  },
  {
    id: 'agent-labforge',
    name: 'LabForge',
    role: 'R&D Agent Builder',
    model: 'qwen2.5-coder:32b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    workspace: 'r_and_d_lab',
    department: 'R&D',
  },
  {
    id: 'agent-testpilot',
    name: 'TestPilot',
    role: 'Experimental Tester',
    model: 'mistral-nemo:12b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'medium',
    workspace: 'r_and_d_lab',
    department: 'R&D',
  },
  {
    id: 'agent-modelscout',
    name: 'ModelScout',
    role: 'New Models Explorer',
    model: 'gemma2:27b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'medium',
    workspace: 'r_and_d_lab',
    department: 'R&D',
  },
  {
    id: 'agent-breakpoint',
    name: 'BreakPoint',
    role: 'Red-team Developer',
    model: 'deepseek-coder:33b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    workspace: 'r_and_d_lab',
    department: 'R&D',
  },
  {
    id: 'agent-growcell',
    name: 'GrowCell',
    role: 'AI Evolution Agent',
    model: 'phi3:latest',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'medium',
    workspace: 'r_and_d_lab',
    department: 'R&D',
  },

  // ============================================
  // Somnia (БЕЗ CrewAI) - 1 агент
  // ============================================
  {
    id: 'agent-somnia',
    name: 'Somnia',
    role: 'Subconscious Memory',
    model: 'qwen2.5:7b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'Memory',
  },

  // ============================================
  // Memory Agents (БЕЗ CrewAI) - 2 агенти
  // ============================================
  {
    id: 'agent-memory-manager',
    name: 'Memory Manager',
    role: 'Memory Management & Indexing',
    model: 'gemma2:2b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    department: 'Memory',
  },
  {
    id: 'agent-knowledge-indexer',
    name: 'Knowledge Indexer',
    role: 'Knowledge Base Indexing',
    model: 'phi3:latest',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'medium',
    department: 'Memory',
  },
];

export async function getNode2Agents(): Promise<Node2AgentsResponse> {
  try {
    // Спробувати отримати з API
    const response = await apiGet<{ agents: Node2Agent[] }>(`${NODE2_BASE_URL}/api/agents`);
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
        node: 'node-2',
      };
    }
  } catch (error) {
    console.warn('Failed to fetch agents from API, using static list:', error);
  }

  // Fallback: повертаємо статичний список з перевіркою статусу
  const agentsWithStatus = await Promise.all(
    ALL_NODE2_AGENTS.map(async (agent) => {
      const deploymentStatus = await checkAgentDeploymentStatus(agent.id);
      return {
        ...agent,
        deployment_status: deploymentStatus,
        status: (deploymentStatus?.deployed ? 'deployed' : 'not_deployed') as 'active' | 'inactive' | 'deployed' | 'not_deployed',
      };
    })
  );

  return {
    items: agentsWithStatus,
    total: agentsWithStatus.length,
    node: 'node-2',
  };
}

async function checkAgentDeploymentStatus(
  agentId: string
): Promise<Node2Agent['deployment_status']> {
  try {
    // Перевірка через health endpoint
    const healthUrl = `${NODE2_BASE_URL}/api/agent/${agentId}/health`;
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
      const agentsResponse = await fetch(`${NODE2_BASE_URL}/api/agents`);
      if (agentsResponse.ok) {
        const data = await agentsResponse.json();
        const agent = data.agents?.find((a: Node2Agent) => a.id === agentId);
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

export async function getAgentDeploymentStatus(agentId: string): Promise<Node2Agent['deployment_status']> {
  return checkAgentDeploymentStatus(agentId);
}

