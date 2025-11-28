/**
 * Unified Agent Types for DAARION MVP
 * Aligned with backend models from TASK 028
 */

// =============================================================================
// Core Types
// =============================================================================

export type VisibilityScope = 'global' | 'microdao' | 'private';
export type AgentStatus = 'online' | 'offline' | 'unknown';

// =============================================================================
// Home Node
// =============================================================================

export interface HomeNode {
  id: string;
  name?: string | null;
  hostname?: string | null;
  roles: string[];
  environment?: string | null;
}

// =============================================================================
// MicroDAO Badge (for agent's microDAO list)
// =============================================================================

export interface MicrodaoBadge {
  id: string;
  name: string;
  slug?: string | null;
  role?: string | null;
  is_public: boolean;
  is_platform: boolean;
}

// =============================================================================
// Agent MicroDAO Membership (detailed)
// =============================================================================

import { AgentMicrodaoMembership } from './microdao';
export type { AgentMicrodaoMembership };

// =============================================================================
// Agent Summary (unified for Agent Console & internal use)
// =============================================================================

export interface AgentSummary {
  id: string;
  slug: string;
  display_name: string;
  title?: string | null;
  tagline?: string | null;
  kind: string;
  avatar_url?: string | null;
  status: AgentStatus;
  
  // Node info
  node_id: string;
  node_label?: string | null;
  home_node?: HomeNode | null;
  
  // Visibility & roles
  visibility_scope: VisibilityScope;
  is_listed_in_directory: boolean;
  is_system: boolean;
  is_public: boolean;
  is_orchestrator: boolean;
  
  // MicroDAO
  primary_microdao_id?: string | null;
  primary_microdao_name?: string | null;
  primary_microdao_slug?: string | null;
  district?: string | null;
  microdaos: MicrodaoBadge[];
  microdao_memberships: AgentMicrodaoMembership[];
  
  // Skills
  public_skills: string[];
}

// =============================================================================
// Agent Dashboard (full profile for Agent Console)
// =============================================================================

export interface SystemPrompts {
  core?: {
    content: string;
    version?: number;
    created_at?: string;
    note?: string;
  } | null;
  safety?: {
    content: string;
    version?: number;
    created_at?: string;
    note?: string;
  } | null;
  governance?: {
    content: string;
    version?: number;
    created_at?: string;
    note?: string;
  } | null;
  tools?: {
    content: string;
    version?: number;
    created_at?: string;
    note?: string;
  } | null;
}

export interface ModelBindings {
  primary_model?: string | null;
  supported_kinds?: string[];
}

export interface UsageStats {
  tokens_total_24h?: number;
  calls_total_24h?: number;
}

export interface AgentDashboard extends AgentSummary {
  // System prompts
  system_prompts?: SystemPrompts;
  
  // Capabilities & model
  capabilities: string[];
  model?: string | null;
  role?: string | null;
  
  // Future: model bindings and usage stats
  model_bindings?: ModelBindings | null;
  usage_stats?: UsageStats | null;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface AgentListResponse {
  items: AgentSummary[];
  total: number;
}

export interface AgentVisibilityPayload {
  visibility_scope: VisibilityScope;
  is_listed_in_directory: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get node badge label (НОДА1 / НОДА2)
 */
export function getNodeBadgeLabel(nodeId?: string | null): string {
  if (!nodeId) return 'Невідома нода';
  if (nodeId.includes('node-1') || nodeId.includes('hetzner')) return 'НОДА1';
  if (nodeId.includes('node-2') || nodeId.includes('macbook')) return 'НОДА2';
  return nodeId;
}

/**
 * Get visibility scope label
 */
export function getVisibilityScopeLabel(scope: VisibilityScope): string {
  switch (scope) {
    case 'global': return 'Публічний';
    case 'microdao': return 'Тільки MicroDAO';
    case 'private': return 'Приватний';
    default: return scope;
  }
}
