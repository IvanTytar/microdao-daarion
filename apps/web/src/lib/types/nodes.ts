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
}

export interface NodeListResponse {
  items: NodeProfile[];
  total: number;
}

