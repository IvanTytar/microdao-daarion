import { apiGet, apiPost } from './client';
import type { Channel, CreateChannelRequest, Message } from '../types/api';

export async function createChannel(data: CreateChannelRequest): Promise<Channel> {
  return apiPost<Channel>('/channels', data);
}

export async function getChannels(teamId: string): Promise<{ channels: Channel[] }> {
  return apiGet<{ channels: Channel[] }>(`/channels?team_id=${teamId}`);
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
    `/channels/${channelId}/messages?${params.toString()}`
  );
}

export async function getPublicChannel(slug: string): Promise<Channel> {
  return apiGet<Channel>(`/channels/public/${slug}`);
}

