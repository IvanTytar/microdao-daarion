export interface HomeNodeView {
  id: string;
  name: string;
  hostname?: string;
  roles: string[];
  environment?: string;
}

export interface MicrodaoBadge {
  id: string;
  name: string;
  slug?: string;
  role?: string;
  is_public: boolean;
  is_platform: boolean;
}

export interface AgentSummary {
  id: string;
  slug?: string;
  display_name: string;
  title?: string;
  tagline?: string;
  kind: string;
  avatar_url?: string;
  status: string;
  node_id?: string;
  node_label?: string;
  home_node?: HomeNodeView;
  visibility_scope: string;
  is_listed_in_directory: boolean;
  is_system: boolean;
  is_public: boolean;
  is_orchestrator: boolean;
  primary_microdao_id?: string;
  primary_microdao_name?: string;
  primary_microdao_slug?: string;
  district?: string;
  microdaos: MicrodaoBadge[];
  public_skills: string[];
}

export interface AgentVisibilityPayload {
  is_public: boolean;
  public_title?: string | null;
  public_tagline?: string | null;
  public_slug?: string | null;
}

export interface AgentSystemPrompt {
  content: string;
  version: number;
  created_at: string;
  note?: string;
}

export interface AgentSystemPrompts {
  core?: AgentSystemPrompt;
  safety?: AgentSystemPrompt;
  governance?: AgentSystemPrompt;
  tools?: AgentSystemPrompt;
}

export interface AgentDetailDashboard {
  profile: {
    agent_id: string;
    display_name: string;
    kind: string;
    status: string;
    node_id?: string;
    is_public: boolean;
    public_slug?: string;
    is_orchestrator: boolean;
    primary_microdao_id?: string;
    primary_microdao_name?: string;
    primary_microdao_slug?: string;
    avatar_url?: string;
    city_presence?: {
        primary_room_slug?: string;
        district?: string;
    }
  };
  node: {
    node_id: string;
    name: string;
    hostname?: string;
    roles: string[];
    environment?: string;
    status: string;
    guardian_agent?: { id: string; name: string; };
    steward_agent?: { id: string; name: string; };
  } | null;
  primary_city_room: {
    id: string;
    slug: string;
    name: string;
    matrix_room_id?: string;
  } | null;
  system_prompts: AgentSystemPrompts;
  public_profile: {
    is_public: boolean;
    public_slug?: string;
    public_title?: string;
    public_tagline?: string;
    public_skills: string[];
    public_district?: string;
    public_primary_room_slug?: string;
  } | null;
  microdao_memberships: {
    microdao_id: string;
    microdao_slug?: string;
    microdao_name?: string;
    logo_url?: string;
    role?: string;
    is_core: boolean;
  }[];
}

