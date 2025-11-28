export interface HomeNode {
  id?: string | null;
  name?: string | null;
  hostname?: string | null;
  roles: string[];
  environment?: string | null;
}

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
  online_status?: "online" | "offline" | "unknown" | string;
  status?: string | null;
  home_node?: HomeNode | null;
}

export interface CityPresenceRoom {
  room_id?: string | null;
  slug?: string | null;
  name?: string | null;
}

export interface CityPresence {
  primary_room_slug?: string | null;
  rooms: CityPresenceRoom[];
}

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
  city_presence?: CityPresence;
  dais_public: Record<string, unknown>;
  interaction: Record<string, unknown>;
  metrics_public: Record<string, unknown>;
  admin_panel_url?: string | null;
  microdao?: {
    slug: string;
    name: string;
    district?: string | null;
  } | null;
  home_node?: HomeNode | null;
}

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


