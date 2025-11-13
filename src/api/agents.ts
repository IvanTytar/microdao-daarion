import { apiGet, apiPost } from './client';
import type { Agent, CreateAgentRequest } from '../types/api';

export async function getAgents(): Promise<{ agents: Agent[] }> {
  return apiGet<{ agents: Agent[] }>('/agents');
}

export async function createAgent(data: CreateAgentRequest): Promise<Agent> {
  return apiPost<Agent>('/agents', data);
}

