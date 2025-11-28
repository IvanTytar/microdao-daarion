import { HomeNodeInfo } from './citizens';

export interface AgentMicrodaoMembership {
  microdao_id: string;
  microdao_slug: string;
  microdao_name: string;
  role?: string;
  is_core: boolean;
}

export interface AgentSummary {
  id: string;
  display_name: string;
  kind: string;
  avatar_url?: string | null;
  status: string;
  is_public: boolean;
  public_slug?: string | null;
  public_title?: string | null;
  district?: string | null;
  home_node?: HomeNodeInfo | null;
  microdao_memberships: AgentMicrodaoMembership[];
}

export interface AgentListResponse {
  items: AgentSummary[];
  total: number;
}

export interface AgentDashboard {
  id: string;
  display_name: string;
  kind: string;
  avatar_url?: string | null;
  status: string;
  is_public: boolean;
  public_slug?: string | null;
  public_title?: string | null;
  public_tagline?: string | null;
  public_skills: string[];
  district?: string | null;
  home_node?: HomeNodeInfo | null;
  microdao_memberships: AgentMicrodaoMembership[];
  system_prompts?: {
    core?: string;
    safety?: string;
    governance?: string;
    tools?: string;
  };
  capabilities: string[];
  model?: string | null;
  role?: string | null;
}

