/**
 * DAO API Client
 * Phase 8: DAO Dashboard
 */
import { useAuthStore } from '../store/authStore';

const API_URL = 'http://localhost:7016/dao';

// ============================================================================
// Types
// ============================================================================

export interface DaoRead {
  id: string;
  slug: string;
  name: string;
  description?: string;
  microdao_id: string;
  owner_user_id: string;
  governance_model: 'simple' | 'quadratic' | 'delegated';
  voting_period_seconds: number;
  quorum_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DaoCreate {
  slug: string;
  name: string;
  description?: string;
  microdao_id: string;
  governance_model?: 'simple' | 'quadratic' | 'delegated';
  voting_period_seconds?: number;
  quorum_percent?: number;
}

export interface DaoUpdate {
  name?: string;
  description?: string;
  governance_model?: string;
  voting_period_seconds?: number;
  quorum_percent?: number;
  is_active?: boolean;
}

export interface DaoMember {
  id: string;
  dao_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export interface DaoTreasuryItem {
  token_symbol: string;
  contract_address?: string;
  balance: string;
}

export interface DaoOverview {
  dao: DaoRead;
  members_count: number;
  active_proposals_count: number;
  total_proposals_count: number;
  treasury_items: DaoTreasuryItem[];
}

export interface ProposalRead {
  id: string;
  dao_id: string;
  slug: string;
  title: string;
  description?: string;
  created_by_user_id: string;
  created_at: string;
  start_at?: string;
  end_at?: string;
  status: 'draft' | 'active' | 'passed' | 'rejected' | 'executed';
  governance_model_override?: string;
  quorum_percent_override?: number;
}

export interface ProposalWithVotes extends ProposalRead {
  votes_yes: number;
  votes_no: number;
  votes_abstain: number;
  total_weight_yes: string;
  total_weight_no: string;
  total_weight_abstain: string;
  quorum_reached: boolean;
  is_passed: boolean;
}

export interface ProposalCreate {
  slug: string;
  title: string;
  description?: string;
  start_at?: string;
  end_at?: string;
  governance_model_override?: string;
  quorum_percent_override?: number;
}

export interface VoteRead {
  id: string;
  proposal_id: string;
  voter_user_id: string;
  vote_value: 'yes' | 'no' | 'abstain';
  weight: string;
  raw_power?: string;
  created_at: string;
}

export interface VoteCreate {
  vote_value: 'yes' | 'no' | 'abstain';
}

// ============================================================================
// Helper function
// ============================================================================

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { sessionToken } = useAuthStore.getState();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error ${response.status}: ${error}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

// ============================================================================
// DAO Functions
// ============================================================================

export async function getMyDaos(): Promise<DaoRead[]> {
  return apiRequest<DaoRead[]>('');
}

export async function createDao(data: DaoCreate): Promise<DaoRead> {
  return apiRequest<DaoRead>('', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getDao(slug: string): Promise<DaoOverview> {
  return apiRequest<DaoOverview>(`/${slug}`);
}

export async function updateDao(slug: string, data: DaoUpdate): Promise<DaoRead> {
  return apiRequest<DaoRead>(`/${slug}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteDao(slug: string): Promise<void> {
  return apiRequest<void>(`/${slug}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Member Functions
// ============================================================================

export async function getDaoMembers(slug: string): Promise<DaoMember[]> {
  return apiRequest<DaoMember[]>(`/${slug}/members`);
}

export async function addDaoMember(
  slug: string,
  userId: string,
  role: string = 'member'
): Promise<DaoMember> {
  return apiRequest<DaoMember>(`/${slug}/members`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, role }),
  });
}

export async function removeDaoMember(
  slug: string,
  memberId: string
): Promise<void> {
  return apiRequest<void>(`/${slug}/members/${memberId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Treasury Functions
// ============================================================================

export async function getDaoTreasury(slug: string): Promise<DaoTreasuryItem[]> {
  return apiRequest<DaoTreasuryItem[]>(`/${slug}/treasury`);
}

export async function updateTreasuryBalance(
  slug: string,
  tokenSymbol: string,
  delta: string
): Promise<DaoTreasuryItem> {
  return apiRequest<DaoTreasuryItem>(`/${slug}/treasury`, {
    method: 'POST',
    body: JSON.stringify({ token_symbol: tokenSymbol, delta }),
  });
}

// ============================================================================
// Proposal Functions
// ============================================================================

export async function getDaoProposals(
  slug: string,
  status?: string
): Promise<ProposalRead[]> {
  const query = status ? `?status=${status}` : '';
  return apiRequest<ProposalRead[]>(`/${slug}/proposals${query}`);
}

export async function createProposal(
  slug: string,
  data: ProposalCreate
): Promise<ProposalRead> {
  return apiRequest<ProposalRead>(`/${slug}/proposals`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getProposal(
  slug: string,
  proposalSlug: string
): Promise<ProposalWithVotes> {
  return apiRequest<ProposalWithVotes>(`/${slug}/proposals/${proposalSlug}`);
}

export async function activateProposal(
  slug: string,
  proposalSlug: string
): Promise<ProposalRead> {
  return apiRequest<ProposalRead>(`/${slug}/proposals/${proposalSlug}/activate`, {
    method: 'POST',
  });
}

export async function closeProposal(
  slug: string,
  proposalSlug: string
): Promise<ProposalWithVotes> {
  return apiRequest<ProposalWithVotes>(`/${slug}/proposals/${proposalSlug}/close`, {
    method: 'POST',
  });
}

// ============================================================================
// Vote Functions
// ============================================================================

export async function getProposalVotes(
  slug: string,
  proposalSlug: string
): Promise<VoteRead[]> {
  return apiRequest<VoteRead[]>(`/${slug}/proposals/${proposalSlug}/votes`);
}

export async function castVote(
  slug: string,
  proposalSlug: string,
  voteValue: 'yes' | 'no' | 'abstain'
): Promise<VoteRead> {
  return apiRequest<VoteRead>(`/${slug}/proposals/${proposalSlug}/votes`, {
    method: 'POST',
    body: JSON.stringify({ vote_value: voteValue }),
  });
}

