/**
 * API для роботи з робочими просторами (workspaces)
 */

import { apiGet, apiPost } from './client';

export interface WorkspaceParticipant {
  id: string;
  name: string;
  role: string;
  agent_id: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  participants: WorkspaceParticipant[];
  created_at: string;
  updated_at: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  participant_ids: string[];
}

export interface WorkspaceResponse {
  workspace: Workspace;
  status: 'created' | 'updated' | 'exists';
}

/**
 * Отримати список всіх робочих просторів
 */
export async function getWorkspaces(): Promise<Workspace[]> {
  try {
    const response = await apiGet<{ workspaces: Workspace[] }>('/api/workspaces');
    return response.workspaces || [];
  } catch (error) {
    console.warn('Failed to fetch workspaces, using fallback data', error);
    return getWorkspacesFallback();
  }
}

/**
 * Отримати робочий простір за ID
 */
export async function getWorkspace(workspaceId: string): Promise<Workspace> {
  try {
    const response = await apiGet<Workspace>(`/api/workspaces/${workspaceId}`);
    return response;
  } catch (error: any) {
    // Не логуємо помилку, якщо це очікувана ситуація (API недоступний)
    // Використовуємо fallback дані
    if (error?.status !== 0) {
      console.warn(`Failed to fetch workspace ${workspaceId}, using fallback data`);
    }
    return getWorkspaceFallback(workspaceId);
  }
}

/**
 * Створити новий робочий простір
 */
export async function createWorkspace(request: CreateWorkspaceRequest): Promise<WorkspaceResponse> {
  try {
    const response = await apiPost<WorkspaceResponse>('/api/workspaces', request);
    return response;
  } catch (error) {
    console.error('Failed to create workspace:', error);
    throw error;
  }
}

/**
 * Створити workspace для мікроДАО автоматично
 */
export async function createMicroDaoWorkspace(
  microDaoId: string,
  microDaoName: string,
  orchestratorAgentId?: string
): Promise<WorkspaceResponse> {
  const workspaceId = `microdao_${microDaoId}`;
  const participantIds: string[] = [];
  
  // Додаємо оркестратора, якщо він є
  if (orchestratorAgentId) {
    participantIds.push(orchestratorAgentId);
  }

  try {
    const response = await apiPost<WorkspaceResponse>('/api/workspaces', {
      name: `${microDaoName} Workspace`,
      description: `Робочий простір для мікроДАО ${microDaoName}`,
      participant_ids: participantIds,
    });
    return response;
  } catch (error) {
    // Не логуємо помилку як критичну - використовуємо fallback
    console.log(`API недоступний, використовую fallback workspace для ${microDaoId}`);
    // Fallback: повертаємо workspace з fallback даними
    return {
      workspace: {
        id: workspaceId,
        name: `${microDaoName} Workspace`,
        description: `Робочий простір для мікроДАО ${microDaoName}`,
        participants: orchestratorAgentId ? [{
          id: orchestratorAgentId,
          name: orchestratorAgentId,
          role: 'Оркестратор',
          agent_id: orchestratorAgentId,
        }] : [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      status: 'created',
    };
  }
}

/**
 * Отримати workspace для мікроДАО
 */
export async function getMicroDaoWorkspace(microDaoId: string): Promise<Workspace | null> {
  const workspaceId = `microdao_${microDaoId}`;
  try {
    const workspace = await getWorkspace(workspaceId);
    return workspace;
  } catch (error: any) {
    // Не логуємо помилку, якщо це очікувана ситуація (API недоступний)
    // Workspace буде створено автоматично через fallback
    if (error?.status !== 0 && error?.status !== 404) {
      console.warn(`Workspace not found for microDAO ${microDaoId}, will be created automatically`);
    }
    return null;
  }
}

/**
 * Додати учасників до робочого простору
 */
export async function addParticipantsToWorkspace(
  workspaceId: string,
  participantIds: string[]
): Promise<Workspace> {
  try {
    const response = await apiPost<Workspace>(
      `/api/workspaces/${workspaceId}/participants`,
      { participant_ids: participantIds }
    );
    return response;
  } catch (error) {
    console.error(`Failed to add participants to workspace ${workspaceId}:`, error);
    throw error;
  }
}

/**
 * Fallback дані для робочих просторів
 */
function getWorkspacesFallback(): Workspace[] {
  return [
    {
      id: 'core_founders_room',
      name: 'Core Founders Room',
      description: 'Кімната засновників DAARION',
      participants: [
        {
          id: 'founder',
          name: 'Founder',
          role: 'Founder',
          agent_id: 'founder',
        },
        {
          id: 'solarius',
          name: 'Solarius',
          role: 'CEO of DAARION microDAO Node-2',
          agent_id: 'agent-solarius',
        },
        {
          id: 'sofia',
          name: 'Sofia',
          role: 'Chief AI Engineer & R&D Orchestrator',
          agent_id: 'agent-sofia',
        },
        {
          id: 'primesynth',
          name: 'PrimeSynth',
          role: 'Document Architect & Structural Synthesizer',
          agent_id: 'agent-primesynth',
        },
        {
          id: 'helix',
          name: 'Helix',
          role: 'System Architect',
          agent_id: 'agent-helix',
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'r_and_d_lab',
      name: 'R&D Lab',
      description: 'Лабораторія досліджень та розробки',
      participants: [
        {
          id: 'sofia',
          name: 'Sofia',
          role: 'Chief AI Engineer & R&D Orchestrator',
          agent_id: 'agent-sofia',
        },
        {
          id: 'protomind',
          name: 'ProtoMind',
          role: 'Experimental Architect',
          agent_id: 'agent-protomind',
        },
        {
          id: 'labforge',
          name: 'LabForge',
          role: 'R&D Agent Builder',
          agent_id: 'agent-labforge',
        },
        {
          id: 'modelscout',
          name: 'ModelScout',
          role: 'New Models Explorer',
          agent_id: 'agent-modelscout',
        },
        {
          id: 'testpilot',
          name: 'TestPilot',
          role: 'Experimental Tester',
          agent_id: 'agent-testpilot',
        },
        {
          id: 'breakpoint',
          name: 'BreakPoint',
          role: 'Red-team Developer',
          agent_id: 'agent-breakpoint',
        },
        {
          id: 'growcell',
          name: 'GrowCell',
          role: 'AI Evolution Agent',
          agent_id: 'agent-growcell',
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'daarion_sofia_solarius',
      name: 'DAARION Sofia & Solarius',
      description: 'Робочий простір з Sofia та Solarius для DAARION мікроДАО',
      participants: [
        {
          id: 'sofia',
          name: 'Sofia',
          role: 'Chief AI Engineer & R&D Orchestrator',
          agent_id: 'agent-sofia',
        },
        {
          id: 'solarius',
          name: 'Solarius',
          role: 'CEO of DAARION microDAO Node-2',
          agent_id: 'agent-solarius',
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}

/**
 * Fallback для конкретного workspace
 */
function getWorkspaceFallback(workspaceId: string): Workspace {
  const workspaces = getWorkspacesFallback();
  const workspace = workspaces.find(w => w.id === workspaceId);
  
  if (workspace) {
    return workspace;
  }
  
  // Якщо це workspace для мікроДАО (формат: microdao_{microDaoId})
  if (workspaceId.startsWith('microdao_')) {
    const microDaoId = workspaceId.replace('microdao_', '');
    // Спробуємо знайти оркестратора для цього мікроДАО
    // Це буде використано в getMicroDaoWorkspace якщо потрібно
    return {
      id: workspaceId,
      name: `${microDaoId} Workspace`,
      description: `Робочий простір для мікроДАО ${microDaoId}`,
      participants: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
  
  // Якщо не знайдено - повертаємо порожній workspace
  return {
    id: workspaceId,
    name: workspaceId,
    participants: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

