export interface NodeAgentSummary {
  id: string;
  name: string;
  kind?: string;
  slug?: string;
}

export interface NodeMicrodaoSummary {
  id: string;
  slug: string;
  name: string;
  rooms_count: number;
}

export interface NodeProfile {
  node_id: string;
  name: string;
  hostname?: string | null;
  roles: string[];
  environment: string;
  status: string;
  gpu_info?: string | null;
  agents_total: number;
  agents_online: number;
  last_heartbeat?: string | null;
  guardian_agent_id?: string | null;
  steward_agent_id?: string | null;
  guardian_agent?: NodeAgentSummary | null;
  steward_agent?: NodeAgentSummary | null;
  microdaos?: NodeMicrodaoSummary[];
}

export interface NodeListResponse {
  items: NodeProfile[];
  total: number;
}

