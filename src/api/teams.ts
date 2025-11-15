import { apiGet, apiPost, apiPatch } from './client';
import type { Team, CreateTeamRequest, UpdateTeamRequest } from '../types/api';

export async function createTeam(data: CreateTeamRequest): Promise<Team> {
  return apiPost<Team>('/teams', data);
}

export async function getTeams(): Promise<{ teams: Team[] }> {
  return apiGet<{ teams: Team[] }>('/teams');
}

export async function getTeam(teamId: string): Promise<Team> {
  return apiGet<Team>(`/teams/${teamId}`);
}

export async function updateTeam(teamId: string, data: UpdateTeamRequest): Promise<Team> {
  return apiPatch<Team>(`/teams/${teamId}`, data);
}

