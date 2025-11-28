/**
 * Agent API Client (Task 029)
 */

import type { AgentSummary } from "@/lib/types/agents";
import type { MicrodaoDetail } from "@/lib/types/microdao";

// =============================================================================
// Types
// =============================================================================

export type VisibilityScope = "global" | "microdao" | "private";

export interface AgentVisibilityUpdate {
  is_public: boolean;
  visibility_scope?: VisibilityScope;
}

export interface MicrodaoCreateRequest {
  name: string;
  slug: string;
  description?: string;
  make_platform?: boolean;
  is_public?: boolean;
  parent_microdao_id?: string | null;
}

export interface MicrodaoCreateResponse {
  status: string;
  microdao: {
    id: string;
    slug: string;
    name: string;
    description?: string;
    is_public: boolean;
    is_platform: boolean;
  };
  agent_id: string;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Update agent visibility settings
 */
export async function updateAgentVisibility(
  agentId: string,
  data: AgentVisibilityUpdate
): Promise<{ status: string; agent_id: string; is_public: boolean; visibility_scope: string }> {
  const res = await fetch(`/api/agents/${encodeURIComponent(agentId)}/visibility`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(json?.detail || json?.error || "Failed to update visibility");
  }

  return json;
}

/**
 * Create MicroDAO for agent (make agent an orchestrator)
 */
export async function createMicrodaoForAgent(
  agentId: string,
  payload: MicrodaoCreateRequest
): Promise<MicrodaoCreateResponse> {
  const res = await fetch(`/api/agents/${encodeURIComponent(agentId)}/microdao`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(json?.detail || json?.error || "Failed to create MicroDAO");
  }

  return json;
}
