'use client'

/**
 * Auth utilities for DAARION Frontend
 */

export interface User {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  roles: string[]
  is_active: boolean
  created_at: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface LoginResponse extends AuthTokens {
  user: User
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ''

// Token storage keys
const ACCESS_TOKEN_KEY = 'daarion_access_token'
const REFRESH_TOKEN_KEY = 'daarion_refresh_token'
const USER_KEY = 'daarion_user'

// Token management
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(USER_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

export function setTokens(tokens: AuthTokens, user?: User): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token)
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isAuthenticated(): boolean {
  return !!getAccessToken()
}

// API calls
export async function register(
  email: string,
  password: string,
  displayName?: string
): Promise<{ user_id: string; email: string }> {
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      display_name: displayName
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Registration failed')
  }

  return response.json()
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  if (!response.ok) {
    let errorDetail = 'Login failed'
    try {
      const error = await response.json()
      errorDetail = error.detail || error.message || errorDetail
    } catch {
      // ignore JSON parse errors
    }

    throw new Error(errorDetail)
  }

  const data: LoginResponse = await response.json()
  setTokens(data, data.user)
  return data
}

export async function refreshTokens(): Promise<AuthTokens | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  try {
    const response = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    })

    if (!response.ok) {
      clearTokens()
      return null
    }

    const data: AuthTokens = await response.json()
    setTokens(data)
    return data
  } catch {
    clearTokens()
    return null
  }
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken()
  
  if (refreshToken) {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      })
    } catch {
      // Ignore errors during logout
    }
  }

  clearTokens()
}

export async function getMe(): Promise<User | null> {
  const token = getAccessToken()
  if (!token) return null

  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      if (response.status === 401) {
        // Try to refresh
        const refreshed = await refreshTokens()
        if (refreshed) {
          return getMe()
        }
        clearTokens()
      }
      return null
    }

    const user: User = await response.json()
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    return user
  } catch {
    return null
  }
}

// Auth header for API requests
export function getAuthHeader(): Record<string, string> {
  const token = getAccessToken()
  if (!token) return {}
  return { 'Authorization': `Bearer ${token}` }
}

// Fetch with auth
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAccessToken()
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let response = await fetch(url, { ...options, headers })

  // If 401, try to refresh and retry
  if (response.status === 401 && token) {
    const refreshed = await refreshTokens()
    if (refreshed) {
      headers['Authorization'] = `Bearer ${refreshed.access_token}`
      response = await fetch(url, { ...options, headers })
    }
  }

  return response
}

