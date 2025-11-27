/**
 * MicroDAO Service API Client
 * Phase 7 — microDAO Console (MVP)
 * 
 * API: http://localhost:7015
 */

// ============================================================================
// Types
// ============================================================================

export interface MicrodaoBase {
  slug: string;
  name: string;
  description?: string;
}

export interface MicrodaoRead extends MicrodaoBase {
  id: string;
  external_id: string;
  owner_user_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  member_count?: number;
  agent_count?: number;
}

export interface MicrodaoCreate extends MicrodaoBase {}

export interface MicrodaoUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface MicrodaoMember {
  id: string;
  microdao_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export interface TreasuryItem {
  token_symbol: string;
  balance: number;
}

// ============================================================================
// API Client
// ============================================================================

const MICRODAO_API_URL = import.meta.env.VITE_MICRODAO_API_URL || 'http://localhost:7015';

async function microdaoRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const sessionToken = localStorage.getItem('daarion_session_token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }
  
  const response = await fetch(`${MICRODAO_API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`MicroDAO API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// ============================================================================
// MicroDAO CRUD
// ============================================================================

export async function getMicrodaos(): Promise<MicrodaoRead[]> {
  return microdaoRequest<MicrodaoRead[]>('/microdao');
}

export async function getMicrodao(slug: string): Promise<MicrodaoRead> {
  return microdaoRequest<MicrodaoRead>(`/microdao/${encodeURIComponent(slug)}`);
}

export async function createMicrodao(data: MicrodaoCreate): Promise<MicrodaoRead> {
  return microdaoRequest<MicrodaoRead>('/microdao', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMicrodao(
  slug: string,
  data: MicrodaoUpdate
): Promise<MicrodaoRead> {
  return microdaoRequest<MicrodaoRead>(`/microdao/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteMicrodao(slug: string): Promise<void> {
  await microdaoRequest(`/microdao/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Members
// ============================================================================

export async function getMembers(slug: string): Promise<MicrodaoMember[]> {
  return microdaoRequest<MicrodaoMember[]>(`/microdao/${encodeURIComponent(slug)}/members`);
}

export async function addMember(
  slug: string,
  userId: string,
  role: string = 'member'
): Promise<MicrodaoMember> {
  return microdaoRequest<MicrodaoMember>(`/microdao/${encodeURIComponent(slug)}/members`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, role }),
  });
}

export async function updateMemberRole(
  slug: string,
  memberId: string,
  role: string
): Promise<MicrodaoMember> {
  return microdaoRequest<MicrodaoMember>(
    `/microdao/${encodeURIComponent(slug)}/members/${encodeURIComponent(memberId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }
  );
}

export async function removeMember(slug: string, memberId: string): Promise<void> {
  await microdaoRequest(
    `/microdao/${encodeURIComponent(slug)}/members/${encodeURIComponent(memberId)}`,
    {
      method: 'DELETE',
    }
  );
}

// ============================================================================
// Treasury
// ============================================================================

export async function getTreasury(slug: string): Promise<TreasuryItem[]> {
  return microdaoRequest<TreasuryItem[]>(`/microdao/${encodeURIComponent(slug)}/treasury`);
}

export async function updateTreasuryBalance(
  slug: string,
  tokenSymbol: string,
  delta: number
): Promise<TreasuryItem> {
  return microdaoRequest<TreasuryItem>(
    `/microdao/${encodeURIComponent(slug)}/treasury?token_symbol=${encodeURIComponent(tokenSymbol)}&delta=${delta}`,
    {
      method: 'POST',
    }
  );
}

export async function setTreasuryBalance(
  slug: string,
  tokenSymbol: string,
  balance: number
): Promise<TreasuryItem> {
  return microdaoRequest<TreasuryItem>(
    `/microdao/${encodeURIComponent(slug)}/treasury/${encodeURIComponent(tokenSymbol)}?balance=${balance}`,
    {
      method: 'PUT',
    }
  );
}

// ============================================================================
// Settings
// ============================================================================

export async function getSettings(slug: string): Promise<Record<string, any>> {
  return microdaoRequest<Record<string, any>>(`/microdao/${encodeURIComponent(slug)}/settings`);
}

export async function updateSetting(
  slug: string,
  key: string,
  value: any
): Promise<void> {
  await microdaoRequest(`/microdao/${encodeURIComponent(slug)}/settings`, {
    method: 'POST',
    body: JSON.stringify({ key, value }),
  });
}

export async function updateSettings(
  slug: string,
  settings: Record<string, any>
): Promise<void> {
  await microdaoRequest(`/microdao/${encodeURIComponent(slug)}/settings`, {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export async function deleteSetting(slug: string, key: string): Promise<void> {
  await microdaoRequest(
    `/microdao/${encodeURIComponent(slug)}/settings/${encodeURIComponent(key)}`,
    {
      method: 'DELETE',
    }
  );
}

// ============================================================================
// Health Check
// ============================================================================

export async function checkMicrodaoServiceHealth(): Promise<{
  service: string;
  status: string;
}> {
  return microdaoRequest('/health');
}

