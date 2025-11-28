'use client';

import useSWR from 'swr';
import { AgentSummary, AgentListResponse, AgentDashboard } from '@/lib/types/agents';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch');
  }
  return res.json();
};

export function useAgentList(params?: {
  kind?: string;
  node_id?: string;
  limit?: number;
  offset?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.kind) searchParams.set('kind', params.kind);
  if (params?.node_id) searchParams.set('node_id', params.node_id);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const queryString = searchParams.toString();
  const url = `/api/agents/list${queryString ? `?${queryString}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<AgentListResponse>(url, fetcher, {
    revalidateOnFocus: false,
  });

  return {
    agents: data?.items || [],
    total: data?.total || 0,
    isLoading,
    error,
    mutate,
  };
}

export function useAgentDashboard(agentId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<AgentDashboard>(
    agentId ? `/api/agents/${agentId}/dashboard` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    agent: data,
    isLoading,
    error,
    mutate,
  };
}

