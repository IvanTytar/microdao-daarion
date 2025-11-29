/**
 * MicroDAO Types for DAARION MVP
 * Aligned with backend models from TASK 028
 */

// =============================================================================
// MicroDAO Summary (for /microdao list)
// =============================================================================

export interface MicrodaoSummary {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  district?: string | null;
  
  // Visibility & type
  is_public: boolean;
  is_platform: boolean;
  is_active: boolean;
  
  // Orchestrator
  orchestrator_agent_id?: string | null;
  orchestrator_agent_name?: string | null;
  
  // Hierarchy
  parent_microdao_id?: string | null;
  parent_microdao_slug?: string | null;
  
  // Stats
  logo_url?: string | null;
  member_count: number;
  agents_count: number; // backward compatibility
  room_count: number;
  rooms_count: number; // backward compatibility
  channels_count: number;
}

// =============================================================================
// MicroDAO Agent View (agent within MicroDAO)
// =============================================================================

export interface MicrodaoAgentView {
  agent_id: string;
  display_name: string;
  role?: string | null;
  is_core: boolean;
}

// =============================================================================
// MicroDAO Channel View
// =============================================================================

export interface MicrodaoChannelView {
  kind: string; // 'matrix' | 'telegram' | 'city_room' | 'crew'
  ref_id: string;
  display_name?: string | null;
  is_primary: boolean;
}

// =============================================================================
// MicroDAO Citizen View (public citizen within MicroDAO)
// =============================================================================

export interface MicrodaoCitizenView {
  slug: string;
  display_name: string;
  public_title?: string | null;
  public_tagline?: string | null;
  avatar_url?: string | null;
  district?: string | null;
  primary_room_slug?: string | null;
}

// =============================================================================
// City Room Summary (for chat embedding and multi-room support)
// =============================================================================

export interface CityRoomSummary {
  id: string;
  slug: string;
  name: string;
  matrix_room_id?: string | null;
  microdao_id?: string | null;
  microdao_slug?: string | null;
  room_role?: string | null; // 'primary', 'lobby', 'team', 'research', 'security', 'governance'
  is_public?: boolean;
  sort_order?: number;
}

// =============================================================================
// MicroDAO Rooms List (for /microdao/[slug]/rooms)
// =============================================================================

export interface MicrodaoRoomsList {
  microdao_id: string;
  microdao_slug: string;
  rooms: CityRoomSummary[];
}

// =============================================================================
// MicroDAO Room Update (for management)
// =============================================================================

export interface MicrodaoRoomUpdate {
  room_role?: string | null;
  is_public?: boolean | null;
  sort_order?: number | null;
  set_primary?: boolean | null;
}

export interface AttachExistingRoomRequest {
  room_id: string;
  room_role?: string | null;
  is_public?: boolean;
  sort_order?: number;
}

// =============================================================================
// MicroDAO Detail (for /microdao/[slug])
// =============================================================================

export interface MicrodaoDetail {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  district?: string | null;
  
  // Visibility & type
  is_public: boolean;
  is_platform: boolean;
  is_active: boolean;
  
  // Orchestrator
  orchestrator_agent_id?: string | null;
  orchestrator_display_name?: string | null;
  
  // Hierarchy
  parent_microdao_id?: string | null;
  parent_microdao_slug?: string | null;
  child_microdaos: MicrodaoSummary[];
  
  // Content
  logo_url?: string | null;
  agents: MicrodaoAgentView[];
  channels: MicrodaoChannelView[];
  public_citizens: MicrodaoCitizenView[];
  
  // Multi-room support
  primary_city_room?: CityRoomSummary | null;
  rooms?: CityRoomSummary[];
}

// =============================================================================
// MicroDAO Option (for selectors)
// =============================================================================

export interface MicrodaoOption {
  id: string;
  slug: string;
  name: string;
  district?: string | null;
  is_active?: boolean;
}

// =============================================================================
// Agent MicroDAO Membership (for Agent Dashboard)
// =============================================================================

export interface AgentMicrodaoMembership {
  microdao_id: string;
  microdao_slug: string;
  microdao_name: string;
  role?: string | null;
  is_core: boolean;
}

