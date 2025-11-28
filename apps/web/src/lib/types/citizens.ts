/**
 * Public Citizens Types for DAARION MVP
 * Citizens are public-facing agents (is_public = true)
 */

import { HomeNode, AgentStatus } from './agents';

// Re-export HomeNode for backward compatibility
export { HomeNode };

// =============================================================================
// Public Citizen Summary (for /citizens list)
// =============================================================================

export interface PublicCitizenSummary {
  slug: string;
  display_name: string;
  public_title?: string | null;
  public_tagline?: string | null;
  avatar_url?: string | null;
  kind?: string | null;
  district?: string | null;
  primary_room_slug?: string | null;
  public_skills: string[];
  online_status?: AgentStatus;
  status?: string | null; // backward compatibility
  home_node?: HomeNode | null;
  
  // MicroDAO info (primary only for public display)
  microdao?: {
    slug: string;
    name: string;
    district?: string | null;
  } | null;
}

// =============================================================================
// City Presence
// =============================================================================

export interface CityPresenceRoom {
  room_id?: string | null;
  slug?: string | null;
  name?: string | null;
}

export interface CityPresence {
  primary_room_slug?: string | null;
  rooms: CityPresenceRoom[];
}

// =============================================================================
// Public Citizen Profile (for /citizens/[slug])
// =============================================================================

export interface PublicCitizenProfile {
  slug: string;
  display_name: string;
  kind?: string | null;
  public_title?: string | null;
  public_tagline?: string | null;
  district?: string | null;
  avatar_url?: string | null;
  status?: string | null;
  node_id?: string | null;
  public_skills: string[];
  
  // City presence
  city_presence?: CityPresence;
  
  // Public data blocks
  dais_public: Record<string, unknown>;
  interaction: Record<string, unknown>;
  metrics_public: Record<string, unknown>;
  
  // Admin link (only for architects/admins)
  admin_panel_url?: string | null;
  
  // MicroDAO info
  microdao?: {
    slug: string;
    name: string;
    district?: string | null;
  } | null;
  
  // Home node (minimal for public display)
  home_node?: HomeNode | null;
}

// =============================================================================
// Citizen Interaction
// =============================================================================

export interface CitizenInteractionInfo {
  slug: string;
  display_name: string;
  primary_room_slug?: string | null;
  primary_room_id?: string | null;
  primary_room_name?: string | null;
  matrix_user_id?: string | null;
  district?: string | null;
  microdao_slug?: string | null;
  microdao_name?: string | null;
}

export interface CitizenAskResponse {
  answer: string;
  agent_display_name: string;
  agent_id: string;
}
