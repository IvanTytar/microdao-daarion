/**
 * Маппінг між агентами-оркестраторами та мікроДАО
 */

export interface AgentMicroDaoMapping {
  agentId: string;
  microDaoId: string;
  microDaoSlug: string;
  microDaoName: string;
  description?: string;
  crewEnabled?: boolean;
  crewAgents?: string[];
}

// Маппінг агентів-оркестраторів до мікроДАО
export const AGENT_MICRODAO_MAPPING: AgentMicroDaoMapping[] = [
  {
    agentId: 'greenfood',
    microDaoId: 'greenfood-dao',
    microDaoSlug: 'greenfood',
    microDaoName: 'GREENFOOD',
    description: 'ERP-система з 13 AI-агентами для крафтових виробників продуктів харчування',
    crewEnabled: true,
    crewAgents: [
      'product_catalog',
      'batch_quality',
      'vendor_success',
      'warehouse',
      'logistics_delivery',
      'seller',
      'customer_care',
      'finance_pricing',
      'smm_campaigns',
      'seo_web',
      'analytics_bi',
      'compliance_audit',
    ],
  },
  {
    agentId: 'daarwizz',
    microDaoId: 'daarion-dao',
    microDaoSlug: 'daarion',
    microDaoName: 'DAARION',
  },
  {
    agentId: 'helion',
    microDaoId: 'energy-union-dao',
    microDaoSlug: 'energy-union',
    microDaoName: 'ENERGY UNION',
    description: 'Платформа для енергетичних рішень та управління енергопостачанням',
  },
  {
    agentId: 'yaromir',
    microDaoId: 'yaromir-dao',
    microDaoSlug: 'yaromir',
    microDaoName: 'Yaromir',
    description: 'Багатовимірна мета-сущність свідомості з CrewAI оркестратором',
    crewEnabled: true,
    crewAgents: ['vozhd', 'provodnik', 'domir', 'sozdatel'],
  },
];

/**
 * Отримати мікроДАО за ID агента-оркестратора
 */
export function getMicroDaoByAgentId(agentId: string): AgentMicroDaoMapping | undefined {
  return AGENT_MICRODAO_MAPPING.find(mapping => mapping.agentId === agentId);
}

/**
 * Отримати агента-оркестратора за ID мікроДАО
 */
export function getAgentByMicroDaoId(microDaoId: string): AgentMicroDaoMapping | undefined {
  return AGENT_MICRODAO_MAPPING.find(
    mapping => 
      mapping.microDaoId === microDaoId || 
      mapping.microDaoSlug === microDaoId
  );
}

/**
 * Перевірити чи агент є оркестратором мікроДАО
 */
export function isAgentOrchestrator(agentId: string): boolean {
  return AGENT_MICRODAO_MAPPING.some(mapping => mapping.agentId === agentId);
}

/**
 * Перевірити чи мікроДАО має оркестратора
 */
export function hasOrchestrator(microDaoId: string): boolean {
  return AGENT_MICRODAO_MAPPING.some(
    mapping => 
      mapping.microDaoId === microDaoId || 
      mapping.microDaoSlug === microDaoId
  );
}

/**
 * Отримати список мікроДАО (ID та назви)
 */
export function getAllMicroDaos(): AgentMicroDaoMapping[] {
  return AGENT_MICRODAO_MAPPING;
}

/**
 * Визначити чи агент належить конкретному мікроДАО
 */
export function getAgentMicroDao(agent: { id: string; department?: string; category?: string }): string | null {
  // 1. GREENFOOD - department: 'GreenFood'
  if (agent.department === 'GreenFood' || agent.category === 'GreenFood') {
    return 'greenfood-dao';
  }
  
  // 2. ENERGY UNION - Helion
  if (agent.id === 'agent-helion' || agent.department === 'Energy') {
    return 'energy-union-dao';
  }
  
  // 3. Yaromir - Yaromir та його команда
  if (agent.id.includes('yaromir') || agent.id.includes('vozhd') || 
      agent.id.includes('provodnik') || agent.id.includes('domir') || 
      agent.id.includes('sozdatel')) {
    return 'yaromir-dao';
  }
  
  // 4. DAARION - всі інші агенти за замовчуванням
  return 'daarion-dao';
}

