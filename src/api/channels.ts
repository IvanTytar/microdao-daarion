import { apiGet, apiPost } from './client';
import type { Channel, CreateChannelRequest, Message, CreateMessageRequest } from '../types/api';

export async function createChannel(data: CreateChannelRequest): Promise<Channel> {
  return apiPost<Channel>('/api/v1/channels', data);
}

export async function getChannels(teamId: string): Promise<{ channels: Channel[] }> {
  return apiGet<{ channels: Channel[] }>(`/api/v1/channels?team_id=${teamId}`);
}

export async function getChannelMessages(
  channelId: string,
  cursor?: string,
  limit = 50
): Promise<{ messages: Message[]; next_cursor?: string }> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', limit.toString());
  return apiGet<{ messages: Message[]; next_cursor?: string }>(
    `/api/v1/channels/${channelId}/messages?${params.toString()}`
  );
}

export async function createMessage(
  channelId: string,
  data: CreateMessageRequest
): Promise<Message> {
  return apiPost<Message>(`/api/v1/channels/${channelId}/messages`, data);
}

export async function getPublicChannel(slug: string): Promise<Channel> {
  return apiGet<Channel>(`/api/v1/channels/public/${slug}`);
}

