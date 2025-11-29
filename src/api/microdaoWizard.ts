import { apiPost } from './client';

export interface CreateMicroDaoPayload {
  agent_id: string;
  name: string;
  slug: string;
  description?: string;
  visibility: 'public' | 'confidential';
  district?: string;
  create_rooms: {
    primary_lobby: boolean;
    governance: boolean;
    crew_team: boolean;
  };
}

export interface AttachAgentPayload {
  agent_id: string;
  role: 'orchestrator' | 'member';
}

/**
 * Create MicroDAO from Agent (Wizard)
 */
export async function createMicroDaoFromAgent(payload: CreateMicroDaoPayload): Promise<any> {
  const { agent_id, ...data } = payload;
  // Map frontend payload to backend expectations
  const backendPayload = {
    name: data.name,
    slug: data.slug,
    description: data.description,
    is_public: data.visibility === 'public',
    make_platform: !!data.district, // Simplified logic for MVP
    create_rooms: data.create_rooms
  };
  
  return apiPost(`/city/city/agents/${encodeURIComponent(agent_id)}/microdao`, backendPayload);
}

/**
 * Attach Agent to existing MicroDAO
 */
export async function attachAgentToMicroDao(slug: string, payload: AttachAgentPayload): Promise<any> {
  return apiPost(`/city/city/microdao/${encodeURIComponent(slug)}/attach-agent`, payload);
}

