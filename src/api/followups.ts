/**
 * API для Follow-ups (задачі, нагадування, action items)
 */

import { apiGet, apiPost, apiPatch, apiDelete } from './client';

export interface Followup {
  id: string;
  title: string;
  description?: string;
  channelId: string;
  messageId?: string;
  assignedTo?: string;
  assignedBy?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CreateFollowupPayload {
  title: string;
  description?: string;
  channelId: string;
  messageId?: string;
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
}

export interface UpdateFollowupPayload {
  title?: string;
  description?: string;
  assignedTo?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
}

/**
 * Отримати всі follow-ups для каналу
 */
export async function getChannelFollowups(channelId: string): Promise<Followup[]> {
  return apiGet(`/v1/channels/${channelId}/followups`);
}

/**
 * Отримати всі follow-ups, призначені користувачу
 */
export async function getMyFollowups(): Promise<Followup[]> {
  return apiGet('/v1/followups/me');
}

/**
 * Отримати конкретний follow-up
 */
export async function getFollowup(followupId: string): Promise<Followup> {
  return apiGet(`/v1/followups/${followupId}`);
}

/**
 * Створити новий follow-up
 */
export async function createFollowup(payload: CreateFollowupPayload): Promise<Followup> {
  return apiPost('/v1/followups', payload);
}

/**
 * Оновити follow-up
 */
export async function updateFollowup(
  followupId: string,
  payload: UpdateFollowupPayload
): Promise<Followup> {
  return apiPatch(`/v1/followups/${followupId}`, payload);
}

/**
 * Видалити follow-up
 */
export async function deleteFollowup(followupId: string): Promise<void> {
  return apiDelete(`/v1/followups/${followupId}`);
}

/**
 * Позначити follow-up як виконаний
 */
export async function completeFollowup(followupId: string): Promise<Followup> {
  return apiPatch(`/v1/followups/${followupId}`, { status: 'completed' });
}

/**
 * Призначити follow-up користувачу
 */
export async function assignFollowup(
  followupId: string,
  userId: string
): Promise<Followup> {
  return apiPatch(`/v1/followups/${followupId}`, { assignedTo: userId });
}

