// API Types для MicroDAO

export interface User {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  mode: 'public' | 'confidential';
  type?: 'city' | 'platform' | 'community' | 'guild' | 'lab' | 'personal';
  parent_team_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTeamRequest {
  name: string;
  slug?: string;
  description?: string;
  type?: 'community' | 'guild' | 'lab' | 'personal';
  mode?: 'public' | 'confidential';
}

export interface UpdateTeamRequest {
  mode?: 'public' | 'confidential';
  name?: string;
  description?: string;
}

export interface Channel {
  id: string;
  team_id: string;
  name: string;
  type: 'public' | 'group';
  slug: string;
  created_at: string;
}

export interface CreateChannelRequest {
  team_id: string;
  name: string;
  type: 'public' | 'group';
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user: User;
}

export interface CreateMessageRequest {
  content: string;
}

export interface Agent {
  id: string;
  team_id: string;
  name: string;
  role: 'general' | 'business' | 'it' | 'creative';
  language: 'uk' | 'en';
  focus: 'general' | 'business' | 'it' | 'creative';
  use_co_memory: boolean;
  enabled: boolean;
  created_at: string;
}

export interface CreateAgentRequest {
  team_id: string;
  name: string;
  role: 'general' | 'business' | 'it' | 'creative';
  language: 'uk' | 'en';
  focus: 'general' | 'business' | 'it' | 'creative';
  use_co_memory: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginEmailRequest {
  email: string;
}

export interface ExchangeCodeRequest {
  code: string;
  email: string;
}

