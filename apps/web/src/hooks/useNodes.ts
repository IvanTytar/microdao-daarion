'use client';

import useSWR from 'swr';
import { NodeProfile, NodeListResponse } from '@/lib/types/nodes';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch');
  }
  return res.json();
};

export function useNodeList() {
  const { data, error, isLoading, mutate } = useSWR<NodeListResponse>(
    '/api/nodes/list',
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    nodes: data?.items || [],
    total: data?.total || 0,
    isLoading,
    error,
    mutate,
  };
}

export function useNodeProfile(nodeId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<NodeProfile>(
    nodeId ? `/api/nodes/${nodeId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    node: data,
    isLoading,
    error,
    mutate,
  };
}

