import useSWR from "swr";
import type { MicrodaoSummary, MicrodaoDetail } from "@/lib/microdao";

const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const error = new Error(body?.error || "Failed to fetch");
      (error as any).status = res.status;
      throw error;
    }
    return res.json();
  });

export function useMicrodaoList(params?: { district?: string; q?: string }) {
  const search = new URLSearchParams();
  if (params?.district) search.set("district", params.district);
  if (params?.q) search.set("q", params.q);

  const key = `/api/microdao${search.toString() ? `?${search.toString()}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR<MicrodaoSummary[]>(
    key,
    fetcher,
    {
      refreshInterval: 60_000, // Refresh every minute
      revalidateOnFocus: true,
    }
  );

  return {
    items: data ?? [],
    total: data?.length ?? 0,
    isLoading,
    error,
    mutate,
  };
}

export function useMicrodaoDetail(slug: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<MicrodaoDetail>(
    slug ? `/api/microdao/${encodeURIComponent(slug)}` : null,
    fetcher,
    {
      refreshInterval: 30_000,
      revalidateOnFocus: true,
    }
  );

  return {
    microdao: data,
    isLoading,
    error,
    mutate,
  };
}

