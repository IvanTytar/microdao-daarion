/**
 * MicroDAO API Client (Task 029)
 */

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
