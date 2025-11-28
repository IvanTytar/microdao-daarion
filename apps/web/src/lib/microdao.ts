// =============================================================================
// MicroDAO Types
// =============================================================================

export interface MicrodaoSummary {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  district?: string | null;
  orchestrator_agent_id: string;
  is_active: boolean;
  logo_url?: string | null;
  agents_count: number;
  rooms_count: number;
  channels_count: number;
}

export interface MicrodaoChannel {
  kind: "matrix" | "telegram" | "city_room" | "crew" | string;
  ref_id: string;
  display_name?: string | null;
  is_primary: boolean;
}

export interface MicrodaoAgent {
  agent_id: string;
  display_name: string;
  role?: string | null;
  is_core: boolean;
}

export interface MicrodaoDetail {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  district?: string | null;
  orchestrator_agent_id: string;
  orchestrator_display_name?: string | null;
  is_active: boolean;
  is_public: boolean;
  logo_url?: string | null;
  agents: MicrodaoAgent[];
  channels: MicrodaoChannel[];
}

// =============================================================================
// District colors for UI
// =============================================================================

export const DISTRICT_COLORS: Record<string, string> = {
  Core: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  Energy: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  Green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  Clan: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  Soul: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  Council: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  Labs: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  Creators: "bg-orange-500/10 text-orange-400 border-orange-500/30",
};

export const DISTRICTS = [
  "Core",
  "Energy", 
  "Green",
  "Clan",
  "Soul",
  "Council",
  "Labs",
  "Creators",
];

