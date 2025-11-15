import { apiGet, apiPost, apiPatch } from './client';
import type { Team, CreateTeamRequest, UpdateTeamRequest } from '../types/api';

export async function createTeam(data: CreateTeamRequest): Promise<Team> {
  return apiPost<Team>('/api/v1/teams', data);
}

export async function getTeams(): Promise<{ teams: Team[] }> {
  return apiGet<{ teams: Team[] }>('/api/v1/teams');
}

export async function getTeam(teamId: string): Promise<Team> {
  return apiGet<Team>(`/api/v1/teams/${teamId}`);
}

export async function updateTeam(teamId: string, data: UpdateTeamRequest): Promise<Team> {
  return apiPatch<Team>(`/api/v1/teams/${teamId}`, data);
}

export interface InviteMemberRequest {
  email: string;
  role: 'admin' | 'member';
}

export interface InviteMemberResponse {
  team_id: string;
  user_id: string;
  email: string;
  role: string;
  status: string;
}

export async function inviteMember(teamId: string, data: InviteMemberRequest): Promise<InviteMemberResponse> {
  return apiPost<InviteMemberResponse>(`/api/v1/teams/${teamId}/members`, data);
}

