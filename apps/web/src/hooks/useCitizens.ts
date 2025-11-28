import useSWR from "swr";
import type {
  PublicCitizenSummary,
  PublicCitizenProfile,
  CitizenInteractionInfo,
} from "@/lib/types/citizens";

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to fetch citizens");
  }
  return res.json();
};

interface CitizensListOptions {
  district?: string;
  kind?: string;
  q?: string;
}

export function useCitizensList(options: CitizensListOptions = {}) {
  const search = new URLSearchParams();
  if (options.district) search.set("district", options.district);
  if (options.kind) search.set("kind", options.kind);
  if (options.q) search.set("q", options.q);

  const key = `/api/public/citizens${
    search.toString() ? `?${search.toString()}` : ""
  }`;

  const { data, error, isLoading, mutate } = useSWR<{
    items: PublicCitizenSummary[];
    total: number;
  }>(key, fetcher);

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    mutate,
  };
}

export function useCitizenProfile(slug: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<PublicCitizenProfile>(
    slug ? `/api/public/citizens/${encodeURIComponent(slug)}` : null,
    fetcher
  );

  return {
    citizen: data,
    isLoading,
    error,
    mutate,
  };
}

export function useCitizenInteraction(slug: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<CitizenInteractionInfo>(
    slug
      ? `/api/public/citizens/${encodeURIComponent(slug)}/interaction`
      : null,
    fetcher
  );

  return {
    interaction: data,
    isLoading,
    error,
    mutate,
  };
}


