/**
 * DAARION API Client
 * Handles all API calls to the backend
 */

// For SSR, we need an absolute URL to the API
// In production, the API is on the same domain
const getApiBase = () => {
  // Server-side: use internal Docker network URL
  if (typeof window === 'undefined') {
    return process.env.INTERNAL_API_URL || 'http://127.0.0.1'
  }
  // Client-side: use relative URLs (same origin)
  return process.env.NEXT_PUBLIC_API_BASE_URL || ''
}

const API_BASE = getApiBase()

export interface CityRoom {
  id: string
  slug: string
  name: string
  description: string | null
  is_default: boolean
  created_at: string
  created_by: string | null
  members_online: number
  last_event: string | null
  // Matrix integration
  matrix_room_id: string | null
  matrix_room_alias: string | null
}

export interface SecondMeProfile {
  user_id: string
  agent_id: string
  total_interactions: number
  last_interaction: string | null
}

export interface ApiError {
  detail: string
}

export interface Agent {
  id: string
  external_id?: string
  name: string
  description?: string
  kind: string
  model?: string
  status: string
  is_active: boolean
  avatar_url?: string
  capabilities?: string[]
  created_at: string
  updated_at: string
}

export interface AgentInvokeResponse {
  status: string
  reply?: string
  agent_id: string
  tokens_in?: number
  tokens_out?: number
  latency_ms?: number
}

export interface MicroDAO {
  id: string
  external_id?: string
  slug: string
  name: string
  description?: string
  owner_user_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Proposal {
  id: string
  microdao_id: string
  title: string
  description?: string
  creator_id: string
  creator_type: 'user' | 'agent'
  status: 'draft' | 'open' | 'accepted' | 'rejected' | 'expired'
  created_at: string
  opens_at?: string
  closes_at?: string
  votes_yes: number
  votes_no: number
  votes_abstain: number
}

export interface VoteResponse {
  status: string
  proposal_id: string
  choice: string
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Health check
  async checkHealth(): Promise<boolean> {
    try {
      const rooms = await this.getCityRooms()
      return rooms.length > 0
    } catch {
      return false
    }
  }

  // City Rooms
  async getCityRooms(): Promise<CityRoom[]> {
    return this.fetch<CityRoom[]>('/api/city/rooms')
  }

  async getCityRoom(slug: string): Promise<CityRoom | null> {
    const rooms = await this.getCityRooms()
    return rooms.find(r => r.slug === slug) || null
  }

  // Second Me
  async getSecondMeProfile(): Promise<SecondMeProfile> {
    return this.fetch<SecondMeProfile>('/api/secondme/profile')
  }

  // Agents
  async getAgents(): Promise<Agent[]> {
    return this.fetch<Agent[]>('/api/agents/agents')
  }

  async getAgent(agentId: string): Promise<Agent | null> {
    try {
      return await this.fetch<Agent>(`/api/agents/agents/${agentId}`)
    } catch {
      return null
    }
  }

  async invokeAgent(agentId: string, input: string, context?: Record<string, unknown>): Promise<AgentInvokeResponse> {
    return this.fetch<AgentInvokeResponse>('/api/agents/invoke', {
      method: 'POST',
      body: JSON.stringify({
        agent_id: agentId,
        input,
        context: context || {}
      })
    })
  }

  // MicroDAO
  async getMicroDAOs(): Promise<MicroDAO[]> {
    return this.fetch<MicroDAO[]>('/api/microdao/microdaos')
  }

  async getMicroDAO(id: string): Promise<MicroDAO | null> {
    try {
      return await this.fetch<MicroDAO>(`/api/microdao/microdaos/${id}`)
    } catch {
      return null
    }
  }

  async getProposals(microdaoId: string): Promise<Proposal[]> {
    return this.fetch<Proposal[]>(`/api/microdao/microdaos/${microdaoId}/proposals`)
  }

  async vote(proposalId: string, choice: 'yes' | 'no' | 'abstain'): Promise<VoteResponse> {
    return this.fetch<VoteResponse>(`/api/microdao/proposals/${proposalId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ choice })
    })
  }
}

export const api = new ApiClient(API_BASE)

