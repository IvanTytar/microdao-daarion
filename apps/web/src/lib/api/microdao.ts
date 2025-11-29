/**
 * MicroDAO API Client (Task 029)
 */

import { MicrodaoOption, CityRoomSummary } from "@/lib/types/microdao";

// =============================================================================
// Types
// =============================================================================

export interface MicrodaoVisibilityUpdate {
  is_public: boolean;
  is_platform?: boolean;
}

export interface MicrodaoVisibilityResponse {
  status: string;
  microdao_id: string;
  slug: string;
  is_public: boolean;
  is_platform: boolean;
}

export interface AssignAgentPayload {
  microdao_id: string;
  role?: string;
  is_core?: boolean;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Update MicroDAO visibility settings
 */
export async function updateMicrodaoVisibility(
  microdaoId: string,
  data: MicrodaoVisibilityUpdate
): Promise<MicrodaoVisibilityResponse> {
  const res = await fetch(`/api/microdao/${encodeURIComponent(microdaoId)}/visibility`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(json?.detail || json?.error || "Failed to update MicroDAO visibility");
  }

  return json;
}

/**
 * Fetch available MicroDAO options for dropdown
 */
export async function fetchMicrodaoOptions(): Promise<MicrodaoOption[]> {
  const res = await fetch("/api/microdao/options");
  if (!res.ok) {
    throw new Error("Failed to load MicroDAO options");
  }
  return res.json();
}

/**
 * Assign agent to MicroDAO
 */
export async function assignAgentToMicrodao(
  agentId: string,
  payload: AssignAgentPayload
): Promise<void> {
  const res = await fetch(`/api/agents/${encodeURIComponent(agentId)}/microdao-membership`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || error.error || "Failed to assign MicroDAO");
  }
}

/**
 * Remove agent from MicroDAO
 */
export async function removeAgentFromMicrodao(
  agentId: string,
  microdaoId: string
): Promise<void> {
  const res = await fetch(
    `/api/agents/${encodeURIComponent(agentId)}/microdao-membership/${encodeURIComponent(microdaoId)}`,
    { method: "DELETE" }
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || error.error || "Failed to remove MicroDAO membership");
  }
}

/**
 * Ensure Orchestrator Team Room exists
 */
export async function ensureOrchestratorRoom(slug: string): Promise<CityRoomSummary> {
  const res = await fetch(`/api/microdao/${encodeURIComponent(slug)}/rooms/orchestrator-team`, {
    method: "POST",
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || error.error || "Failed to ensure orchestrator room");
  }

  return res.json();
}
