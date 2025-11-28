import type { AgentMicrodaoMembership } from "@/lib/microdao";

/**
 * Agent Dashboard Types and API
 * Based on DAIS (Decentralized AI Agent Standard) v1
 */

// ============================================================================
// Types
// ============================================================================

export interface DAISCore {
  title?: string;
  bio?: string;
  mission?: string;
  version?: string;
}

export interface DAISVis {
  avatar_url?: string;
  avatar_style?: string;
  color_primary?: string;
  color_secondary?: string;
  lora_refs?: string[];
  second_me_id?: string;
}

export interface DAISCog {
  base_model?: string;
  provider?: string;
  node_id?: string;
  context_window?: number;
  temperature?: number;
  memory?: {
    type?: string;
    store?: string;
    collections?: string[];
    max_tokens?: number;
  };
  tools_enabled?: string[];
}

export interface DAISAct {
  matrix?: {
    user_id?: string;
    rooms?: string[];
  };
  tools?: string[];
  apis?: string[];
  web3?: {
    wallet_address?: string;
    chains?: string[];
  };
}

export interface DAIS {
  core: DAISCore;
  vis?: DAISVis;
  cog?: DAISCog;
  act?: DAISAct;
}

export interface CityPresence {
  primary_room_slug?: string;
  district?: string;
  rooms?: Array<{
    room_id: string;
    slug: string;
    name: string;
    role?: string;
  }>;
}

export interface AgentProfile {
  agent_id: string;
  display_name: string;
  kind: string;
  status: 'online' | 'offline' | 'degraded' | 'training' | 'maintenance';
  node_id?: string;
  roles: string[];
  tags: string[];
  dais: DAIS;
  city_presence?: CityPresence;
}

export interface AgentNode {
  node_id: string;
  status: string;
  gpu?: {
    name?: string;
    vram_gb?: number;
  };
}

export interface AgentRuntime {
  router_endpoint?: string;
  health?: string;
  last_success_at?: string | null;
  last_error_at?: string | null;
}

export interface AgentMetrics {
  tasks_1h?: number;
  tasks_24h?: number;
  errors_1h?: number;
  errors_24h?: number;
  avg_latency_ms_1h?: number;
  success_rate_24h?: number;
  tokens_24h?: number;
  last_task_at?: string;
}

export interface AgentActivity {
  timestamp: string;
  type: string;
  room_slug?: string;
  summary?: string;
}

export interface AgentPromptView {
  content: string;
  version: number;
  updated_at: string;
  updated_by?: string;
}

export interface AgentSystemPrompts {
  core?: AgentPromptView | null;
  safety?: AgentPromptView | null;
  governance?: AgentPromptView | null;
  tools?: AgentPromptView | null;
}

export interface AgentPublicProfile {
  is_public: boolean;
  public_slug?: string | null;
  public_title?: string | null;
  public_tagline?: string | null;
  public_skills?: string[];
  public_district?: string | null;
  public_primary_room_slug?: string | null;
  // Visibility settings
  visibility_scope?: 'city' | 'microdao' | 'owner_only';
  is_listed_in_directory?: boolean;
  is_system?: boolean;
}

export interface AgentDashboard {
  profile: AgentProfile;
  node?: AgentNode;
  runtime?: AgentRuntime;
  metrics?: AgentMetrics;
  recent_activity?: AgentActivity[];
  system_prompts?: AgentSystemPrompts;
  public_profile?: AgentPublicProfile;
  microdao_memberships?: AgentMicrodaoMembership[];
}

// ============================================================================
// API Functions
// ============================================================================

export async function fetchAgentDashboard(agentId: string): Promise<AgentDashboard> {
  const response = await fetch(`/api/agents/${encodeURIComponent(agentId)}/dashboard`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch agent dashboard: ${response.status}`);
  }
  
  return response.json();
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getAgentStatusColor(status: string): string {
  switch (status) {
    case 'online':
      return 'text-green-500';
    case 'training':
    case 'degraded':
      return 'text-yellow-500';
    case 'offline':
    case 'maintenance':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}

export function getAgentKindIcon(kind: string): string {
  const icons: Record<string, string> = {
    orchestrator: '🎭',
    coordinator: '🎯',
    specialist: '🔬',
    developer: '💻',
    architect: '🏗️',
    marketing: '📢',
    finance: '💰',
    security: '🛡️',
    forensics: '🔍',
    vision: '👁️',
    research: '📚',
    memory: '🧠',
    web3: '⛓️',
    strategic: '♟️',
    mediator: '⚖️',
    innovation: '💡',
    civic: '🏛️',
    oracle: '🔮',
    builder: '🔨',
    social: '💬'
  };
  return icons[kind] || '🤖';
}

// ============================================================================
// System Prompts API
// ============================================================================

export type PromptKind = 'core' | 'safety' | 'governance' | 'tools';

export interface UpdatePromptResult {
  agent_id: string;
  kind: string;
  version: number;
  updated_at: string;
  updated_by: string;
}

export async function updateAgentPrompt(
  agentId: string, 
  kind: PromptKind, 
  content: string,
  note?: string
): Promise<UpdatePromptResult> {
  const response = await fetch(
    `/api/agents/${encodeURIComponent(agentId)}/prompts/${encodeURIComponent(kind)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, note })
    }
  );
  
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || 'Failed to update prompt');
  }
  
  return response.json();
}

export async function getPromptHistory(agentId: string, kind: PromptKind): Promise<{
  agent_id: string;
  kind: string;
  history: Array<{
    version: number;
    content: string;
    created_at: string;
    created_by: string;
    note?: string;
    is_active: boolean;
  }>;
}> {
  const response = await fetch(
    `/api/agents/${encodeURIComponent(agentId)}/prompts/${encodeURIComponent(kind)}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to get prompt history');
  }
  
  return response.json();
}

// ============================================================================
// Public Profile API
// ============================================================================

export async function updateAgentPublicProfile(
  agentId: string,
  profile: AgentPublicProfile
): Promise<AgentPublicProfile> {
  const response = await fetch(
    `/api/agents/${encodeURIComponent(agentId)}/public-profile`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    }
  );
  
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail || body?.error || 'Failed to update public profile');
  }
  
  return response.json();
}

