import { HomeNode } from './citizens';

export type VisibilityScope = 'city' | 'microdao' | 'owner_only';

export interface MicrodaoBadge {
  id: string;
  name: string;
  slug?: string | null;
  role?: string | null;
}

export interface AgentMicrodaoMembership {
  microdao_id: string;
  microdao_slug: string;
  microdao_name: string;
  role?: string;
  is_core: boolean;
}

export interface AgentSummary {
  id: string;
  slug?: string | null;
  display_name: string;
  title?: string | null;
  tagline?: string | null;
  kind: string;
  avatar_url?: string | null;
  status: string;
  
  // Node info
  node_id?: string | null;
  node_label?: string | null;
  home_node?: HomeNode | null;
  
  // Visibility
  visibility_scope: VisibilityScope;
  is_listed_in_directory: boolean;
  is_system: boolean;
  is_public: boolean;
  
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

export interface AgentListResponse {
  items: AgentSummary[];
  total: number;
}

export interface AgentDashboard {
  id: string;
  slug?: string | null;
  display_name: string;
  kind: string;
  avatar_url?: string | null;
  status: string;
  
  // Visibility
  visibility_scope: VisibilityScope;
  is_listed_in_directory: boolean;
  is_system: boolean;
  is_public: boolean;
  
  // Profile
  public_slug?: string | null;
  public_title?: string | null;
  public_tagline?: string | null;
  public_skills: string[];
  district?: string | null;
  
  // Node
  node_id?: string | null;
  node_label?: string | null;
  home_node?: HomeNode | null;
  
  // MicroDAO
  primary_microdao_id?: string | null;
  primary_microdao_name?: string | null;
  primary_microdao_slug?: string | null;
  microdaos: MicrodaoBadge[];
  microdao_memberships: AgentMicrodaoMembership[];
  
  // System prompts
  system_prompts?: {
    core?: string;
    safety?: string;
    governance?: string;
    tools?: string;
  };
  
  // Capabilities
  capabilities: string[];
  model?: string | null;
  role?: string | null;
}

export interface AgentVisibilityPayload {
  visibility_scope: VisibilityScope;
  is_listed_in_directory: boolean;
}
