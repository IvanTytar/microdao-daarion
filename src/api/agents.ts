/**
 * Agents Service API Client
 * Phase 5 — Agent Hub UI
 * 
 * API: http://localhost:7014
 */

// ============================================================================
// Types (matching backend models.py)
// ============================================================================

export type AgentKind = 'assistant' | 'node' | 'system' | 'guardian' | 'analyst' | 'quest';
export type AgentStatus = 'active' | 'idle' | 'offline' | 'error';

export interface AgentListItem {
  id: string;
  name: string;
  kind: AgentKind;
  description?: string;
  avatar_url?: string;
  status: AgentStatus;
  model: string;
  microdao_id: string;
  last_active_at?: string;
}

export interface AgentDetail extends AgentListItem {
  owner_user_id: string;
  tools: string[];
  system_prompt?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentMetrics {
  agent_id: string;
  period_hours: number;
  llm_calls_total: number;
  llm_tokens_total: number;
  llm_latency_avg_ms: number;
  tool_calls_total: number;
  tool_success_rate: number;
  invocations_total: number;
  messages_sent: number;
  errors_count: number;
}

export interface AgentMetricsSeries {
  timestamps: string[];
  tokens: number[];
  latency: number[];
  tool_calls: number[];
}

export interface MemoryItem {
  id: string;
  type: 'short_term' | 'mid_term' | 'knowledge';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AgentContext {
  agent_id: string;
  short_term: MemoryItem[];
  mid_term: MemoryItem[];
  knowledge_items: MemoryItem[];
}

export type EventKind = 
  // Lifecycle
  | 'created'
  | 'updated'
  | 'deleted'
  | 'activated'
  | 'deactivated'
  // Activity
  | 'invocation'
  | 'reply_sent' 
  | 'tool_call' 
  // Changes
  | 'model_changed' 
  | 'tools_changed'
  | 'prompt_changed'
  // Errors
  | 'error'
  | 'llm_error'
  | 'tool_error';

export interface AgentEvent {
  id: string;
  agent_id: string;
  kind: EventKind;
  ts: string;
  channel_id?: string;
  tool_id?: string;
  content?: string;
  payload?: Record<string, any>;
}

// Phase 6 — CRUD types
export interface AgentBlueprint {
  id: string;
  code: string;
  name: string;
  description?: string;
  default_model: string;
  default_tools: string[];
  default_system_prompt?: string;
  created_at: string;
}

export interface AgentCreate {
  name: string;
  kind: AgentKind;
  description?: string;
  microdao_id?: string;
  owner_user_id?: string;
  blueprint_code: string;
  model?: string;
  tools_enabled?: string[];
  system_prompt?: string;
  avatar_url?: string;
}

export interface AgentUpdate {
  name?: string;
  description?: string;
  model?: string;
  tools_enabled?: string[];
  system_prompt?: string;
  avatar_url?: string;
  is_active?: boolean;
}

export interface AgentRead {
  id: string;
  external_id: string;
  name: string;
  kind: AgentKind;
  description?: string;
  microdao_id?: string;
  owner_user_id?: string;
  blueprint_id?: string;
  model: string;
  tools_enabled: string[];
  system_prompt?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModelSettings {
  model: string;
}

export interface ToolsSettings {
  tools_enabled: string[];
}

// ============================================================================
// API Client
// ============================================================================

const AGENTS_API_URL = import.meta.env.VITE_AGENTS_API_URL || 'http://localhost:7014';

/**
 * Helper to make authenticated requests
 */
async function agentsRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Get session token from localStorage
  const sessionToken = localStorage.getItem('daarion_session_token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }
  
  const response = await fetch(`${AGENTS_API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`Agents API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// ============================================================================
// Agent CRUD
// ============================================================================

/**
 * Get list of all agents (optionally filtered by microDAO)
 */
export async function getAgents(
  microdaoId?: string
): Promise<AgentListItem[]> {
  const url = microdaoId 
    ? `/agents?microdao_id=${encodeURIComponent(microdaoId)}`
    : '/agents';
  
  const data = await agentsRequest<{ agents: AgentListItem[] }>(url);
  return data.agents;
}

/**
 * Get single agent details
 */
export async function getAgent(agentId: string): Promise<AgentDetail> {
  return agentsRequest<AgentDetail>(`/agents/${encodeURIComponent(agentId)}`);
}

// ============================================================================
// Agent Metrics
// ============================================================================

/**
 * Get agent usage metrics
 */
export async function getAgentMetrics(
  agentId: string,
  periodHours: number = 24
): Promise<AgentMetrics> {
  return agentsRequest<AgentMetrics>(
    `/agents/${encodeURIComponent(agentId)}/metrics?period_hours=${periodHours}`
  );
}

/**
 * Get agent metrics time series (for charts)
 */
export async function getAgentMetricsSeries(
  agentId: string,
  periodHours: number = 24
): Promise<AgentMetricsSeries> {
  return agentsRequest<AgentMetricsSeries>(
    `/agents/${encodeURIComponent(agentId)}/metrics/series?period_hours=${periodHours}`
  );
}

// ============================================================================
// Agent Context (Memory)
// ============================================================================

/**
 * Get agent memory context
 */
export async function getAgentContext(agentId: string): Promise<AgentContext> {
  return agentsRequest<AgentContext>(
    `/agents/${encodeURIComponent(agentId)}/context`
  );
}

// ============================================================================
// Agent Events
// ============================================================================

/**
 * Get agent activity events
 */
export async function getAgentEvents(
  agentId: string,
  limit: number = 50
): Promise<AgentEvent[]> {
  const data = await agentsRequest<{ events: AgentEvent[] }>(
    `/agents/${encodeURIComponent(agentId)}/events?limit=${limit}`
  );
  return data.events;
}

// ============================================================================
// Agent Settings
// ============================================================================

/**
 * Update agent model
 */
export async function updateAgentModel(
  agentId: string,
  model: string
): Promise<{ success: boolean; agent_id: string; new_model: string }> {
  return agentsRequest(`/agents/${encodeURIComponent(agentId)}/settings/model`, {
    method: 'POST',
    body: JSON.stringify({ model }),
  });
}

/**
 * Update agent tools
 */
export async function updateAgentTools(
  agentId: string,
  toolsEnabled: string[]
): Promise<{ success: boolean; agent_id: string; tools_count: number }> {
  return agentsRequest(`/agents/${encodeURIComponent(agentId)}/settings/tools`, {
    method: 'POST',
    body: JSON.stringify({ tools_enabled: toolsEnabled }),
  });
}

/**
 * Update agent system prompt
 */
export async function updateAgentSystemPrompt(
  agentId: string,
  systemPrompt: string
): Promise<{ success: boolean; agent_id: string }> {
  return agentsRequest(`/agents/${encodeURIComponent(agentId)}/settings/system-prompt`, {
    method: 'POST',
    body: JSON.stringify({ system_prompt: systemPrompt }),
  });
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Check if agents-service is healthy
 */
export async function checkAgentsServiceHealth(): Promise<{
  service: string;
  status: string;
  timestamp: string;
}> {
  return agentsRequest('/health');
}

// ============================================================================
// Phase 6 — CRUD Operations
// ============================================================================

/**
 * List agent blueprints
 */
export async function getBlueprints(): Promise<AgentBlueprint[]> {
  return agentsRequest('/agents/blueprints');
}

/**
 * Create new agent
 */
export async function createAgent(data: AgentCreate): Promise<AgentRead> {
  return agentsRequest('/agents', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update agent
 */
export async function updateAgent(
  agentId: string,
  data: AgentUpdate
): Promise<AgentRead> {
  return agentsRequest(`/agents/${encodeURIComponent(agentId)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Delete (deactivate) agent
 */
export async function deleteAgent(agentId: string): Promise<void> {
  await agentsRequest(`/agents/${encodeURIComponent(agentId)}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// WebSocket — Live Events
// ============================================================================

/**
 * Create WebSocket connection for live events
 * @param agentId - Subscribe to specific agent (optional, null = all agents)
 * @param onEvent - Callback for each event
 * @param onError - Callback for errors
 */
export function connectAgentEventsWebSocket(
  agentId: string | null,
  onEvent: (event: AgentEvent) => void,
  onError?: (error: Event) => void
): WebSocket {
  const wsUrl = AGENTS_API_URL.replace('http', 'ws');
  const url = agentId
    ? `${wsUrl}/ws/agents/stream?agent_id=${encodeURIComponent(agentId)}`
    : `${wsUrl}/ws/agents/stream`;
  
  const ws = new WebSocket(url);
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // Ignore ping messages
      if (data.type === 'ping') {
        return;
      }
      
      // Handle agent_event messages
      if (data.type === 'agent_event') {
        onEvent({
          id: data.id || `event-${Date.now()}`,
          agent_id: data.agent_id,
          kind: data.kind,
          ts: data.ts,
          payload: data.payload,
        });
      }
    } catch (err) {
      console.error('Failed to parse WS message:', err);
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    if (onError) {
      onError(error);
    }
  };
  
  ws.onclose = () => {
    console.log('WebSocket closed');
  };
  
  return ws;
}
