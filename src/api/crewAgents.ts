/**
 * API для отримання CrewAI команди агентів
 */

import { apiGet } from './client';

export interface CrewAgent {
  id: string;
  name: string;
  role: string;
  description?: string;
  category?: string;
}

export interface CrewAgentsResponse {
  orchestrator_id: string;
  orchestrator_name: string;
  crew_enabled: boolean;
  agents: CrewAgent[];
  total: number;
}

/**
 * Отримати команду CrewAI агентів для оркестратора
 */
export async function getCrewAgents(orchestratorId: string): Promise<CrewAgentsResponse> {
  try {
    // Спробуємо отримати з API
    const response = await apiGet<CrewAgentsResponse>(`/api/agent/${orchestratorId}/crew-agents`);
    return response;
  } catch (error) {
    // Fallback до статичних даних з маппінгу
    console.warn(`Failed to fetch crew agents for ${orchestratorId}, using fallback data`, error);
    return getCrewAgentsFallback(orchestratorId);
  }
}

/**
 * Fallback дані для CrewAI агентів
 */
function getCrewAgentsFallback(orchestratorId: string): CrewAgentsResponse {
  // GREENFOOD команда
  if (orchestratorId === 'greenfood' || orchestratorId === 'agent-greenfood-assistant') {
    return {
      orchestrator_id: 'greenfood',
      orchestrator_name: 'GREENFOOD Assistant',
      crew_enabled: true,
      total: 12,
      agents: [
        {
          id: 'product_catalog',
          name: 'Product & Catalog Agent',
          role: 'Менеджер каталогу товарів',
          description: 'Створює та підтримує чистий і структурований каталог товарів',
          category: 'Operations',
        },
        {
          id: 'batch_quality',
          name: 'Batch & Quality Agent',
          role: 'Менеджер партій та якості',
          description: 'Вести партії товарів, контролювати якість та строки придатності',
          category: 'Operations',
        },
        {
          id: 'vendor_success',
          name: 'Vendor Success Agent',
          role: 'Менеджер успіху комітентів',
          description: 'Забезпечити швидкий onboarding та зростання виробників',
          category: 'Success',
        },
        {
          id: 'warehouse',
          name: 'Warehouse Agent',
          role: 'Начальник складу',
          description: 'Керує залишками, рухом товарів, структурою складів',
          category: 'Operations',
        },
        {
          id: 'logistics_delivery',
          name: 'Logistics & Delivery Agent',
          role: 'Логіст і диспетчер',
          description: 'Планує маршрути, координує доставки, відстежує статуси',
          category: 'Operations',
        },
        {
          id: 'seller',
          name: 'Seller Agent',
          role: 'Менеджер з продажу',
          description: 'Працює з покупцями, формує замовлення, консультує',
          category: 'Sales & Support',
        },
        {
          id: 'customer_care',
          name: 'Customer Care Agent',
          role: 'Служба підтримки',
          description: 'Вирішує питання покупців, обробляє скарги та повернення',
          category: 'Sales & Support',
        },
        {
          id: 'finance_pricing',
          name: 'Finance & Pricing Agent',
          role: 'Бухгалтер і фінансовий стратег',
          description: 'Ведення фінансів, ціноутворення, розрахунки з комітентами',
          category: 'Finance',
        },
        {
          id: 'smm_campaigns',
          name: 'SMM & Campaigns Agent',
          role: 'Маркетолог та контент-агент',
          description: 'Створює контент, запускає кампанії, керує соціальними мережами',
          category: 'Marketing',
        },
        {
          id: 'seo_web',
          name: 'SEO & Web Agent',
          role: 'SEO та веб-досвід',
          description: 'Оптимізація для пошукових систем, покращення веб-досвіду',
          category: 'Marketing',
        },
        {
          id: 'analytics_bi',
          name: 'Analytics & BI Agent',
          role: 'Аналітик даних',
          description: 'Аналізує дані, створює звіти, виявляє тренди',
          category: 'Analytics & Governance',
        },
        {
          id: 'compliance_audit',
          name: 'Compliance & Audit Agent',
          role: 'Внутрішній аудитор',
          description: 'Перевіряє відповідність стандартам, виявляє ризики',
          category: 'Analytics & Governance',
        },
      ],
    };
  }

  // Yaromir команда
  if (orchestratorId === 'yaromir') {
    return {
      orchestrator_id: 'yaromir',
      orchestrator_name: 'Yaromir',
      crew_enabled: true,
      total: 4,
      agents: [
        {
          id: 'vozhd',
          name: 'Вождь',
          role: 'Strategic Guardian',
          description: 'Стратегічне мислення та прийняття рішень',
          category: 'Strategy',
        },
        {
          id: 'provodnik',
          name: 'Проводник',
          role: 'Deep Mentor',
          description: 'Глибинне наставництво та трансформація',
          category: 'Mentorship',
        },
        {
          id: 'domir',
          name: 'Домир',
          role: 'Harmony Keeper',
          description: 'Сімейна гармонія та емпатія',
          category: 'Harmony',
        },
        {
          id: 'sozdatel',
          name: 'Создатель',
          role: 'Creator',
          description: 'Інновації та прототипування',
          category: 'Innovation',
        },
      ],
    };
  }

  // За замовчуванням
  return {
    orchestrator_id: orchestratorId,
    orchestrator_name: orchestratorId,
    crew_enabled: false,
    total: 0,
    agents: [],
  };
}

