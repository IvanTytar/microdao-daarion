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
  async getAgents(): Promise<unknown[]> {
    return this.fetch<unknown[]>('/api/agents/')
  }
}

export const api = new ApiClient(API_BASE)

